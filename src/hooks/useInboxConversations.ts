import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi, type ConversationStatus, type ConversationType } from '@/lib/api/inbox';

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
      const result = await inboxApi.conversations.list(selectedCompanyId, filters);
      if (!result.success) throw new Error(result.error);
      return result.conversations;
    },
    enabled: !!selectedCompanyId && !isDemo,
    refetchInterval: 30000, // Poll every 30s for near-real-time
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, assigneeId }: { conversationId: string; assigneeId: string | null }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.conversations.assign(selectedCompanyId, conversationId, assigneeId);
      if (!result.success) throw new Error(result.error);
      return result.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
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
