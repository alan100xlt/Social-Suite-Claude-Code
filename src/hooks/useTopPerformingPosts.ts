import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

type SortMetric = 'impressions' | 'engagement_rate' | 'likes' | 'engagement';

interface TopPostsParams {
  metric?: SortMetric;
  limit?: number;
  days?: number;
}

interface TopPost {
  postId: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  engagement: number;
  snapshotDate: string;
  content: string | null;
  postUrl: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  views: number;
  source: string | null;
  objective: string | null;
}

export type { TopPost };

export function useTopPerformingPosts(params: TopPostsParams = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  const metric = params.metric || 'impressions';
  const limit = params.limit || 50;
  const days = params.days || 30;

  return useQuery({
    queryKey: ['top-posts', companyId, metric, limit, days],
    queryFn: async (): Promise<TopPost[]> => {
      if (!companyId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get inactive account IDs to exclude
      const { data: inactiveAccounts } = await supabase
        .from('account_analytics_snapshots')
        .select('account_id')
        .eq('company_id', companyId)
        .eq('is_active', false);
      const inactiveIds = new Set((inactiveAccounts || []).map(a => a.account_id));

      const { data, error } = await supabase
        .from('post_analytics_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .not('published_at', 'is', null)
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching top posts:', error);
        throw new Error('Failed to fetch top posts');
      }

      const latestByPost = new Map<string, TopPost>();
      
      for (const row of data || []) {
        // Skip posts from inactive accounts
        if (row.account_id && inactiveIds.has(row.account_id)) continue;
        if (!latestByPost.has(row.post_id)) {
          const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
          latestByPost.set(row.post_id, {
            postId: row.post_id,
            platform: row.platform,
            impressions: row.impressions || 0,
            reach: row.reach || 0,
            likes: row.likes || 0,
            comments: row.comments || 0,
            shares: row.shares || 0,
            clicks: row.clicks || 0,
            engagementRate: row.engagement_rate || 0,
            engagement,
            snapshotDate: row.snapshot_date,
            content: row.content || null,
            postUrl: row.post_url || null,
            publishedAt: row.published_at || null,
            thumbnailUrl: row.thumbnail_url || null,
            views: row.views || 0,
            source: (row as any).source || null,
            objective: (row as any).objective || null,
          });
        }
      }

      const posts = Array.from(latestByPost.values());
      
      posts.sort((a, b) => {
        switch (metric) {
          case 'engagement_rate':
            return b.engagementRate - a.engagementRate;
          case 'likes':
            return b.likes - a.likes;
          case 'engagement':
            return b.engagement - a.engagement;
          case 'impressions':
          default:
            return b.impressions - a.impressions;
        }
      });

      return posts.slice(0, limit);
    },
    enabled: !!companyId,
  });
}
