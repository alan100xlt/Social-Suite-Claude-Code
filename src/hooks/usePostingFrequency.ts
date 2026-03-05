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
    retry: 1,
    queryFn: async (): Promise<PostingFrequencyRow[]> => {
      const { data, error } = await supabase.rpc('get_posting_frequency_analysis', {
        _company_id: companyId!,
        _platform: params.platform ?? null,
      });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        platform: row.platform,
        posts_per_week: Number(row.posts_per_week),
        average_engagement_rate: Number(row.average_engagement_rate),
      }));
    },
  });
}
