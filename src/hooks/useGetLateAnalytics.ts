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

export function usePostTimeline(postId: string, params?: {
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: ['getlate-post-timeline', postId, params],
    queryFn: async () => {
      const result = await getlateAnalytics.getPostTimeline(postId, params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch post timeline');
      }
      return result.data?.timeline || [];
    },
    enabled: !!postId,
  });
}
