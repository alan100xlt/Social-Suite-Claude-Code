import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v21.0';

// ─── Deadline guard ──────────────────────────────────────────
// Supabase edge functions timeout at ~60s (free) or ~150s (pro).
// We bail early at 50s to leave time for monitor.success() and response.
const DEADLINE_MS = 50_000;
// Per-request timeout for API calls (prevents hanging fetch from blocking past deadline)
const FETCH_TIMEOUT_MS = 15_000;

interface Company {
  id: string;
  getlate_profile_id: string;
}

interface FacebookPage {
  id: string;
  name: string;
  fan_count?: number;
  category?: string;
}

interface GetLateAccount {
  id?: string;
  _id?: string;
  platform: string;
  platformUsername?: string;
  username?: string;
  displayName?: string;
  followerCount?: number;
  followersCount?: number;
  followingCount?: number;
  profilePicture?: string;
  isActive?: boolean;
  metadata?: {
    profileData?: {
      followersCount?: number;
      followingCount?: number;
    };
    availablePages?: FacebookPage[];
    selectedPageId?: string;
    pageAccessToken?: string;
    [key: string]: unknown;
  };
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  type?: string;
}

interface FacebookPostsResponse {
  data: FacebookPost[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

// Unified analytics response types per API documentation
interface AnalyticsPostMetrics {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  views?: number;
  engagementRate?: number;
}

interface AnalyticsPlatformEntry {
  platform: string;
  analytics: AnalyticsPostMetrics;
}

interface AnalyticsPost {
  _id: string;                    // External Post ID
  latePostId?: string;            // Original Late Post ID (if scheduled via Late)
  isExternal: boolean;            // true = synced from platform, false = Late-scheduled
  platform: string;
  platformPostUrl?: string;
  content?: string;
  publishedAt?: string;
  analytics: AnalyticsPostMetrics;
  platforms?: AnalyticsPlatformEntry[];
}

interface AnalyticsOverview {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  views?: number;
  engagementRate?: number;
}

interface AnalyticsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  pages?: number;  // API actually returns this field name
}

interface AnalyticsAccountInfo {
  _id: string;
  platform: string;
  username?: string;
  followerCount?: number;
  followersLastUpdated?: string;
}

interface AnalyticsListResponse {
  overview?: AnalyticsOverview;
  posts: AnalyticsPost[];
  pagination: AnalyticsPagination;
  accounts?: AnalyticsAccountInfo[];
  hasAnalyticsAccess?: boolean;
}

interface DiscoveryResult {
  discovered: number;
  synced: number;
  failed: number;
  errors: string[];
  thumbnails: Map<string, string>; // Map of post URL to thumbnail URL
}

// Discover Facebook posts from the Graph API and collect thumbnails
async function discoverFacebookPosts(
  accountId: string,
  pageId: string,
  pageAccessToken: string,
  fromDate: string,
  toDate: string,
  pastDeadline: () => boolean
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    discovered: 0,
    synced: 0,
    failed: 0,
    errors: [],
    thumbnails: new Map(),
  };

  const fromTimestamp = new Date(fromDate).getTime() / 1000;
  const toTimestamp = new Date(toDate).getTime() / 1000 + 86400;

  console.log(`Discovering Facebook posts for page ${pageId} from ${fromDate} to ${toDate}`);

