import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';

export function usePostAnalytics(postId: string) {
  return useQuery({
    queryKey: ['getlate-analytics', postId],
    queryFn: async () => {
      const result = await getlateAnalytics.getPostAnalytics(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
      return result.data?.analytics;
    },
    enabled: !!postId,
  });
}

export function useBatchAnalytics(postIds: string[]) {
  return useQuery({
    queryKey: ['getlate-analytics-batch', postIds],
    queryFn: async () => {
      const result = await getlateAnalytics.getBatchAnalytics(postIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
      return result.data?.analytics || [];
    },
    enabled: postIds.length > 0,
  });
}

export function useAnalyticsOverview(params?: {
  accountIds?: string[];
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['getlate-analytics-overview', params],
    queryFn: async () => {
      const result = await getlateAnalytics.getOverview(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics overview');
      }
      return result.data?.overview;
    },
  });
}
