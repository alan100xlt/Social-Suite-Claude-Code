import { describe, it, expect } from 'vitest';
import { computeThrottle, type ThrottleConfig, type PostLike } from '@/lib/throttle';

/**
 * Unit tests for computeThrottle — the actual function used by useThrottleCheck.
 * Tests inputs → outputs for the scheduling throttle logic.
 */

describe('computeThrottle', () => {
  const baseConfig: ThrottleConfig = { enabled: true, max_posts: 3, per_hours: 4 };

  it('returns disabled result when config is not enabled', () => {
    const result = computeThrottle({ enabled: false, max_posts: 3, per_hours: 4 }, '2026-03-07T10:00:00Z', []);
    expect(result.enabled).toBe(false);
    expect(result.isOverLimit).toBe(false);
  });

  it('returns disabled result when scheduledFor is null', () => {
    const result = computeThrottle(baseConfig, null, []);
    expect(result.enabled).toBe(false);
  });

  it('returns disabled result when config is undefined', () => {
    const result = computeThrottle(undefined, '2026-03-07T10:00:00Z', []);
    expect(result.enabled).toBe(false);
  });

  it('counts only posts within the time window', () => {
    const posts: PostLike[] = [
      { scheduledFor: '2026-03-07T09:00:00Z' }, // 1hr before — in 4hr window
      { scheduledFor: '2026-03-07T12:00:00Z' }, // 2hr after — in 4hr window
      { scheduledFor: '2026-03-07T20:00:00Z' }, // 10hr after — outside window
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

  it('falls back to publishedAt when scheduledFor is missing', () => {
    const posts: PostLike[] = [
      { publishedAt: '2026-03-07T09:00:00Z' },
      { publishedAt: '2026-03-07T11:00:00Z' },
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.currentCount).toBe(2);
  });

  it('skips posts with no date at all', () => {
    const posts: PostLike[] = [
      { scheduledFor: null, publishedAt: null },
      {},
      { scheduledFor: '2026-03-07T10:00:00Z' },
    ];

    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', posts);
    expect(result.currentCount).toBe(1);
  });

  it('propagates config values to result', () => {
    const config: ThrottleConfig = { enabled: true, max_posts: 10, per_hours: 8 };
    const result = computeThrottle(config, '2026-03-07T10:00:00Z', []);
    expect(result.maxPosts).toBe(10);
    expect(result.perHours).toBe(8);
    expect(result.enabled).toBe(true);
  });

  it('returns not-over-limit for empty posts', () => {
    const result = computeThrottle(baseConfig, '2026-03-07T10:00:00Z', []);
    expect(result.currentCount).toBe(0);
    expect(result.isOverLimit).toBe(false);
    expect(result.enabled).toBe(true);
  });

  it('correctly handles boundary — exactly at maxPosts', () => {
    const config: ThrottleConfig = { enabled: true, max_posts: 2, per_hours: 2 };
    const posts: PostLike[] = [
      { scheduledFor: '2026-03-07T09:30:00Z' },
      { scheduledFor: '2026-03-07T10:30:00Z' },
    ];

    const result = computeThrottle(config, '2026-03-07T10:00:00Z', posts);
    expect(result.isOverLimit).toBe(true);
    expect(result.currentCount).toBe(2);
  });

  it('correctly handles boundary — one below maxPosts', () => {
    const config: ThrottleConfig = { enabled: true, max_posts: 2, per_hours: 2 };
    const posts: PostLike[] = [
      { scheduledFor: '2026-03-07T09:30:00Z' },
    ];

    const result = computeThrottle(config, '2026-03-07T10:00:00Z', posts);
    expect(result.isOverLimit).toBe(false);
    expect(result.currentCount).toBe(1);
  });
});
