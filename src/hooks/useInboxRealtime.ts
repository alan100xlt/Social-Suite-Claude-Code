import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export function useInboxRealtime(activeConversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();
  const isDemo = isDemoCompany(selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId || isDemo) return;

    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: `company_id=eq.${selectedCompanyId}`,
        },
        (payload) => {
          const newMessage = payload.new as { conversation_id: string };

          // If the new message is for the active conversation, invalidate messages
          if (newMessage.conversation_id === activeConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['inbox-messages', selectedCompanyId, activeConversationId],
            });
          }

          // Always refresh conversation list (for unread counts, previews)
          queryClient.invalidateQueries({
            queryKey: ['inbox-conversations', selectedCompanyId],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inbox_conversations',
          filter: `company_id=eq.${selectedCompanyId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['inbox-conversations', selectedCompanyId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompanyId, activeConversationId, queryClient, isDemo]);
}
