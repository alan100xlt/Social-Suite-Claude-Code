import { useQuery } from '@tanstack/react-query';
import { getlateAnalytics } from '@/lib/api/getlate';

export function useFollowerStats(accountId: string | undefined) {
  return useQuery({
    queryKey: ['follower-stats', accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const result = await getlateAnalytics.getFollowerStats(accountId);
      if (!result.success) throw new Error(result.error || 'Failed to fetch follower stats');
      return result.data ?? null;
    },
    enabled: !!accountId,
  });
}
