import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi } from '@/lib/api/inbox';

export function useInboxMessages(conversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-messages', selectedCompanyId, conversationId],
    queryFn: async () => {
      if (!selectedCompanyId || !conversationId) return [];
      const result = await inboxApi.messages.list(selectedCompanyId, conversationId);
      if (!result.success) throw new Error(result.error);
      return result.messages;
    },
    enabled: !!selectedCompanyId && !!conversationId && !isDemo,
    refetchInterval: 15000, // Poll messages more frequently
  });
}

export function useReplyToComment() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, parentCommentId }: {
      conversationId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.messages.replyComment(selectedCompanyId, conversationId, content, parentCommentId);
      if (!result.success) throw new Error(result.error);
      return result.message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedCompanyId, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useReplyToDM() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, mediaUrl }: {
      conversationId: string;
      content: string;
      mediaUrl?: string;
    }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.messages.replyDM(selectedCompanyId, conversationId, content, mediaUrl);
      if (!result.success) throw new Error(result.error);
      return result.message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedCompanyId, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useAddInternalNote() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.messages.addNote(selectedCompanyId, conversationId, content);
      if (!result.success) throw new Error(result.error);
      return result.note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedCompanyId, variables.conversationId] });
    },
  });
}

export function useLikeComment() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async ({ commentId, platform, unlike }: { commentId: string; platform: string; unlike?: boolean }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return inboxApi.messages.likeComment(selectedCompanyId, commentId, platform, unlike);
    },
  });
}
