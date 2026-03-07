import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import type { Platform } from '@/lib/api/getlate';

interface PlatformMetrics {
  platform: Platform;
  followers: number;
  following: number;
  postsCount: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  totalEngagement: number;
}

interface PlatformBreakdownParams {
  startDate: string;
  endDate: string;
}

export function usePlatformBreakdown(params: PlatformBreakdownParams) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['platform-breakdown', companyId, params],
    queryFn: async (): Promise<PlatformMetrics[]> => {
      if (!companyId) return [];

      // Fetch latest account snapshots for follower data (including new metrics columns)
      const { data: accountData, error: accountError } = await supabase
        .from('account_analytics_snapshots')
        .select('platform, followers, following, posts_count, engagement_rate, snapshot_date, account_id, impressions, reach, views, likes, comments, shares, clicks')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gte('snapshot_date', params.startDate)
        .lte('snapshot_date', params.endDate)
        .order('snapshot_date', { ascending: false });

      if (accountError) {
        console.error('Error fetching account snapshots:', accountError);
        throw new Error('Failed to fetch account data');
      }

      // Fetch post analytics for engagement metrics — only from active accounts
      // First get inactive account IDs
      const { data: inactiveAccounts } = await supabase
        .from('account_analytics_snapshots')
        .select('account_id')
        .eq('company_id', companyId)
        .eq('is_active', false);
      
      const inactiveIds = new Set((inactiveAccounts || []).map(a => a.account_id));

      const { data: rawPostData, error: postError } = await supabase
        .from('post_analytics_snapshots')
        .select('platform, impressions, reach, views, likes, comments, shares, clicks, engagement_rate, account_id')
        .eq('company_id', companyId)
        .not('published_at', 'is', null)
        .gte('published_at', params.startDate)
        .lte('published_at', params.endDate);

      if (postError) {
        console.error('Error fetching post analytics:', postError);
        throw new Error('Failed to fetch post data');
      }

      // Filter out posts from inactive accounts
      const postData = (rawPostData || []).filter(
        (row) => !row.account_id || !inactiveIds.has(row.account_id)
      );

      // Aggregate account data by platform (use latest per account)
      const latestAccountByPlatform = new Map<string, Map<string, typeof accountData[0]>>();
      
      for (const row of accountData || []) {
        if (!latestAccountByPlatform.has(row.platform)) {
          latestAccountByPlatform.set(row.platform, new Map());
        }
        const platformMap = latestAccountByPlatform.get(row.platform)!;
        // Only keep the latest snapshot per account
        if (!platformMap.has(row.account_id)) {
          platformMap.set(row.account_id, row);
        }
      }

      // Aggregate account-level metrics by platform
      const accountMetricsByPlatform = new Map<string, {
        impressions: number;
        reach: number;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
      }>();

      for (const [platform, accountMap] of latestAccountByPlatform) {
        let impressions = 0;
        let reach = 0;
        let views = 0;
        let likes = 0;
        let comments = 0;
        let shares = 0;
        let clicks = 0;

        for (const account of accountMap.values()) {
          impressions += account.impressions || 0;
          reach += account.reach || 0;
          views += account.views || 0;
          likes += account.likes || 0;
          comments += account.comments || 0;
          shares += account.shares || 0;
          clicks += account.clicks || 0;
        }

        accountMetricsByPlatform.set(platform, {
          impressions,
          reach,
          views,
          likes,
          comments,
          shares,
          clicks,
        });
      }

      // Aggregate post data by platform
      const postMetricsByPlatform = new Map<string, {
        impressions: number;
        reach: number;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        engagementRateSum: number;
        postCount: number;
      }>();

      for (const row of postData || []) {
        const existing = postMetricsByPlatform.get(row.platform) || {
          impressions: 0,
          reach: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          engagementRateSum: 0,
          postCount: 0,
        };

        existing.impressions += row.impressions || 0;
        existing.reach += row.reach || 0;
        existing.views += row.views || 0;
        existing.likes += row.likes || 0;
        existing.comments += row.comments || 0;
        existing.shares += row.shares || 0;
        existing.clicks += row.clicks || 0;
        existing.engagementRateSum += Number(row.engagement_rate) || 0;
        existing.postCount += 1;

        postMetricsByPlatform.set(row.platform, existing);
      }

      // Combine all platforms
      const allPlatforms = new Set<string>([
        ...latestAccountByPlatform.keys(),
        ...postMetricsByPlatform.keys(),
      ]);

      const platformMetrics: PlatformMetrics[] = [];

      for (const platform of allPlatforms) {
        const accountMap = latestAccountByPlatform.get(platform);
        const postMetrics = postMetricsByPlatform.get(platform);
        const accountMetrics = accountMetricsByPlatform.get(platform);

        // Sum up account metrics across all accounts on this platform
        let followers = 0;
        let following = 0;
        let postsCount = 0;
        let accountEngagementSum = 0;
        let accountCount = 0;

        if (accountMap) {
          for (const account of accountMap.values()) {
            followers += account.followers || 0;
            following += account.following || 0;
            postsCount += account.posts_count || 0;
            accountEngagementSum += Number(account.engagement_rate) || 0;
            accountCount++;
          }
        }

        // Prefer account-level metrics if available, fall back to post-level metrics
        const impressions = accountMetrics?.impressions || postMetrics?.impressions || 0;
        const reach = accountMetrics?.reach || postMetrics?.reach || 0;
        const views = accountMetrics?.views || postMetrics?.views || 0;
        const likes = accountMetrics?.likes || postMetrics?.likes || 0;
        const comments = accountMetrics?.comments || postMetrics?.comments || 0;
        const shares = accountMetrics?.shares || postMetrics?.shares || 0;
        const clicks = accountMetrics?.clicks || postMetrics?.clicks || 0;
        const totalEngagement = likes + comments + shares;

        // Calculate average engagement rate from posts if available, otherwise from accounts
        let engagementRate = 0;
        if (postMetrics && postMetrics.postCount > 0) {
          engagementRate = postMetrics.engagementRateSum / postMetrics.postCount;
        } else if (accountCount > 0) {
          engagementRate = accountEngagementSum / accountCount;
        }

        platformMetrics.push({
          platform: platform as Platform,
          followers,
          following,
          postsCount: postMetrics?.postCount || postsCount,
          impressions,
          reach,
          views,
          likes,
          comments,
          shares,
          clicks,
          engagementRate,
          totalEngagement,
        });
      }

      // Sort by followers descending
      return platformMetrics.sort((a, b) => b.followers - a.followers);
    },
    enabled: !!companyId,
  });
}
