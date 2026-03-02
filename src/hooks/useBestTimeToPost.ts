import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface BestTimeSlot {
  day_of_week: number; // 0-6 (Sunday=0)
  hour: number; // 0-23 (UTC)
  avg_engagement: number;
  post_count: number;
}

export function useBestTimeToPost(params: { platform?: string; profileId?: string } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['best-time-to-post', companyId, params],
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000, // 1 hour — matches GetLate cache TTL
    queryFn: async (): Promise<BestTimeSlot[]> => {
      const { data, error } = await supabase.functions.invoke('getlate-analytics', {
        body: { action: 'best-time', companyId, ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get best times');
      return (data.slots as BestTimeSlot[]) ?? [];
    },
  });
}
