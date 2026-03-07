import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface ContentJourneyItem {
  postId: string;
  platform: string;
  postContent: string | null;
  postUrl: string | null;
  publishedAt: string;
  impressions: number;
  socialClicks: number;
  likes: number;
  shares: number;
  engagementRate: number;
  pagePath: string;
  pageviews: number;
  sessionsFromSocial: number;
  bounceRate: number;
  avgTimeOnPage: number;
  matchType: string;
  matchConfidence: number;
}

export function useContentJourney(params: { startDate: string; endDate: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['content-journey', companyId, params],
    queryFn: async (): Promise<ContentJourneyItem[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_content_journey', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        postId: String(row.post_id || ''),
        platform: String(row.platform || ''),
        postContent: row.post_content as string | null,
        postUrl: row.post_url as string | null,
        publishedAt: String(row.published_at || ''),
        impressions: Number(row.impressions) || 0,
        socialClicks: Number(row.social_clicks) || 0,
        likes: Number(row.likes) || 0,
        shares: Number(row.shares) || 0,
        engagementRate: Number(row.engagement_rate) || 0,
        pagePath: String(row.page_path || ''),
        pageviews: Number(row.pageviews) || 0,
        sessionsFromSocial: Number(row.sessions_from_social) || 0,
        bounceRate: Number(row.bounce_rate) || 0,
        avgTimeOnPage: Number(row.avg_time_on_page) || 0,
        matchType: String(row.match_type || 'url'),
        matchConfidence: Number(row.match_confidence) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
