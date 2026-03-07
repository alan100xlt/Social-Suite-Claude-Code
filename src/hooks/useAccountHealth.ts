import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';
import { useCompany } from './useCompany';

export function useAccountHealth() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['account-health', company?.id],
    queryFn: async () => {
      const result = await getlateAnalytics.getAccountHealth({ companyId: company?.id });
      if (!result.success) throw new Error(result.error || 'Failed to fetch account health');
      return result.data?.health;
    },
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
