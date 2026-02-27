import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

interface PublishDateMetrics {
  date: string;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  postCount: number;
  engagementRate: number;
}

export function useAnalyticsByPublishDate(params: { startDate: string; endDate: string; platform?: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['analytics-by-publish-date', companyId, params],
    queryFn: async (): Promise<PublishDateMetrics[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_post_analytics_by_publish_date', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
        _platform: params.platform || null,
      });

      if (error) {
        console.error('Error fetching analytics by publish date:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        date: row.publish_date,
        impressions: Number(row.impressions) || 0,
        reach: Number(row.reach) || 0,
        views: Number(row.views) || 0,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        shares: Number(row.shares) || 0,
        clicks: Number(row.clicks) || 0,
        postCount: Number(row.post_count) || 0,
        engagementRate: Number(row.avg_engagement_rate) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
