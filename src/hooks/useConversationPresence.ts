import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  conversationId: string;
  userId: string;
  userName: string;
  action: 'viewing' | 'typing';
}

export function useConversationPresence(conversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!selectedCompanyId || !user?.id || !conversationId) {
      setOthers([]);
      return;
    }

    const channel = supabase.channel(`inbox:${selectedCompanyId}`, {
      config: { presence: { key: `user:${user.id}` } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const present: PresenceUser[] = [];
      for (const [, entries] of Object.entries(state)) {
        for (const entry of entries as any[]) {
          if (entry.userId !== user.id && entry.conversationId === conversationId) {
            present.push({
              conversationId: entry.conversationId,
              userId: entry.userId,
              userName: entry.userName,
              action: entry.action,
            });
          }
        }
      }
      setOthers(present);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          conversationId,
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email || 'Unknown',
          action: 'viewing',
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedCompanyId, user?.id, conversationId]);

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id || !conversationId) return;
    await channelRef.current.track({
      conversationId,
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email || 'Unknown',
      action: isTyping ? 'typing' : 'viewing',
    });
  }, [user, conversationId]);

  return { others, broadcastTyping };
}
