import { useMemo } from 'react';
import { parseISO, differenceInHours } from 'date-fns';
import { useFeatureConfig } from '@/hooks/useFeatureConfig';
import type { GetLatePost } from '@/lib/api/getlate';

interface ThrottleResult {
  isOverLimit: boolean;
  currentCount: number;
  maxPosts: number;
  perHours: number;
  enabled: boolean;
}

export function useThrottleCheck(
  scheduledFor: string | null,
  existingPosts: GetLatePost[]
): ThrottleResult {
  const { data: config } = useFeatureConfig();

  return useMemo(() => {
    const throttle = config?.posting_throttle;
    if (!throttle?.enabled || !scheduledFor) {
      return { isOverLimit: false, currentCount: 0, maxPosts: 5, perHours: 4, enabled: false };
    }

    const targetDate = parseISO(scheduledFor);
    const windowHours = throttle.per_hours;
    const maxPosts = throttle.max_posts;

    // Count posts within the time window around the target
    const postsInWindow = existingPosts.filter((post) => {
      const postDate = post.scheduledFor || post.publishedAt;
      if (!postDate) return false;
      const postTime = parseISO(postDate);
      const hourDiff = Math.abs(differenceInHours(postTime, targetDate));
      return hourDiff <= windowHours;
    });

    return {
      isOverLimit: postsInWindow.length >= maxPosts,
      currentCount: postsInWindow.length,
      maxPosts,
      perHours: windowHours,
      enabled: true,
    };
  }, [config, scheduledFor, existingPosts]);
}
