import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { transformSnapshotsToSparklines, type SnapshotRow, type MetricType } from '@/lib/platform-metrics';
import { format, subDays } from 'date-fns';

export const SPARKLINES_STALE_TIME = 10 * 60 * 1000;

export function platformSparklinesQueryKey(platform: string | null, companyId: string | null) {
  return ['platform-sparklines', platform, companyId] as const;
}

export function usePlatformSparklines(platform: string | null) {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: platformSparklinesQueryKey(platform, selectedCompanyId),
    queryFn: async (): Promise<Record<MetricType, number[]>> => {
      if (!selectedCompanyId || !platform) {
        return { impressions: [], reach: [], likes: [], comments: [], shares: [], saves: [], clicks: [], views: [] };
      }

      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('account_analytics_snapshots')
        .select('platform, snapshot_date, impressions, reach, likes, comments, shares, saves, clicks, views')
        .eq('company_id', selectedCompanyId)
        .eq('platform', platform)
        .gte('snapshot_date', thirtyDaysAgo)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return transformSnapshotsToSparklines((data ?? []) as SnapshotRow[]);
    },
    enabled: !!platform && !!selectedCompanyId,
    staleTime: SPARKLINES_STALE_TIME,
  });
}
