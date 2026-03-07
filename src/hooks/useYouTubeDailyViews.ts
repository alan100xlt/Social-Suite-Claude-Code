import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';

export function useYouTubeDailyViews(postId: string | undefined, companyId?: string) {
  return useQuery({
    queryKey: ['youtube-daily-views', postId],
    queryFn: async () => {
      if (!postId) return null;
      const result = await getlateAnalytics.getYouTubeDailyViews({ postId, companyId });
      if (!result.success) throw new Error(result.error || 'Failed to fetch YouTube daily views');
      return result.data?.dailyViews ?? null;
    },
    enabled: !!postId,
  });
}
