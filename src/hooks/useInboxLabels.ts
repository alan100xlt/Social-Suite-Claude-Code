import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi } from '@/lib/api/inbox';

export function useInboxLabels() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-labels', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const result = await inboxApi.labels.list(selectedCompanyId);
      if (!result.success) throw new Error(result.error);
      return result.labels;
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useCreateInboxLabel() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.labels.create(selectedCompanyId, name, color);
      if (!result.success) throw new Error(result.error);
      return result.label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-labels', selectedCompanyId] });
    },
  });
}

export function useInboxCannedReplies() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-canned-replies', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const result = await inboxApi.cannedReplies.list(selectedCompanyId);
      if (!result.success) throw new Error(result.error);
      return result.cannedReplies;
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useCreateCannedReply() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { title: string; content: string; shortcut?: string; platform?: string }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.cannedReplies.create(selectedCompanyId, params);
      if (!result.success) throw new Error(result.error);
      return result.cannedReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-canned-replies', selectedCompanyId] });
    },
  });
}

export function useAddConversationLabel() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, labelId }: { conversationId: string; labelId: string }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return inboxApi.conversations.addLabel(selectedCompanyId, conversationId, labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useRemoveConversationLabel() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, labelId }: { conversationId: string; labelId: string }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return inboxApi.conversations.removeLabel(selectedCompanyId, conversationId, labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}
