import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';

export function usePostTimeline(postId: string | undefined, companyId?: string) {
  return useQuery({
    queryKey: ['post-timeline', postId],
    queryFn: async () => {
      if (!postId) return null;
      const result = await getlateAnalytics.getPostTimeline({ postId, companyId });
      if (!result.success) throw new Error(result.error || 'Failed to fetch post timeline');
      return result.data?.timeline ?? null;
    },
    enabled: !!postId,
  });
}
