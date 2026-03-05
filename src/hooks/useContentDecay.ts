import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface ContentDecayBucket {
  timeWindow: string; // e.g. "1 hour", "24 hours"
  engagementPercentage: number; // 0-100
}

export function useContentDecay(params: { platform?: string } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['content-decay', companyId, params],
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<ContentDecayBucket[]> => {
      let query = supabase
        .from('content_decay_cache')
        .select('data')
        .eq('company_id', companyId!);

      if (params.platform) {
        query = query.eq('platform', params.platform);
      } else {
        query = query.is('platform', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return (data?.data as ContentDecayBucket[]) ?? [];
    },
  });
}
