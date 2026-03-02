import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface ContentDecayBucket {
  timeWindow: string; // e.g. "1 hour", "24 hours"
  engagementPercentage: number; // 0-100
}

export function useContentDecay(params: { platform?: string; accountId?: string; postId?: string } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['content-decay', companyId, params],
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<ContentDecayBucket[]> => {
      const { data, error } = await supabase.functions.invoke('getlate-analytics', {
        body: { action: 'content-decay', companyId, ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get content decay');
      return (data.buckets as ContentDecayBucket[]) ?? [];
    },
  });
}
