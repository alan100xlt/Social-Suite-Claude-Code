import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface GAPageMetric {
  metricDate: string;
  pagePath: string;
  totalPageviews: number;
  totalUniquePageviews: number;
  totalSessions: number;
  totalUsers: number;
  avgBounceRate: number;
  avgTimeOnPage: number;
}

export function useGAPageMetrics(params: { startDate: string; endDate: string; pagePath?: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-page-metrics', companyId, params],
    queryFn: async (): Promise<GAPageMetric[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_ga_page_metrics', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
        _page_path: params.pagePath || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        metricDate: String(row.metric_date || ''),
        pagePath: String(row.page_path || ''),
        totalPageviews: Number(row.total_pageviews) || 0,
        totalUniquePageviews: Number(row.total_unique_pageviews) || 0,
        totalSessions: Number(row.total_sessions) || 0,
        totalUsers: Number(row.total_users) || 0,
        avgBounceRate: Number(row.avg_bounce_rate) || 0,
        avgTimeOnPage: Number(row.avg_time_on_page) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
