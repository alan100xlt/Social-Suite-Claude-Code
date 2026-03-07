export interface FeatureConfig {
  evergreen_recycling: { enabled: boolean; schedule: string; auto_publish: boolean };
  breaking_news: { enabled: boolean };
  quality_checker: { enabled: boolean; block_on_publish: boolean };
  performance_alerts: { enabled: boolean; viral_threshold: number; underperform_threshold: number };
  posting_throttle: { enabled: boolean; max_posts: number; per_hours: number };
  media_library: { enabled: boolean; imagekit_url_endpoint: string | null };
  brand_voice_learning: { enabled: boolean };
  [key: string]: unknown;
}

export const DEFAULT_CONFIG: FeatureConfig = {
  evergreen_recycling: { enabled: false, schedule: 'weekly', auto_publish: false },
  breaking_news: { enabled: true },
  quality_checker: { enabled: true, block_on_publish: true },
  performance_alerts: { enabled: true, viral_threshold: 3.0, underperform_threshold: 0.3 },
  posting_throttle: { enabled: false, max_posts: 5, per_hours: 4 },
  media_library: { enabled: false, imagekit_url_endpoint: null },
  brand_voice_learning: { enabled: false },
};

export function isFeatureEnabled(config: FeatureConfig | undefined, featureKey: keyof FeatureConfig): boolean {
  if (!config) return false;
  const feature = config[featureKey];
  if (typeof feature === 'object' && feature !== null && 'enabled' in feature) {
    return (feature as { enabled: boolean }).enabled;
  }
  return false;
}

export function mergeFeatureConfig(serverConfig: Record<string, unknown>): FeatureConfig {
  return { ...DEFAULT_CONFIG, ...serverConfig } as FeatureConfig;
}
