import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export type ActivityAction =
  | 'assigned'
  | 'status_changed'
  | 'replied'
  | 'noted'
  | 'labeled'
  | 'escalated'
  | 'correction_created'
  | 'correction_resolved'
  | 'content_submitted'
  | 'content_approved'
  | 'content_rejected'
  | 'content_pulled'
  | 'content_assigned';

export type ActivityEntityType = 'conversation' | 'content';

export interface ActivityEntry {
  id: string;
  company_id: string;
  user_id: string;
  action: ActivityAction;
  conversation_id: string | null;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useActivityFeed(limit = 50, entityType?: ActivityEntityType) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['activity-feed', selectedCompanyId, limit, entityType],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      let query = supabase
        .from('inbox_activity_log')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityEntry[];
    },
    enabled: !!selectedCompanyId && !isDemo,
    staleTime: 30000,
  });
}

export function useLogActivity() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      conversationId,
      entityType,
      entityId,
      metadata,
    }: {
      action: ActivityAction;
      conversationId?: string;
      entityType?: ActivityEntityType;
      entityId?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!selectedCompanyId) throw new Error('No company');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('inbox_activity_log').insert({
        company_id: selectedCompanyId,
        user_id: user.id,
        action,
        conversation_id: conversationId || null,
        entity_type: entityType || 'conversation',
        entity_id: entityId || conversationId || null,
        metadata: metadata || {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['activity-feed', selectedCompanyId],
      });
    },
  });
}
