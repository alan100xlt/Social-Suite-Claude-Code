import { describe, it, expect } from 'vitest';

/**
 * Unit tests for feature configuration defaults and helpers.
 */

interface FeatureConfig {
  evergreen_recycling: { enabled: boolean; schedule: string; auto_publish: boolean };
  breaking_news: { enabled: boolean };
  quality_checker: { enabled: boolean; block_on_publish: boolean };
  performance_alerts: { enabled: boolean; viral_threshold: number; underperform_threshold: number };
  posting_throttle: { enabled: boolean; max_posts: number; per_hours: number };
  media_library: { enabled: boolean; imagekit_url_endpoint: string | null };
  brand_voice_learning: { enabled: boolean };
  [key: string]: unknown;
}

const DEFAULT_CONFIG: FeatureConfig = {
  evergreen_recycling: { enabled: false, schedule: 'weekly', auto_publish: false },
  breaking_news: { enabled: true },
  quality_checker: { enabled: true, block_on_publish: true },
  performance_alerts: { enabled: true, viral_threshold: 3.0, underperform_threshold: 0.3 },
  posting_throttle: { enabled: false, max_posts: 5, per_hours: 4 },
  media_library: { enabled: false, imagekit_url_endpoint: null },
  brand_voice_learning: { enabled: false },
};

function isFeatureEnabled(config: FeatureConfig | undefined, featureKey: keyof FeatureConfig): boolean {
  if (!config) return false;
  const feature = config[featureKey];
  if (typeof feature === 'object' && feature !== null && 'enabled' in feature) {
    return (feature as { enabled: boolean }).enabled;
  }
  return false;
}

function mergeConfig(serverConfig: Record<string, unknown>): FeatureConfig {
  return { ...DEFAULT_CONFIG, ...serverConfig } as FeatureConfig;
}

describe('DEFAULT_CONFIG', () => {
  it('has all required feature keys', () => {
    const requiredKeys = [
      'evergreen_recycling', 'breaking_news', 'quality_checker',
      'performance_alerts', 'posting_throttle', 'media_library', 'brand_voice_learning',
    ];
    for (const key of requiredKeys) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it('has breaking_news enabled by default', () => {
    expect(DEFAULT_CONFIG.breaking_news.enabled).toBe(true);
  });

  it('has quality_checker enabled by default', () => {
    expect(DEFAULT_CONFIG.quality_checker.enabled).toBe(true);
    expect(DEFAULT_CONFIG.quality_checker.block_on_publish).toBe(true);
  });

  it('has posting_throttle disabled by default', () => {
    expect(DEFAULT_CONFIG.posting_throttle.enabled).toBe(false);
    expect(DEFAULT_CONFIG.posting_throttle.max_posts).toBe(5);
    expect(DEFAULT_CONFIG.posting_throttle.per_hours).toBe(4);
  });

  it('has evergreen_recycling disabled by default', () => {
    expect(DEFAULT_CONFIG.evergreen_recycling.enabled).toBe(false);
  });

  it('has media_library disabled with no endpoint', () => {
    expect(DEFAULT_CONFIG.media_library.enabled).toBe(false);
    expect(DEFAULT_CONFIG.media_library.imagekit_url_endpoint).toBeNull();
  });

  it('has performance_alerts with reasonable thresholds', () => {
    expect(DEFAULT_CONFIG.performance_alerts.viral_threshold).toBe(3.0);
    expect(DEFAULT_CONFIG.performance_alerts.underperform_threshold).toBe(0.3);
    expect(DEFAULT_CONFIG.performance_alerts.underperform_threshold).toBeLessThan(1);
    expect(DEFAULT_CONFIG.performance_alerts.viral_threshold).toBeGreaterThan(1);
  });
});

describe('isFeatureEnabled', () => {
  it('returns false when config is undefined', () => {
    expect(isFeatureEnabled(undefined, 'breaking_news')).toBe(false);
  });

  it('returns true for enabled features', () => {
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'breaking_news')).toBe(true);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'quality_checker')).toBe(true);
  });

  it('returns false for disabled features', () => {
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'evergreen_recycling')).toBe(false);
    expect(isFeatureEnabled(DEFAULT_CONFIG, 'posting_throttle')).toBe(false);
  });
});

describe('mergeConfig', () => {
  it('server overrides take precedence', () => {
    const server = { posting_throttle: { enabled: true, max_posts: 10, per_hours: 2 } };
    const merged = mergeConfig(server);
    expect(merged.posting_throttle.enabled).toBe(true);
    expect(merged.posting_throttle.max_posts).toBe(10);
  });

  it('unset keys fall back to defaults', () => {
    const server = { posting_throttle: { enabled: true, max_posts: 10, per_hours: 2 } };
    const merged = mergeConfig(server);
    expect(merged.breaking_news.enabled).toBe(true);
    expect(merged.quality_checker.enabled).toBe(true);
  });

  it('empty server config returns defaults', () => {
    const merged = mergeConfig({});
    expect(merged).toEqual(DEFAULT_CONFIG);
  });
});
