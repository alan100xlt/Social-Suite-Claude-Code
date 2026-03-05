import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';

export function useDailyMetrics(params?: {
  profileId?: string;
  startDate?: string;
  endDate?: string;
  platform?: string;
} | null) {
  return useQuery({
    queryKey: ['getlate-daily-metrics', params],
    queryFn: async () => {
      const result = await getlateAnalytics.getDailyMetrics(params || {});
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch daily metrics');
      }
      return result.data?.metrics || [];
    },
    enabled: params !== undefined && params !== null,
  });
}
