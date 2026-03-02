import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface PostingFrequencyRow {
  platform: string;
  posts_per_week: number;
  average_engagement_rate: number;
}

export function usePostingFrequency(params: { platform?: string } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['posting-frequency', companyId, params],
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PostingFrequencyRow[]> => {
      const { data, error } = await supabase.functions.invoke('getlate-analytics', {
        body: { action: 'posting-frequency', companyId, ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get posting frequency');
      return (data.data as PostingFrequencyRow[]) ?? [];
    },
  });
}
