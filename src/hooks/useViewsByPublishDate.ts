import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useInactiveAccountIds } from './useInactiveAccountIds';

interface ViewsByDate {
  date: string;
  views: number;
  posts: number;
  engagement: number;
}

export function useViewsByPublishDate(days: number = 30) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const { data: inactiveIds } = useInactiveAccountIds();

  return useQuery({
    queryKey: ['views-by-publish-date', companyId, days, inactiveIds ? Array.from(inactiveIds) : []],
    queryFn: async (): Promise<ViewsByDate[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('post_analytics_snapshots')
        .select('published_at, views, likes, comments, shares, account_id')
        .eq('company_id', companyId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: true });

      if (error) {
        console.error('Error fetching views by publish date:', error);
        throw error;
      }

      if (!data || data.length === 0) return [];

      const byDate = new Map<string, { views: number; posts: number; engagement: number }>();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      for (const post of data) {
        if (!post.published_at) continue;
        // Skip posts from inactive accounts
        if (post.account_id && inactiveIds?.has(post.account_id)) continue;
        
        const publishDate = new Date(post.published_at);
        if (publishDate < cutoffDate) continue;
        
        const dateKey = publishDate.toISOString().split('T')[0];
        const existing = byDate.get(dateKey) || { views: 0, posts: 0, engagement: 0 };
        existing.views += post.views || 0;
        existing.engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        existing.posts += 1;
        byDate.set(dateKey, existing);
      }

      return Array.from(byDate.entries())
        .map(([date, metrics]) => ({
          date,
          views: metrics.views,
          posts: metrics.posts,
          engagement: metrics.engagement,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!companyId && inactiveIds !== undefined,
  });
}
