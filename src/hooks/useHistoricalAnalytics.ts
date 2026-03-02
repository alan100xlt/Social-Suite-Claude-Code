import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import type { Platform } from '@/lib/api/getlate';

interface HistoricalAnalyticsParams {
  startDate: string;
  endDate: string;
  platform?: Platform;
}

interface DailyMetrics {
  date: string;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  postCount: number;
}

interface AnalyticsSummary {
  totalImpressions: number;
  totalReach: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  avgEngagementRate: number;
  totalPosts: number;
  dailyMetrics: DailyMetrics[];
}

const emptyResult: AnalyticsSummary = {
  totalImpressions: 0,
  totalReach: 0,
  totalViews: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalClicks: 0,
  avgEngagementRate: 0,
  totalPosts: 0,
  dailyMetrics: [],
};

export function useHistoricalAnalytics(params: HistoricalAnalyticsParams) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['historical-analytics', companyId, params],
    queryFn: async (): Promise<AnalyticsSummary> => {
      if (!companyId) return emptyResult;

      // Use RPC functions for server-side aggregation (no row limit issues)
      const [totalsResult, dailyResult, accountResult] = await Promise.all([
        supabase.rpc('get_post_analytics_totals', {
          _company_id: companyId,
          _start_date: params.startDate,
          _end_date: params.endDate,
          _platform: params.platform || null,
        }),
        supabase.rpc('get_post_analytics_by_date', {
          _company_id: companyId,
          _start_date: params.startDate,
          _end_date: params.endDate,
          _platform: params.platform || null,
        }),
        supabase
          .from('account_analytics_snapshots')
          .select('platform, impressions, reach, views, likes, comments, shares, clicks, engagement_rate, snapshot_date, followers')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gte('snapshot_date', params.startDate)
          .lte('snapshot_date', params.endDate)
          .order('snapshot_date', { ascending: false }),
      ]);

      if (totalsResult.error) {
        console.error('Error fetching analytics totals:', totalsResult.error);
        throw new Error('Failed to fetch analytics totals');
      }

      if (dailyResult.error) {
        console.error('Error fetching daily analytics:', dailyResult.error);
      }

      const totals = Array.isArray(totalsResult.data) ? totalsResult.data[0] : totalsResult.data;
      const dailyData = dailyResult.data || [];
      const accountData = accountResult.data || [];

      // Build daily metrics from RPC result
      const dailyMetrics: DailyMetrics[] = (Array.isArray(dailyData) ? dailyData : []).map((row: any) => ({
        date: row.snapshot_date,
        impressions: Number(row.impressions) || 0,
        reach: Number(row.reach) || 0,
        views: Number(row.views) || 0,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        shares: Number(row.shares) || 0,
        clicks: Number(row.clicks) || 0,
        engagementRate: Number(row.avg_engagement_rate) || 0,
        postCount: Number(row.post_count) || 0,
      }));

      // Account-level fallback (most recent per platform)
      const accountMetricsByPlatform = new Map<string, {
        impressions: number; reach: number; views: number;
        likes: number; comments: number; shares: number;
        clicks: number; engagementRate: number; followers: number;
      }>();

      for (const account of accountData) {
        if (!accountMetricsByPlatform.has(account.platform)) {
          accountMetricsByPlatform.set(account.platform, {
            impressions: account.impressions || 0,
            reach: account.reach || 0,
            views: account.views || 0,
            likes: account.likes || 0,
            comments: account.comments || 0,
            shares: account.shares || 0,
            clicks: account.clicks || 0,
            engagementRate: Number(account.engagement_rate) || 0,
            followers: account.followers || 0,
          });
        }
      }

      const accountTotals = { impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagementRate: 0, followers: 0 };
      for (const metrics of accountMetricsByPlatform.values()) {
        accountTotals.impressions += metrics.impressions;
        accountTotals.reach += metrics.reach;
        accountTotals.views += metrics.views;
        accountTotals.likes += metrics.likes;
        accountTotals.comments += metrics.comments;
        accountTotals.shares += metrics.shares;
        accountTotals.clicks += metrics.clicks;
        accountTotals.engagementRate += metrics.engagementRate;
        accountTotals.followers += metrics.followers;
      }

      const postImpressions = Number(totals?.total_impressions) || 0;
      const postViews = Number(totals?.total_views) || 0;
      const postLikes = Number(totals?.total_likes) || 0;
      const postComments = Number(totals?.total_comments) || 0;
      const postShares = Number(totals?.total_shares) || 0;

      const finalTotals = {
        totalImpressions: postImpressions > 0 ? postImpressions : accountTotals.impressions,
        totalReach: (Number(totals?.total_reach) || 0) > 0 ? Number(totals?.total_reach) : accountTotals.reach,
        totalViews: postViews > 0 ? postViews : accountTotals.views,
        totalLikes: postLikes > 0 ? postLikes : accountTotals.likes,
        totalComments: postComments > 0 ? postComments : accountTotals.comments,
        totalShares: postShares > 0 ? postShares : accountTotals.shares,
        totalClicks: (Number(totals?.total_clicks) || 0) > 0 ? Number(totals?.total_clicks) : accountTotals.clicks,
        totalPosts: Number(totals?.total_posts) || 0,
      };

      // Engagement rate
      let avgEngagementRate = Number(totals?.avg_engagement_rate) || 0;
      if (avgEngagementRate === 0 && accountTotals.followers > 0) {
        const totalEngagement = finalTotals.totalLikes + finalTotals.totalComments + finalTotals.totalShares;
        avgEngagementRate = (totalEngagement / accountTotals.followers) * 100;
      } else if (avgEngagementRate === 0 && accountMetricsByPlatform.size > 0) {
        avgEngagementRate = accountTotals.engagementRate / accountMetricsByPlatform.size;
      }

      return {
        ...finalTotals,
        avgEngagementRate,
        dailyMetrics,
      };
    },
    enabled: !!companyId,
  });
}

export function useAnalyticsByPlatform(params: { startDate: string; endDate: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['analytics-by-platform', companyId, params],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_post_analytics_by_platform', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
      });

      if (error) throw new Error('Failed to fetch platform analytics');

      return (data || []).map((row: any) => ({
        platform: row.platform,
        impressions: Number(row.total_impressions) || 0,
        views: Number(row.total_views) || 0,
        engagement: Number(row.total_engagement) || 0,
        posts: Number(row.total_posts) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
