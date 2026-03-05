import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface BestTimeSlot {
  day_of_week: number; // 0-6 (Sunday=0)
  hour: number; // 0-23 (UTC)
  avg_engagement: number;
  post_count: number;
}

export function useBestTimeToPost(params: { platform?: string } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['best-time-to-post', companyId, params],
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<BestTimeSlot[]> => {
      const { data, error } = await supabase.rpc('get_optimal_posting_windows', {
        _company_id: companyId!,
        _platform: params.platform ?? null,
        _timezone: 'UTC',
      });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        day_of_week: Number(row.day_of_week),
        hour: Number(row.hour),
        avg_engagement: Number(row.avg_engagement),
        post_count: Number(row.post_count),
      }));
    },
  });
}
