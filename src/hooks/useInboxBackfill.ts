import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { isDemoCompany } from '@/lib/demo/demo-constants';

interface BackfillJob {
  id: string;
  company_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_conversations: number;
  classified_conversations: number;
  total_posts: number;
  analyzed_posts: number;
  report_data: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useLatestBackfillJob() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['inbox-backfill-job', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId || isDemoCompany(selectedCompanyId)) return null;

      const { data, error } = await supabase
        .from('inbox_backfill_jobs' as any)
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as BackfillJob;
    },
    enabled: !!selectedCompanyId,
    refetchInterval: (query) => {
      const job = query.state.data as BackfillJob | null;
      if (job?.status === 'running' || job?.status === 'pending') return 5000;
      return false;
    },
  });
}

export function useStartBackfill() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const { data, error } = await supabase.functions.invoke('inbox-backfill', {
        body: { companyId: selectedCompanyId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-backfill-job', selectedCompanyId] });
    },
  });
}
