import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { DEMO_INBOX_CONVERSATIONS } from '@/lib/demo/demo-data';
import { inboxApi, type ConversationStatus, type ConversationType, type ConversationPriority, type Sentiment, type InboxConversation } from '@/lib/api/inbox';
import { sendNotification } from '@/lib/api/notifications';
import { supabase } from '@/integrations/supabase/client';

export interface InboxFilters {
  status?: ConversationStatus;
  platform?: string;
  type?: ConversationType;
  assignedTo?: string;
}

export function useInboxConversations(filters?: InboxFilters) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-conversations', selectedCompanyId, filters],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      if (isDemo) return DEMO_INBOX_CONVERSATIONS;
      const result = await inboxApi.conversations.list(selectedCompanyId, filters);
      if (!result.success) throw new Error(result.error);
      const conversations = result.conversations || [];

      // Also fetch cross-outlet conversations assigned to this company
      const { data: crossOutlet } = await supabase
        .from('inbox_conversations')
        .select('*, contact:inbox_contacts(*)')
        .eq('cross_outlet_source', selectedCompanyId)
        .neq('company_id', selectedCompanyId)
        .order('last_message_at', { ascending: false });

      if (crossOutlet && crossOutlet.length > 0) {
        const existingIds = new Set(conversations.map((c: InboxConversation) => c.id));
        const mapped = crossOutlet
          .filter(c => !existingIds.has(c.id))
          .map(c => ({
            ...c,
            labels: [],
            type: c.type as ConversationType,
            status: c.status as ConversationStatus,
            priority: (c.priority || 'normal') as ConversationPriority,
            sentiment: c.sentiment as Sentiment | null,
            metadata: (c.metadata || {}) as Record<string, unknown>,
            unread_count: c.unread_count || 0,
            last_message_at: c.last_message_at || c.created_at || '',
          } as InboxConversation));
        return [...conversations, ...mapped];
      }

      return conversations;
    },
    enabled: !!selectedCompanyId,
    staleTime: isDemo ? Infinity : 0,
    refetchInterval: isDemo ? false : 30000,
  });
}

export function useInboxConversation(conversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-conversation', selectedCompanyId, conversationId],
    queryFn: async () => {
      if (!selectedCompanyId || !conversationId) return null;
      const result = await inboxApi.conversations.get(selectedCompanyId, conversationId);
      if (!result.success) throw new Error(result.error);
      return result.conversation;
    },
    enabled: !!selectedCompanyId && !!conversationId && !isDemo,
  });
}

export function useUpdateConversationStatus() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: ConversationStatus }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.conversations.updateStatus(selectedCompanyId, conversationId, status);
      if (!result.success) throw new Error(result.error);
      return result.conversation;
    },
    onSuccess: (_data, { conversationId, status }) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });

      // Log activity (fire-and-forget)
      if (selectedCompanyId && user?.id) {
        supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'status_changed',
          conversation_id: conversationId,
          metadata: { new_status: status, user_name: user?.user_metadata?.full_name || user?.email },
        }).then(() => {});
      }
    },
  });
}

export function useAssignConversation() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, assigneeId }: { conversationId: string; assigneeId: string | null }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.conversations.assign(selectedCompanyId, conversationId, assigneeId);
      if (!result.success) throw new Error(result.error);
      return result.conversation;
    },
    onSuccess: (conversation, { conversationId, assigneeId }) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });

      // Notify assignee (skip self-assignment and unassignment)
      if (assigneeId && assigneeId !== user?.id) {
        const assignerName = user?.user_metadata?.full_name || user?.email || 'Someone';
        const subject = conversation?.subject || conversation?.contact_name || 'a conversation';
        sendNotification({
          userId: assigneeId,
          title: 'New assignment',
          body: `${assignerName} assigned you to ${subject}`,
          actionUrl: `/app/content?tab=inbox&conversation=${conversationId}`,
        }).catch(console.error);
      }

      // Log activity (fire-and-forget)
      if (selectedCompanyId && user?.id) {
        supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'assigned',
          conversation_id: conversationId,
          metadata: { assignee_id: assigneeId, user_name: user?.user_metadata?.full_name || user?.email },
        }).then(() => {});
      }
    },
  });
}

export function useBulkUpdateStatus() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationIds, status }: { conversationIds: string[]; status: ConversationStatus }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.conversations.bulkUpdateStatus(selectedCompanyId, conversationIds, status);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useMarkConversationRead() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return inboxApi.conversations.markRead(selectedCompanyId, conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}
