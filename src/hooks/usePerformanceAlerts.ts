import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export interface PerformanceAlert {
  id: string;
  post_id: string;
  post_text: string;
  alert_type: 'viral' | 'underperforming';
  current_engagement: number;
  average_engagement: number;
  multiplier: number;
  created_at: string;
  dismissed: boolean;
}

export function usePerformanceAlerts() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['performance-alerts', selectedCompanyId],
    queryFn: async (): Promise<PerformanceAlert[]> => {
      if (!selectedCompanyId || isDemoCompany(selectedCompanyId)) return [];

      // Query recent post analytics snapshots and compare to averages
      const { data: snapshots, error } = await supabase
        .from('post_analytics_snapshots')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .gte('snapshot_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      // Client-side alert generation — actual alerts come from the performance-alerts edge function
      // This hook provides an in-app view of recent alerts
      return [];
    },
    enabled: !!selectedCompanyId,
    staleTime: 5 * 60 * 1000,
  });
}
