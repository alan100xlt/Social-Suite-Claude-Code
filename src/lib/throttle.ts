import { parseISO, differenceInHours } from 'date-fns';

export interface ThrottleConfig {
  enabled: boolean;
  max_posts: number;
  per_hours: number;
}

export interface ThrottleResult {
  isOverLimit: boolean;
  currentCount: number;
  maxPosts: number;
  perHours: number;
  enabled: boolean;
}

export interface PostLike {
  scheduledFor?: string | null;
  publishedAt?: string | null;
}

export function computeThrottle(
  config: ThrottleConfig | undefined,
  scheduledFor: string | null,
  existingPosts: PostLike[]
): ThrottleResult {
  if (!config?.enabled || !scheduledFor) {
    return { isOverLimit: false, currentCount: 0, maxPosts: 5, perHours: 4, enabled: false };
  }

  const targetDate = parseISO(scheduledFor);
  const windowHours = config.per_hours;
  const maxPosts = config.max_posts;

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
}
