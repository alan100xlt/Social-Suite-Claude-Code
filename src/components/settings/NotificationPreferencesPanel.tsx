import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences, useUpdateNotificationPreference, type NotificationEventType } from '@/hooks/useNotificationPreferences';
import { Loader2 } from 'lucide-react';

const eventTypeLabels: Record<NotificationEventType, string> = {
  assignment: 'Assignment',
  mention: '@Mention',
  reply: 'Reply to conversation',
  status_change: 'Status change',
  correction: 'Correction request',
  escalation: 'Escalation',
  sla_breach: 'SLA breach',
};

export function NotificationPreferencesPanel() {
  const { data: preferences = [], isLoading } = useNotificationPreferences();
  const { mutate: updatePref } = useUpdateNotificationPreference();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose which notifications you receive and how.</p>
      <div className="border rounded-lg">
        <div className="grid grid-cols-[1fr_80px_80px] gap-4 p-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
          <span>Event</span>
          <span className="text-center">In-App</span>
          <span className="text-center">Email</span>
        </div>
        {preferences.map(pref => (
          <div key={pref.event_type} className="grid grid-cols-[1fr_80px_80px] gap-4 p-3 border-b last:border-0 items-center">
            <span className="text-sm">{eventTypeLabels[pref.event_type]}</span>
            <div className="flex justify-center">
              <Switch checked={pref.in_app} onCheckedChange={(checked) => updatePref({ eventType: pref.event_type, channel: 'in_app', enabled: checked })} />
            </div>
            <div className="flex justify-center">
              <Switch checked={pref.email} onCheckedChange={(checked) => updatePref({ eventType: pref.event_type, channel: 'email', enabled: checked })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
