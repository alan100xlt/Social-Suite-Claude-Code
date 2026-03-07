import { describe, it, expect } from 'vitest';
import { parseISO, differenceInHours } from 'date-fns';

/**
 * Unit tests for throttle check logic.
 * Tests the pure computation extracted from useThrottleCheck.
 */

interface ThrottleConfig {
  enabled: boolean;
  max_posts: number;
  per_hours: number;
}

interface PostLike {
  scheduledFor?: string | null;
  publishedAt?: string | null;
}

function computeThrottle(
  config: ThrottleConfig | undefined,
  scheduledFor: string | null,
  existingPosts: PostLike[]
) {
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

describe('computeThrottle', () => {
  const baseConfig: ThrottleConfig = { enabled: true, max_posts: 3, per_hours: 4 };

  it('returns disabled when config is not enabled', () => {
    const result = computeThrottle({ enabled: false, max_posts: 3, per_hours: 4 }, '2026-03-07T10:00:00Z', []);
    expect(result.enabled).toBe(false);
    expect(result.isOverLimit).toBe(false);
  });

  it('returns disabled when scheduledFor is null', () => {
    const result = computeThrottle(baseConfig, null, []);
    expect(result.enabled).toBe(false);
  });

  it('returns disabled when config is undefined', () => {
    const result = computeThrottle(undefined, '2026-03-07T10:00:00Z', []);
    expect(result.enabled).toBe(false);
  });

  it('counts posts within the time window', () => {
    const posts: PostLike[] = [
      { scheduledFor: '2026-03-07T09:00:00Z' }, // 1 hour before — in window
      { scheduledFor: '2026-03-07T12:00:00Z' }, // 2 hours after — in window
      { scheduledFor: '2026-03-07T20:00:00Z' }, // 10 hours after — outside window
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.enabled).toBe(true);
    expect(result.currentCount).toBe(2);
    expect(result.isOverLimit).toBe(false);
  });

  it('detects over-limit when count >= maxPosts', () => {
    const posts: PostLike[] = [
      { scheduledFor: '2026-03-07T09:00:00Z' },
      { scheduledFor: '2026-03-07T10:30:00Z' },
      { scheduledFor: '2026-03-07T11:00:00Z' },
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.isOverLimit).toBe(true);
    expect(result.currentCount).toBe(3);
    expect(result.maxPosts).toBe(3);
  });

  it('uses publishedAt when scheduledFor is missing', () => {
    const posts: PostLike[] = [
      { publishedAt: '2026-03-07T09:00:00Z' },
      { publishedAt: '2026-03-07T11:00:00Z' },
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.currentCount).toBe(2);
  });

  it('ignores posts with no date', () => {
    const posts: PostLike[] = [
      { scheduledFor: null, publishedAt: null },
      { scheduledFor: '2026-03-07T10:00:00Z' },
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.currentCount).toBe(1);
  });

  it('returns correct perHours and maxPosts from config', () => {
    const config: ThrottleConfig = { enabled: true, max_posts: 10, per_hours: 8 };
    const result = computeThrottle(config, '2026-03-07T10:00:00Z', []);
    expect(result.maxPosts).toBe(10);
    expect(result.perHours).toBe(8);
  });

  it('handles empty posts array', () => {
    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', []);
    expect(result.currentCount).toBe(0);
    expect(result.isOverLimit).toBe(false);
    expect(result.enabled).toBe(true);
  });
});
