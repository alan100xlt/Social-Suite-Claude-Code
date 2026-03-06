import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveCrisisEvents, useDismissCrisis } from '@/hooks/useInboxCrisis';

export function CrisisAlertBanner() {
  const { data: events = [] } = useActiveCrisisEvents();
  const dismiss = useDismissCrisis();

  if (events.length === 0) return null;

  const event = events[0]; // Show most recent active crisis
  const isCritical = event.severity === 'critical';

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0 ${
      isCritical
        ? 'bg-red-600 text-white'
        : 'bg-amber-50 border-b border-amber-200 text-amber-900'
    }`}>
      <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${isCritical ? 'text-white' : 'text-amber-600'}`} />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">
          {isCritical ? 'Crisis Alert' : 'Sentiment Warning'}:
        </span>{' '}
        <span className="truncate">
          {event.summary || `${event.negative_count} negative messages in ${event.window_minutes}min`}
        </span>
        {event.topics.length > 0 && (
          <span className={`ml-2 text-xs ${isCritical ? 'text-white/80' : 'text-amber-700'}`}>
            Topics: {event.topics.join(', ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 text-xs gap-1 ${isCritical ? 'text-white hover:bg-white/20' : 'text-amber-700 hover:bg-amber-100'}`}
          onClick={() => dismiss.mutate({ eventId: event.id, action: 'resolved' })}
        >
          <CheckCircle className="h-3 w-3" /> Resolve
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 text-xs ${isCritical ? 'text-white/70 hover:bg-white/20' : 'text-amber-600 hover:bg-amber-100'}`}
          onClick={() => dismiss.mutate({ eventId: event.id, action: 'dismissed' })}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
