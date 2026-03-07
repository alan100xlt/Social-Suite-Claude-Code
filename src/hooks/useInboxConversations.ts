import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { DEMO_INBOX_CONVERSATIONS } from '@/lib/demo/demo-data';
import { inboxApi, type ConversationStatus, type ConversationType } from '@/lib/api/inbox';
import { sendNotification } from '@/lib/api/notifications';

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
      return result.conversations;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: ConversationStatus }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.conversations.updateStatus(selectedCompanyId, conversationId, status);
      if (!result.success) throw new Error(result.error);
      return result.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
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