  try {
    let nextUrl: string | null = `${FACEBOOK_GRAPH_URL}/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=100&access_token=${pageAccessToken}`;
    let pageCount = 0;
    const maxPages = 5; // Reduced from 10 to stay within deadline

    while (nextUrl && pageCount < maxPages && !pastDeadline()) {
      pageCount++;
      const response = await fetch(nextUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Facebook API error: ${response.status} - ${errorText}`);
        result.errors.push(`Facebook API error: ${response.status}`);
        break;
      }

      const data: FacebookPostsResponse = await response.json();
      if (!data.data || data.data.length === 0) break;

      for (const post of data.data) {
        const postTimestamp = new Date(post.created_time).getTime() / 1000;
        if (postTimestamp >= fromTimestamp && postTimestamp <= toTimestamp) {
          result.discovered++;
          if (post.full_picture && post.permalink_url) {
            result.thumbnails.set(post.permalink_url, post.full_picture);
          }
        }
      }

      // Check if we've gone past our date range
      const oldestPost = data.data[data.data.length - 1];
      const oldestTimestamp = new Date(oldestPost.created_time).getTime() / 1000;
      if (oldestTimestamp < fromTimestamp) break;

      nextUrl = data.paging?.next || null;
      if (nextUrl) await new Promise(resolve => setTimeout(resolve, 200));
    }

    result.synced = result.discovered;
  } catch (error) {
    console.error('Error during Facebook post discovery:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Create supabase + monitor in OUTER scope so crash handler can access them
  const apiKey = Deno.env.get('GETLATE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required env vars' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse request body early (needed for monitor name and company selection)
  let targetCompanyId: string | null = null;
  let fromDate: string | null = null;
  let toDate: string | null = null;
  try {
    const body = await req.clone().json();
    targetCompanyId = body.companyId || null;
    fromDate = body.fromDate || null;
    toDate = body.toDate || null;
  } catch {
    // No body or invalid JSON
  }

  // Use companyId in monitor name for per-company tracking
  const monitorName = targetCompanyId
    ? `analytics-sync:${targetCompanyId.slice(0, 8)}`
    : 'analytics-sync-hourly';
  const monitor = new CronMonitor(monitorName, supabase);
  await monitor.start();

  /** Returns true if we're past the deadline and should stop processing */
  const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

  try {
    // Authenticate
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    const today = new Date().toISOString().split('T')[0];

    // Default to last 90 days if no date range specified
    if (!fromDate) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      fromDate = ninetyDaysAgo.toISOString().split('T')[0];
    }
    if (!toDate) {
      toDate = today;
    }
    console.log(`Date range for sync: ${fromDate} to ${toDate}`);

    // ── Resolve which companies to process ──
    let companies: Company[];

    if (targetCompanyId) {
      // Dispatcher mode: process exactly this company
      const { data, error } = await supabase
        .from('companies')
        .select('id, getlate_profile_id')
        .eq('id', targetCompanyId)
        .not('getlate_profile_id', 'is', null);

      if (error) throw new Error(`Failed to fetch company: ${error.message}`);
      companies = (data || []) as Company[];

      if (companies.length === 0) {
        await monitor.success({ message: 'Company not found or no getlate profile', companyId: targetCompanyId });
        return new Response(
          JSON.stringify({ success: true, message: 'Company not found or no profile' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Legacy mode (no dispatcher): process all companies (but with deadline guard)
      const { data, error } = await supabase
        .from('companies')
        .select('id, getlate_profile_id')
        .not('getlate_profile_id', 'is', null);

      if (error) throw new Error(`Failed to fetch companies: ${error.message}`);
      companies = (data || []) as Company[];

      if (companies.length === 0) {
        await monitor.success({ message: 'No companies to sync' });
        return new Response(
          JSON.stringify({ success: true, message: 'No companies to sync', synced: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Legacy mode: processing ${companies.length} companies (deadline-guarded)`);
    }

    const results = {
      companiesSynced: 0,
      totalCompanies: companies.length,
      accountSnapshots: 0,
      postSnapshots: 0,
      postsSkippedNoAccount: 0,
      postsDiscovered: 0,
      postsSynced: 0,
      contentDecayCached: 0,
      bailedEarly: false,
      durationMs: 0,
      errors: [] as string[],
    };

    for (const company of companies as Company[]) {
      if (pastDeadline()) {
        results.bailedEarly = true;
        console.log(`Deadline reached, stopping before company ${company.id}`);
        break;
      }

      try {
        console.log(`Processing company ${company.id} with profile ${company.getlate_profile_id}`);

        // Step 1: Fetch all accounts for this company profile
        const accountsResponse = await fetch(
          `${GETLATE_API_URL}/accounts?profileId=${company.getlate_profile_id}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }
        );

        let accounts: GetLateAccount[] = [];
        const activeAccountIds: Set<string> = new Set();
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          accounts = accountsData.accounts || accountsData.data || [];
          console.log(`Fetched ${accounts.length} accounts for company ${company.id}`);
          for (const acc of accounts) {
            const aid = acc._id || acc.id;
            if (aid) activeAccountIds.add(aid);
          }
        } else {
          console.warn(`Failed to fetch accounts for company ${company.id}: ${accountsResponse.status}`);
        }

        // Step 2: Discover Facebook posts (with deadline checks)
        const allThumbnails = new Map<string, string>();

        for (const account of accounts) {
          if (pastDeadline()) break;
          const accountId = account._id || account.id;
          if (!accountId) continue;

          if (account.platform === 'facebook') {
            const pageAccessToken = account.metadata?.pageAccessToken;
            const selectedPageId = account.metadata?.selectedPageId;

            if (pageAccessToken && selectedPageId) {
              const discoveryResult = await discoverFacebookPosts(
                accountId, selectedPageId, pageAccessToken, fromDate, toDate, pastDeadline
              );
              results.postsDiscovered += discoveryResult.discovered;
              results.postsSynced += discoveryResult.synced;
              if (discoveryResult.errors.length > 0) {
                results.errors.push(...discoveryResult.errors.slice(0, 3));
              }
              for (const [url, thumbnail] of discoveryResult.thumbnails) {
                allThumbnails.set(url, thumbnail);
              }
            }
          }
        }

        // Build platform -> accountId map
        const platformToAccountId = new Map<string, string>();
        for (const account of accounts) {
          const accountId = account._id || account.id;
          if (accountId && account.platform) {
            platformToAccountId.set(account.platform, accountId);
          }
        }

        // Step 3: Fetch analytics with pagination (with deadline checks)
        let allPosts: AnalyticsPost[] = [];
        let page = 1;
        const limit = 100;
        let hasMorePages = true;
        let analyticsAccounts: AnalyticsAccountInfo[] = [];

        while (hasMorePages && !pastDeadline()) {
          const analyticsUrl = `${GETLATE_API_URL}/analytics?profileId=${company.getlate_profile_id}&limit=${limit}&page=${page}&fromDate=${fromDate}&toDate=${toDate}`;
          console.log(`Fetching analytics page ${page}`);

          const analyticsResponse = await fetch(analyticsUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });

          if (!analyticsResponse.ok) {
            const errorText = await analyticsResponse.text();
            results.errors.push(`Company ${company.id}: analytics API ${analyticsResponse.status}`);
            break;
          }

          const analyticsData: AnalyticsListResponse = await analyticsResponse.json();

          if (page === 1 && analyticsData.accounts) {
            analyticsAccounts = analyticsData.accounts;
          }

          if (analyticsData.posts && analyticsData.posts.length > 0) {
            allPosts = allPosts.concat(analyticsData.posts);
          }

          if (analyticsData.pagination) {
            const totalPages = analyticsData.pagination.totalPages || analyticsData.pagination.pages || 1;
            hasMorePages = page < totalPages;
            page++;
          } else {
            hasMorePages = false;
          }
        }

        console.log(`Total posts fetched for company ${company.id}: ${allPosts.length}`);

        // Step 4: Batch upsert post snapshots
        const postsByPlatform: Record<string, AnalyticsPost[]> = {};
        const postSnapshots: any[] = [];

        for (const post of allPosts) {
          const platform = post.platform || 'unknown';
          const accountId = platformToAccountId.get(platform) || null;
          if (!accountId) {
            results.postsSkippedNoAccount++;
            continue;
          }

          if (!postsByPlatform[platform]) postsByPlatform[platform] = [];
          postsByPlatform[platform].push(post);

          const thumbnailUrl = post.platformPostUrl ? allThumbnails.get(post.platformPostUrl) : null;

          postSnapshots.push({
            company_id: company.id,
            post_id: post._id,
            platform,
            account_id: accountId,
            impressions: post.analytics?.impressions || 0,
            reach: post.analytics?.reach || 0,
            views: post.analytics?.views || 0,
            likes: post.analytics?.likes || 0,
            comments: post.analytics?.comments || 0,
            shares: post.analytics?.shares || 0,
            clicks: post.analytics?.clicks || 0,
            engagement_rate: post.platforms?.[0]?.analytics?.engagementRate || post.analytics?.engagementRate || 0,
            snapshot_date: today,
            content: post.content || null,
            post_url: post.platformPostUrl || null,
            published_at: post.publishedAt || null,
            thumbnail_url: thumbnailUrl || null,
            source: post.isExternal === false || post.latePostId ? 'getlate' : 'direct',
            objective: (post as any).metadata?.objective || null,
          });
        }

        // Batch upsert in chunks of 50 (instead of one-by-one)
        const BATCH_SIZE = 50;
        for (let i = 0; i < postSnapshots.length && !pastDeadline(); i += BATCH_SIZE) {
          const batch = postSnapshots.slice(i, i + BATCH_SIZE);
          const { error: batchError } = await supabase
            .from('post_analytics_snapshots')
            .upsert(batch, { onConflict: 'company_id,post_id', ignoreDuplicates: false });

          if (batchError) {
            console.error(`Error upserting post snapshot batch:`, batchError);
            results.errors.push(`Post snapshot batch error: ${batchError.message}`);
          } else {
            results.postSnapshots += batch.length;
          }
        }

        // Step 5: Account snapshots (aggregated from post metrics)
        if (!pastDeadline()) {
          for (const account of accounts) {
            const accountId = account._id || account.id;
            if (!accountId) continue;

            const platform = account.platform;
            const platformPosts = postsByPlatform[platform] || [];

            let totalImpressions = 0, totalReach = 0, totalViews = 0;
            let totalLikes = 0, totalComments = 0, totalShares = 0;
            let totalClicks = 0, totalEngagementRate = 0;

            for (const post of platformPosts) {
              totalImpressions += post.analytics?.impressions || 0;
              totalReach += post.analytics?.reach || 0;
              totalViews += post.analytics?.views || 0;
              totalLikes += post.analytics?.likes || 0;
              totalComments += post.analytics?.comments || 0;
              totalShares += post.analytics?.shares || 0;
              totalClicks += post.analytics?.clicks || 0;
              totalEngagementRate += post.platforms?.[0]?.analytics?.engagementRate || post.analytics?.engagementRate || 0;
            }

            const avgEngagementRate = platformPosts.length > 0 ? totalEngagementRate / platformPosts.length : 0;

            // Get follower count
            let followers = 0;
            const analyticsAccount = analyticsAccounts.find(a => a._id === accountId || a.platform === platform);
            if (analyticsAccount?.followerCount) {
              followers = analyticsAccount.followerCount;
            } else if (account.platform === 'facebook' && account.metadata?.availablePages && account.metadata?.selectedPageId) {
              const selectedPage = account.metadata.availablePages.find(p => p.id === account.metadata?.selectedPageId);
              if (selectedPage?.fan_count) followers = selectedPage.fan_count;
            } else {
              const accountAny = account as any;
              followers = account.followersCount ?? account.followerCount ?? accountAny.followers_count ?? account.metadata?.profileData?.followersCount ?? 0;
            }

            const { error: accountUpsertError } = await supabase
              .from('account_analytics_snapshots')
              .upsert({
                company_id: company.id,
                account_id: accountId,
                platform,
                followers,
                following: account.followingCount || 0,
                posts_count: platformPosts.length,
                impressions: totalImpressions,
                reach: totalReach,
                views: totalViews,
                likes: totalLikes,
                comments: totalComments,
                shares: totalShares,
                clicks: totalClicks,
                engagement_rate: avgEngagementRate,
                snapshot_date: today,
                is_active: account.isActive ?? true,
              }, { onConflict: 'company_id,account_id', ignoreDuplicates: false });

            if (accountUpsertError) {
              console.error(`Error upserting account snapshot for ${accountId}:`, accountUpsertError);
            } else {
              results.accountSnapshots++;
            }
          }
        }

        // Step 6: Mark orphaned accounts as inactive
        if (!pastDeadline() && activeAccountIds.size > 0) {
          const { data: existingAccounts } = await supabase
            .from('account_analytics_snapshots')
            .select('account_id')
            .eq('company_id', company.id);

          const orphanedIds = (existingAccounts || [])
            .map(a => a.account_id)
            .filter(id => !activeAccountIds.has(id));

          if (orphanedIds.length > 0) {
            await supabase
              .from('account_analytics_snapshots')
              .update({ is_active: false })
              .eq('company_id', company.id)
              .in('account_id', orphanedIds);
          }
        }

        // Step 7: Cache content decay data
        if (!pastDeadline()) {
          try {
            const decayResponse = await fetch(
              `${GETLATE_API_URL}/analytics/get-content-decay?profileId=${company.getlate_profile_id}`,
              { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
            );

            if (decayResponse.ok) {
              const decayData = await decayResponse.json();
              const buckets = decayData?.buckets ?? [];

              if (buckets.length > 0) {
                const { error: upsertError } = await supabase
                  .from('content_decay_cache')
                  .upsert({
                    company_id: company.id,
                    platform: null,
                    data: buckets,
                    synced_at: new Date().toISOString(),
                  }, { onConflict: 'company_id,platform' });

                if (!upsertError) results.contentDecayCached++;
              }
            }
          } catch (decayError) {
            console.log(`Content decay cache failed for ${company.id}:`, decayError instanceof Error ? decayError.message : decayError);
          }
        }

        results.companiesSynced++;
        console.log(`Completed sync for company ${company.id}`);
      } catch (companyError) {
        console.error(`Error processing company ${company.id}:`, companyError);
        results.errors.push(`Company ${company.id}: ${companyError instanceof Error ? companyError.message : 'Unknown error'}`);
      }
    }

    results.durationMs = Date.now() - startTime;
    console.log('Analytics sync completed:', JSON.stringify(results));

    await monitor.success(results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analytics sync error:', error);
    // Use the SAME monitor instance — updates the existing "running" row
    await monitor.error(error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
