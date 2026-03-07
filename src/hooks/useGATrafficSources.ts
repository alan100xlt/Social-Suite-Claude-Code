import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface GATrafficSource {
  source: string;
  medium: string;
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgBounceRate: number;
  avgSessionDuration: number;
}

export function useGATrafficSources(params: { startDate: string; endDate: string; pagePath?: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-traffic-sources', companyId, params],
    queryFn: async (): Promise<GATrafficSource[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_ga_traffic_sources', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
        _page_path: params.pagePath || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        source: String(row.source || '(not set)'),
        medium: String(row.medium || '(not set)'),
        totalSessions: Number(row.total_sessions) || 0,
        totalUsers: Number(row.total_users) || 0,
        totalPageviews: Number(row.total_pageviews) || 0,
        avgBounceRate: Number(row.avg_bounce_rate) || 0,
        avgSessionDuration: Number(row.avg_session_duration) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
