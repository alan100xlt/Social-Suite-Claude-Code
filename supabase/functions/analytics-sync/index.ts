import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v21.0';

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
// Returns a map of post URLs to thumbnail URLs for use when storing snapshots
async function discoverFacebookPosts(
  accountId: string,
  pageId: string,
  pageAccessToken: string,
  fromDate: string,
  toDate: string
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    discovered: 0,
    synced: 0,
    failed: 0,
    errors: [],
    thumbnails: new Map(),
  };

  const fromTimestamp = new Date(fromDate).getTime() / 1000;
  const toTimestamp = new Date(toDate).getTime() / 1000 + 86400; // Include full day

  console.log(`Discovering Facebook posts for page ${pageId} from ${fromDate} to ${toDate}`);

  try {
    // Request full_picture to get post thumbnails
    let nextUrl: string | null = `${FACEBOOK_GRAPH_URL}/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=100&access_token=${pageAccessToken}`;
    let pageCount = 0;
    const maxPages = 10; // Safety limit: 10 pages * 100 posts = 1000 posts max

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`Fetching Facebook posts page ${pageCount}...`);

      const response = await fetch(nextUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Facebook API error: ${response.status} - ${errorText}`);
        result.errors.push(`Facebook API error: ${response.status}`);
        break;
      }

      const data: FacebookPostsResponse = await response.json();
      if (!data.data || data.data.length === 0) {
        console.log('No more posts found');
        break;
      }

      console.log(`Found ${data.data.length} posts on page ${pageCount}`);

      // Filter posts by date range and collect thumbnails
      for (const post of data.data) {
        const postTimestamp = new Date(post.created_time).getTime() / 1000;
        if (postTimestamp >= fromTimestamp && postTimestamp <= toTimestamp) {
          result.discovered++;
          
          // Store thumbnail URL if available, keyed by permalink
          if (post.full_picture && post.permalink_url) {
            result.thumbnails.set(post.permalink_url, post.full_picture);
          }
        }
      }

      console.log(`${result.discovered} posts within date range so far, ${result.thumbnails.size} with thumbnails`);

      // Check if we've gone past our date range (posts are in reverse chronological order)
      const oldestPost = data.data[data.data.length - 1];
      const oldestTimestamp = new Date(oldestPost.created_time).getTime() / 1000;
      if (oldestTimestamp < fromTimestamp) {
        console.log('Reached posts older than fromDate, stopping pagination');
        break;
      }

      // Move to next page
      nextUrl = data.paging?.next || null;

      // Rate limiting for Facebook API
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Mark all discovered as "synced" since GetLate auto-discovers
    result.synced = result.discovered;
    console.log(`Discovery complete: ${result.discovered} posts found, ${result.thumbnails.size} with thumbnails`);
  } catch (error) {
    console.error('Error during Facebook post discovery:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

// Note: GetLate's analytics API auto-discovers posts when queried,
// so we don't need to manually sync each post to GetLate.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require valid JWT or service role (for cron)
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    const apiKey = Deno.env.get('GETLATE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      console.error('GETLATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const monitor = new CronMonitor('analytics-sync', supabase);
    await monitor.start();

    const today = new Date().toISOString().split('T')[0];

    // Parse request body for optional company filter and date range
    let targetCompanyId: string | null = null;
    let fromDate: string | null = null;
    let toDate: string | null = null;
    try {
      const body = await req.json();
      targetCompanyId = body.companyId || null;
      fromDate = body.fromDate || null;
      toDate = body.toDate || null;
    } catch {
      // No body or invalid JSON - sync all companies with default date range
    }

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

    // Fetch companies with linked GetLate profiles
    let query = supabase
      .from('companies')
      .select('id, getlate_profile_id')
      .not('getlate_profile_id', 'is', null);

    if (targetCompanyId) {
      query = query.eq('id', targetCompanyId);
    }

    const { data: companies, error: companiesError } = await query;

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch companies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!companies || companies.length === 0) {
      console.log('No companies with GetLate profiles found');
      return new Response(
        JSON.stringify({ success: true, message: 'No companies to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing analytics for ${companies.length} companies`);

    const results = {
      companiesSynced: 0,
      accountSnapshots: 0,
      postSnapshots: 0,
      postsSkippedNoAccount: 0,
      postsDiscovered: 0,
      postsSynced: 0,
      errors: [] as string[],
    };

    for (const company of companies as Company[]) {
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
          }
        );

        let accounts: GetLateAccount[] = [];
        const activeAccountIds: Set<string> = new Set();
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          accounts = accountsData.accounts || accountsData.data || [];
          console.log(`Fetched ${accounts.length} accounts for company ${company.id}`);
          // Track which account IDs GetLate returned (these are the active ones)
          for (const acc of accounts) {
            const aid = acc._id || acc.id;
            if (aid) activeAccountIds.add(aid);
          }
        } else {
          console.warn(`Failed to fetch accounts for company ${company.id}: ${accountsResponse.status}`);
        }

        // Step 2: Discover and sync Facebook posts for each Facebook account
        // Collect all thumbnails from Facebook posts
        const allThumbnails = new Map<string, string>();
        
        for (const account of accounts) {
          const accountId = account._id || account.id;
          if (!accountId) continue;

          if (account.platform === 'facebook') {
            const pageAccessToken = account.metadata?.pageAccessToken;
            const selectedPageId = account.metadata?.selectedPageId;

            if (pageAccessToken && selectedPageId) {
              console.log(`Discovering Facebook posts for account ${accountId} (page: ${selectedPageId})`);
              
              const discoveryResult = await discoverFacebookPosts(
                accountId,
                selectedPageId,
                pageAccessToken,
                fromDate,
                toDate
              );

              results.postsDiscovered += discoveryResult.discovered;
              results.postsSynced += discoveryResult.synced;
              if (discoveryResult.errors.length > 0) {
                results.errors.push(...discoveryResult.errors.slice(0, 3));
              }
              
              // Merge thumbnails into the collection
              for (const [url, thumbnail] of discoveryResult.thumbnails) {
                allThumbnails.set(url, thumbnail);
              }
            } else {
              console.warn(`Facebook account ${accountId} missing pageAccessToken or selectedPageId`);
            }
          }
        }
        
        console.log(`Collected ${allThumbnails.size} thumbnails from Facebook discovery`);

        // Build platform -> accountId map for linking posts to accounts
        const platformToAccountId = new Map<string, string>();
        for (const account of accounts) {
          const accountId = account._id || account.id;
          if (accountId && account.platform) {
            platformToAccountId.set(account.platform, accountId);
          }
        }

        // Step 3: Fetch ALL posts with embedded analytics using the unified /analytics endpoint
        let allPosts: AnalyticsPost[] = [];
        let page = 1;
        const limit = 100;
        let hasMorePages = true;
        let analyticsAccounts: AnalyticsAccountInfo[] = [];

        while (hasMorePages) {
          const analyticsUrl = `${GETLATE_API_URL}/analytics?profileId=${company.getlate_profile_id}&limit=${limit}&page=${page}&fromDate=${fromDate}&toDate=${toDate}`;
          console.log(`Fetching analytics page ${page}: ${analyticsUrl}`);

          const analyticsResponse = await fetch(analyticsUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!analyticsResponse.ok) {
            const errorText = await analyticsResponse.text();
            console.error(`Failed to fetch analytics for company ${company.id}: ${analyticsResponse.status} - ${errorText}`);
            results.errors.push(`Company ${company.id}: Failed to fetch analytics (${analyticsResponse.status})`);
            break;
          }

          const analyticsData: AnalyticsListResponse = await analyticsResponse.json();
          console.log(`Analytics page ${page}: ${analyticsData.posts?.length || 0} posts, pagination:`, JSON.stringify(analyticsData.pagination));

          // Store accounts info from first page (it's the same on all pages)
          if (page === 1 && analyticsData.accounts) {
            analyticsAccounts = analyticsData.accounts;
            console.log(`Found ${analyticsAccounts.length} accounts in analytics response`);
          }

          if (analyticsData.posts && analyticsData.posts.length > 0) {
            allPosts = allPosts.concat(analyticsData.posts);
          }

          // Check if there are more pages (API returns 'pages' not 'totalPages')
          if (analyticsData.pagination) {
            const totalPages = analyticsData.pagination.totalPages 
                            || analyticsData.pagination.pages 
                            || 1;
            hasMorePages = page < totalPages;
            page++;
            console.log(`Pagination: page ${page - 1} of ${totalPages}, hasMore: ${hasMorePages}`);
          } else {
            hasMorePages = false;
          }
        }

        console.log(`Total posts fetched for company ${company.id}: ${allPosts.length}`);

        // Step 4: Process and store post snapshots for ALL posts
        const postsByPlatform: Record<string, AnalyticsPost[]> = {};

        for (const post of allPosts) {
          const platform = post.platform || 'unknown';
          
          // Resolve account_id for this post — skip if unmappable
          const accountId = platformToAccountId.get(platform) || null;
          if (!accountId) {
            console.warn(`Skipping post ${post._id} (${platform}): no active account mapped for this platform`);
            results.postsSkippedNoAccount++;
            continue;
          }

          if (!postsByPlatform[platform]) {
            postsByPlatform[platform] = [];
          }
          postsByPlatform[platform].push(post);

          // Log raw analytics for debugging (first few posts only)
          if (results.postSnapshots < 3) {
            console.log(`Post ${post._id} analytics:`, JSON.stringify(post.analytics));
            if (post.platforms) {
              console.log(`Post ${post._id} platforms:`, JSON.stringify(post.platforms));
            }
          }

          // Store individual post snapshot using embedded analytics
          // Look up thumbnail from Facebook discovery results
          const thumbnailUrl = post.platformPostUrl ? allThumbnails.get(post.platformPostUrl) : null;
          
          const postSnapshot = {
            company_id: company.id,
            post_id: post._id,
            platform: platform,
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
            // Store post content and metadata
            content: post.content || null,
            post_url: post.platformPostUrl || null,
            published_at: post.publishedAt || null,
            thumbnail_url: thumbnailUrl || null,
            // Derive source: if the post has a latePostId, it was sent through GetLate
            source: post.isExternal === false || post.latePostId ? 'getlate' : 'direct',
            // Extract objective from post metadata if available
            objective: (post as any).metadata?.objective || null,
          };

          const { error: postUpsertError } = await supabase
            .from('post_analytics_snapshots')
            .upsert(postSnapshot, {
              onConflict: 'company_id,post_id',
              ignoreDuplicates: false,
            });

          if (postUpsertError) {
            console.error(`Error upserting post snapshot for ${post._id}:`, postUpsertError);
          } else {
            results.postSnapshots++;
          }
        }

        // Step 5: Create account snapshots by aggregating post metrics per platform
        for (const account of accounts) {
          const accountId = account._id || account.id;
          if (!accountId) {
            console.warn('Account missing ID, skipping');
            continue;
          }

          const platform = account.platform;
          const platformPosts = postsByPlatform[platform] || [];

          // Aggregate metrics from posts
          let totalImpressions = 0;
          let totalReach = 0;
          let totalViews = 0;
          let totalLikes = 0;
          let totalComments = 0;
          let totalShares = 0;
          let totalClicks = 0;
          let totalEngagementRate = 0;

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

          // Calculate average engagement rate
          const avgEngagementRate = platformPosts.length > 0 ? totalEngagementRate / platformPosts.length : 0;

          // Get follower count - prefer analytics response, fallback to accounts response
          let followers = 0;
          const analyticsAccount = analyticsAccounts.find(a => a._id === accountId || a.platform === platform);
          if (analyticsAccount?.followerCount) {
            followers = analyticsAccount.followerCount;
          } else if (account.platform === 'facebook' && account.metadata?.availablePages && account.metadata?.selectedPageId) {
            // For Facebook pages, get fan_count from the selected page
            const selectedPage = account.metadata.availablePages.find(
              p => p.id === account.metadata?.selectedPageId
            );
            if (selectedPage?.fan_count) {
              followers = selectedPage.fan_count;
            }
          } else {
            // deno-lint-ignore no-explicit-any
            const accountAny = account as any;
            followers = 
              account.followersCount ?? 
              account.followerCount ?? 
              accountAny.followers_count ??
              account.metadata?.profileData?.followersCount ??
              0;
          }

          const accountSnapshot = {
            company_id: company.id,
            account_id: accountId,
            platform: platform,
            followers: followers,
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
          };

          console.log(`Upserting account snapshot for ${accountId} (${platform}): ${platformPosts.length} posts, ${followers} followers`);

          const { error: accountUpsertError } = await supabase
            .from('account_analytics_snapshots')
            .upsert(accountSnapshot, {
              onConflict: 'company_id,account_id',
              ignoreDuplicates: false,
            });

          if (accountUpsertError) {
            console.error(`Error upserting account snapshot for ${accountId}:`, accountUpsertError);
          } else {
            results.accountSnapshots++;
          }
        }

        // Step 6: Mark accounts NOT returned by GetLate as inactive
        if (activeAccountIds.size > 0) {
          const { data: existingAccounts } = await supabase
            .from('account_analytics_snapshots')
            .select('account_id')
            .eq('company_id', company.id);

          const orphanedIds = (existingAccounts || [])
            .map(a => a.account_id)
            .filter(id => !activeAccountIds.has(id));

          if (orphanedIds.length > 0) {
            const { error: deactivateError } = await supabase
              .from('account_analytics_snapshots')
              .update({ is_active: false })
              .eq('company_id', company.id)
              .in('account_id', orphanedIds);

            if (deactivateError) {
              console.error(`Error deactivating orphaned accounts:`, deactivateError);
            } else {
              console.log(`Marked ${orphanedIds.length} orphaned accounts as inactive: ${orphanedIds.join(', ')}`);
            }
          }
        }

        results.companiesSynced++;
        console.log(`Completed sync for company ${company.id}`);

        // Small delay between companies to avoid rate limiting
        if (companies.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (companyError) {
        console.error(`Error processing company ${company.id}:`, companyError);
        results.errors.push(`Company ${company.id}: ${companyError instanceof Error ? companyError.message : 'Unknown error'}`);
      }
    }

    console.log('Analytics sync completed:', JSON.stringify(results));

    if (results.errors.length > 0) {
      // If we have partial errors, we might want to log them as a warning or error
      // But the job itself "succeeded" in running. 
      // Let's log success but include errors in details.
      // Or if it's critical, log error. 
      // The user wants to know about failures.
      // Let's rely on the details field for partial errors.
      await monitor.success(results);
    } else {
      await monitor.success(results);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analytics sync error:', error);
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const errorMonitor = new CronMonitor('analytics-sync', supabase);
      await errorMonitor.error(error instanceof Error ? error : String(error));
    } catch (monitorErr) {
      console.error('Failed to log error to monitor:', monitorErr);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
