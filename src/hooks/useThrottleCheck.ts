import { useMemo } from 'react';
import { useFeatureConfig } from '@/hooks/useFeatureConfig';
import { computeThrottle, type ThrottleResult } from '@/lib/throttle';
import type { GetLatePost } from '@/lib/api/getlate';

export type { ThrottleResult };

export function useThrottleCheck(
  scheduledFor: string | null,
  existingPosts: GetLatePost[]
): ThrottleResult {
  const { data: config } = useFeatureConfig();

  return useMemo(() => {
    return computeThrottle(config?.posting_throttle, scheduledFor, existingPosts);
  }, [config, scheduledFor, existingPosts]);
}
