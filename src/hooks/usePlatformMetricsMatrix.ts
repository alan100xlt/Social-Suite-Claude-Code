import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { transformSnapshotsToMatrix, type SnapshotRow, type MetricType } from '@/lib/platform-metrics';

export function platformMetricsQueryKey(companyId: string | null) {
  return ['platform-metrics-matrix', companyId] as const;
}

export function usePlatformMetricsMatrix() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: platformMetricsQueryKey(selectedCompanyId),
    queryFn: async (): Promise<Record<string, Record<MetricType, number | null>>> => {
      if (!selectedCompanyId) return {};

      const { data, error } = await supabase
        .from('account_analytics_snapshots')
        .select('platform, snapshot_date, impressions, reach, likes, comments, shares, saves, clicks, views')
        .eq('company_id', selectedCompanyId)
        .order('snapshot_date', { ascending: false });

      if (error) throw error;
      return transformSnapshotsToMatrix((data ?? []) as SnapshotRow[]);
    },
    enabled: !!selectedCompanyId && !isDemoCompany(selectedCompanyId),
    staleTime: 5 * 60 * 1000,
  });
}
