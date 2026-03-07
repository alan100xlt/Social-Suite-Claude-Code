import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi } from '@/lib/api/inbox';
import { sendNotification } from '@/lib/api/notifications';
import { parseMentions } from '@/lib/mentions';
import { useCompanyMembers } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';

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
  const { user } = useAuth();
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

      // Log activity (fire-and-forget)
      if (selectedCompanyId && user?.id) {
        supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'replied',
          conversation_id: variables.conversationId,
          metadata: { reply_type: 'comment', user_name: user?.user_metadata?.full_name || user?.email },
        }).then(() => {});
      }
    },
  });
}

export function useReplyToDM() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
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

      // Log activity (fire-and-forget)
      if (selectedCompanyId && user?.id) {
        supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'replied',
          conversation_id: variables.conversationId,
          metadata: { reply_type: 'dm', user_name: user?.user_metadata?.full_name || user?.email },
        }).then(() => {});
      }
    },
  });
}

export function useAddInternalNote(companyMembers?: ReturnType<typeof useCompanyMembers>['data']) {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
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

      // Log activity (fire-and-forget)
      if (selectedCompanyId && user?.id) {
        supabase.from('inbox_activity_log').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          action: 'noted',
          conversation_id: variables.conversationId,
          metadata: { user_name: user?.user_metadata?.full_name || user?.email },
        }).then(() => {});
      }

      // Notify @mentioned users
      if (companyMembers?.length) {
        const mentions = parseMentions(variables.content);
        if (mentions.length === 0) return;

        const senderName = user?.user_metadata?.full_name || user?.email || 'Someone';

        for (const mention of mentions) {
          const lower = mention.toLowerCase();
          const member = companyMembers.find(m =>
            m.full_name?.toLowerCase() === lower ||
            m.email?.split('@')[0].toLowerCase() === lower
          );
          if (member && member.id !== user?.id) {
            sendNotification({
              userId: member.id,
              title: 'You were mentioned',
              body: `${senderName} mentioned you in a note on a conversation`,
              actionUrl: `/app/content?tab=inbox&conversation=${variables.conversationId}`,
            }).catch(console.error);
          }
        }
      }
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
