import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

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

const DEFAULT_CONFIG: FeatureConfig = {
  evergreen_recycling: { enabled: false, schedule: 'weekly', auto_publish: false },
  breaking_news: { enabled: true },
  quality_checker: { enabled: true, block_on_publish: true },
  performance_alerts: { enabled: true, viral_threshold: 3.0, underperform_threshold: 0.3 },
  posting_throttle: { enabled: false, max_posts: 5, per_hours: 4 },
  media_library: { enabled: false, imagekit_url_endpoint: null },
  brand_voice_learning: { enabled: false },
};

export function useFeatureConfig() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['feature-config', selectedCompanyId],
    queryFn: async (): Promise<FeatureConfig> => {
      if (isDemoCompany(selectedCompanyId) || !selectedCompanyId) {
        return { ...DEFAULT_CONFIG, evergreen_recycling: { ...DEFAULT_CONFIG.evergreen_recycling, enabled: true } };
      }

      const { data, error } = await supabase
        .from('company_feature_config')
        .select('config')
        .eq('company_id', selectedCompanyId)
        .maybeSingle();

      if (error || !data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...(data.config as Record<string, unknown>) } as FeatureConfig;
    },
    enabled: !!selectedCompanyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsFeatureEnabled(featureKey: keyof FeatureConfig): boolean {
  const { data } = useFeatureConfig();
  if (!data) return false;
  const feature = data[featureKey];
  if (typeof feature === 'object' && feature !== null && 'enabled' in feature) {
    return (feature as { enabled: boolean }).enabled;
  }
  return false;
}
