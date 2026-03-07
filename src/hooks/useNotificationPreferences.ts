import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export type NotificationEventType = 'assignment' | 'mention' | 'reply' | 'status_change' | 'correction' | 'escalation' | 'sla_breach';

export interface NotificationPreference {
  user_id: string;
  company_id: string;
  event_type: NotificationEventType;
  in_app: boolean;
  email: boolean;
}

const ALL_EVENT_TYPES: NotificationEventType[] = ['assignment', 'mention', 'reply', 'status_change', 'correction', 'escalation', 'sla_breach'];

export function useNotificationPreferences() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['notification-preferences', user?.id, selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId || !user?.id) return [];
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompanyId);
      if (error) throw error;

      // Fill in defaults for missing event types
      const result: NotificationPreference[] = ALL_EVENT_TYPES.map(eventType => {
        const found = (data || []).find((d) => d.event_type === eventType);
        if (found) return {
          user_id: found.user_id,
          company_id: found.company_id,
          event_type: eventType,
          in_app: found.in_app ?? true,
          email: found.email ?? false,
        };
        return { user_id: user.id, company_id: selectedCompanyId, event_type: eventType, in_app: true, email: false };
      });
      return result;
    },
    enabled: !!selectedCompanyId && !!user?.id && !isDemo,
  });
}

export function useUpdateNotificationPreference() {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventType, channel, enabled }: { eventType: NotificationEventType; channel: 'in_app' | 'email'; enabled: boolean }) => {
      if (!selectedCompanyId || !user?.id) throw new Error('Missing context');

      // First get current preferences for this event type to preserve other channel
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompanyId)
        .eq('event_type', eventType)
        .maybeSingle();

      const upsertData = {
        user_id: user.id,
        company_id: selectedCompanyId,
        event_type: eventType,
        in_app: channel === 'in_app' ? enabled : (existing?.in_app ?? true),
        email: channel === 'email' ? enabled : (existing?.email ?? false),
      };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(upsertData, { onConflict: 'user_id,company_id,event_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id, selectedCompanyId] });
    },
  });
}
