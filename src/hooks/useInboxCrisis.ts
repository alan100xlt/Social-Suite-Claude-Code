import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { isDemoCompany } from '@/lib/demo/demo-constants';

interface CrisisEvent {
  id: string;
  company_id: string;
  status: 'active' | 'resolved' | 'dismissed';
  severity: 'warning' | 'critical';
  negative_count: number;
  threshold: number;
  window_minutes: number;
  topics: string[];
  sample_conversation_ids: string[];
  summary: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useActiveCrisisEvents() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['inbox-crisis-events', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId || isDemoCompany(selectedCompanyId)) return [];

      const { data, error } = await supabase
        .from('inbox_crisis_events' as any)
        .select('*')
        .eq('company_id', selectedCompanyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CrisisEvent[];
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000, // Check every minute
  });
}

export function useDismissCrisis() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, action }: { eventId: string; action: 'resolved' | 'dismissed' }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const { error } = await supabase
        .from('inbox_crisis_events' as any)
        .update({
          status: action,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('company_id', selectedCompanyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-crisis-events', selectedCompanyId] });
    },
  });
}
