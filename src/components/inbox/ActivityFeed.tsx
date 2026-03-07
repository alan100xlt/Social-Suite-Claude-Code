import { useActivityFeed, type ActivityAction } from '@/hooks/useActivityFeed';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_CONFIG: Record<ActivityAction, { label: string; color: string }> = {
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  status_changed: { label: 'Status Changed', color: 'bg-green-100 text-green-800' },
  replied: { label: 'Replied', color: 'bg-purple-100 text-purple-800' },
  noted: { label: 'Note Added', color: 'bg-yellow-100 text-yellow-800' },
  labeled: { label: 'Labeled', color: 'bg-gray-100 text-gray-800' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-800' },
  correction_created: { label: 'Correction Created', color: 'bg-orange-100 text-orange-800' },
  correction_resolved: { label: 'Correction Resolved', color: 'bg-emerald-100 text-emerald-800' },
};

function getInitials(metadata: Record<string, any>): string {
  const name = metadata?.user_name || metadata?.assignee_name || '';
  if (!name) return '??';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getDescription(action: ActivityAction, metadata: Record<string, any>): string {
  const userName = metadata?.user_name || 'Someone';
  switch (action) {
    case 'assigned':
      return `${userName} assigned the conversation`;
    case 'status_changed':
      return `${userName} changed status to ${metadata?.new_status || 'unknown'}`;
    case 'replied':
      return `${userName} replied`;
    case 'noted':
      return `${userName} added a note`;
    case 'labeled':
      return `${userName} updated labels`;
    case 'escalated':
      return `${userName} escalated the conversation`;
    case 'correction_created':
      return `${userName} created a correction`;
    case 'correction_resolved':
      return `${userName} resolved a correction`;
    default:
      return `${userName} performed an action`;
  }
}

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

export function ActivityFeed({ limit = 50, className }: ActivityFeedProps) {
  const { data: activities, isLoading } = useActivityFeed(limit);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className || ''}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`text-center py-8 text-sm text-muted-foreground ${className || ''}`}>
        No activity yet.
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className || ''}`}>
      {activities.map((entry) => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.assigned;
        const meta = (entry.metadata || {}) as Record<string, any>;

        return (
          <div key={entry.id} className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
              <AvatarFallback className="text-[10px] font-medium">
                {getInitials(meta)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {entry.created_at
                    ? formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
                    : ''}
                </span>
              </div>
              <p className="text-sm text-foreground mt-0.5 truncate">
                {getDescription(entry.action, meta)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
