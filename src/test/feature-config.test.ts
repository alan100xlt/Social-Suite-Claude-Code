import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, isFeatureEnabled, mergeFeatureConfig } from '@/lib/feature-config';

/**
 * Unit tests for feature configuration — imports the actual DEFAULT_CONFIG
 * and helper functions used by useFeatureConfig.
 */

describe('DEFAULT_CONFIG', () => {
  it('has all 7 required feature keys', () => {
    const requiredKeys = [
      'evergreen_recycling', 'breaking_news', 'quality_checker',
      'performance_alerts', 'posting_throttle', 'media_library', 'brand_voice_learning',
    ];
    for (const key of requiredKeys) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it('breaking_news is enabled by default', () => {
    expect(DEFAULT_CONFIG.breaking_news.enabled).toBe(true);
  });

  it('quality_checker is enabled and blocks on publish by default', () => {
    expect(DEFAULT_CONFIG.quality_checker.enabled).toBe(true);
    expect(DEFAULT_CONFIG.quality_checker.block_on_publish).toBe(true);
  });

  it('posting_throttle is disabled with sensible defaults', () => {
    expect(DEFAULT_CONFIG.posting_throttle.enabled).toBe(false);
    expect(DEFAULT_CONFIG.posting_throttle.max_posts).toBe(5);
    expect(DEFAULT_CONFIG.posting_throttle.per_hours).toBe(4);
  });

  it('evergreen_recycling is disabled by default', () => {
    expect(DEFAULT_CONFIG.evergreen_recycling.enabled).toBe(false);
    expect(DEFAULT_CONFIG.evergreen_recycling.schedule).toBe('weekly');
  });

  it('media_library is disabled with null endpoint', () => {
    expect(DEFAULT_CONFIG.media_library.enabled).toBe(false);
    expect(DEFAULT_CONFIG.media_library.imagekit_url_endpoint).toBeNull();
  });

  it('performance_alerts has thresholds that make mathematical sense', () => {
    const { viral_threshold, underperform_threshold } = DEFAULT_CONFIG.performance_alerts;
    expect(viral_threshold).toBeGreaterThan(1); // viral = above average
    expect(underperform_threshold).toBeLessThan(1); // underperform = below average
    expect(underperform_threshold).toBeGreaterThan(0); // not zero/negative
  });
});

describe('isFeatureEnabled', () => {
  it('returns false when config is undefined', () => {
    expect(isFeatureEnabled(undefined, 'breaking_news')).toBe(false);
  });

  it('returns true for features enabled in DEFAULT_CONFIG', () => {
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'breaking_news')).toBe(true);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'quality_checker')).toBe(true);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'performance_alerts')).toBe(true);
  });

  it('returns false for features disabled in DEFAULT_CONFIG', () => {
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'evergreen_recycling')).toBe(false);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'posting_throttle')).toBe(false);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'media_library')).toBe(false);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'brand_voice_learning')).toBe(false);
  });

  it('reflects runtime config changes', () => {
    const custom = { ...DEFAULT_CONFIG, posting_throttle: { enabled: true, max_posts: 10, per_hours: 2 } };
    expect(isFeatureEnabled(custom, 'posting_throttle')).toBe(true);
  });
});

describe('mergeFeatureConfig', () => {
  it('server overrides take precedence over defaults', () => {
    const merged = mergeFeatureConfig({
      posting_throttle: { enabled: true, max_posts: 10, per_hours: 2 },
    });
    expect(merged.posting_throttle.enabled).toBe(true);
    expect(merged.posting_throttle.max_posts).toBe(10);
  });

  it('unset keys fall back to defaults', () => {
    const merged = mergeFeatureConfig({
      posting_throttle: { enabled: true, max_posts: 10, per_hours: 2 },
    });
    expect(merged.breaking_news.enabled).toBe(true);
    expect(merged.quality_checker.enabled).toBe(true);
    expect(merged.media_library.enabled).toBe(false);
  });

  it('empty server config returns defaults unchanged', () => {
    const merged = mergeFeatureConfig({});
    expect(merged).toEqual(DEFAULT_CONFIG);
  });

  it('deeply nested values survive merge', () => {
    const merged = mergeFeatureConfig({
      performance_alerts: { enabled: false, viral_threshold: 5, underperform_threshold: 0.1 },
    });
    expect(merged.performance_alerts.enabled).toBe(false);
    expect(merged.performance_alerts.viral_threshold).toBe(5);
  });
});
