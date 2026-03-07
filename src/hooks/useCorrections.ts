import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export type CorrectionStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

export interface Correction {
  id: string;
  company_id: string;
  conversation_id: string;
  status: CorrectionStatus;
  assigned_to: string | null;
  reporter_contact_ids: string[] | null;
  notes: string | null;
  resolution_summary: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
}

export function useCorrections() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['corrections', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('corrections')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Correction[];
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useConversationCorrection(conversationId: string | null) {
  const { data: corrections = [] } = useCorrections();
  return corrections.find(
    (c) => c.conversation_id === conversationId && c.status !== 'resolved' && c.status !== 'rejected'
  ) || null;
}

export function useCreateCorrection() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, notes }: { conversationId: string; notes?: string }) => {
      if (!selectedCompanyId || !user?.id) throw new Error('Missing context');
      const { data, error } = await supabase
        .from('corrections')
        .insert({
          company_id: selectedCompanyId,
          conversation_id: conversationId,
          created_by: user.id,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Log activity
      await supabase.from('inbox_activity_log').insert({
        company_id: selectedCompanyId,
        user_id: user.id,
        action: 'correction_created',
        conversation_id: conversationId,
        metadata: { user_name: user.user_metadata?.full_name || user.email },
      } as any);

      return data as Correction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed', selectedCompanyId] });
    },
  });
}

export function useUpdateCorrectionStatus() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      correctionId,
      status,
      resolutionSummary,
    }: {
      correctionId: string;
      status: CorrectionStatus;
      resolutionSummary?: string;
    }) => {
      if (!selectedCompanyId || !user?.id) throw new Error('Missing context');
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        if (resolutionSummary) updates.resolution_summary = resolutionSummary;
      }
      const { data, error } = await supabase
        .from('corrections')
        .update(updates)
        .eq('id', correctionId)
        .select()
        .single();
      if (error) throw error;

      // Log activity on resolution
      if (status === 'resolved') {
        await supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'correction_resolved',
          conversation_id: (data as any).conversation_id,
          metadata: { user_name: user.user_metadata?.full_name || user.email },
        } as any);
      }

      return data as Correction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed', selectedCompanyId] });
    },
  });
}
