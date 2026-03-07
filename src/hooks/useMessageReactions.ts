import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
  hasReacted: boolean;
}

export function useMessageReactions(conversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['message-reactions', conversationId],
    queryFn: async () => {
      if (!conversationId || !selectedCompanyId) return {};

      // Get all message IDs for this conversation first
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select('id')
        .eq('conversation_id', conversationId);

      if (!messages?.length) return {};

      const messageIds = messages.map(m => m.id);

      const { data: reactions, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji, created_at')
        .in('message_id', messageIds);

      if (error) throw error;

      // Get unique user IDs for name resolution
      const userIds = [...new Set((reactions || []).map(r => r.user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        userMap = Object.fromEntries(
          (profiles || []).map(p => [p.id, p.full_name || p.email || 'Unknown'])
        );
      }

      // Group by message_id -> emoji -> users
      const grouped: Record<string, ReactionSummary[]> = {};
      for (const r of reactions || []) {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];

        let summary = grouped[r.message_id].find(s => s.emoji === r.emoji);
        if (!summary) {
          summary = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
          grouped[r.message_id].push(summary);
        }
        summary.count++;
        summary.users.push({ id: r.user_id, name: userMap[r.user_id] || 'Unknown' });
        if (r.user_id === user?.id) summary.hasReacted = true;
      }

      return grouped;
    },
    enabled: !!conversationId && !!selectedCompanyId && !isDemo,
    staleTime: 10000,
  });
}

export function useToggleReaction() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, hasReacted }: { messageId: string; emoji: string; hasReacted: boolean }) => {
      if (!selectedCompanyId || !user?.id) throw new Error('Not authenticated');

      if (hasReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            company_id: selectedCompanyId,
            emoji,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { messageId }) => {
      // Find the conversation ID from the message to invalidate the right query
      // We use a broad invalidation since we don't have conversationId here
      queryClient.invalidateQueries({ queryKey: ['message-reactions'] });
    },
  });
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
