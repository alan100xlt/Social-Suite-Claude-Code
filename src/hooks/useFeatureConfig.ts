import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { DEFAULT_CONFIG, isFeatureEnabled, type FeatureConfig } from '@/lib/feature-config';

export type { FeatureConfig };

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
  return isFeatureEnabled(data, featureKey);
}
