import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  UserPlus,
  Tag,
  ExternalLink,
  AlarmClock,
  X,
} from 'lucide-react';
import { Tip } from '@/components/ui/tooltip';
import { useGlossary } from '@/components/inbox/GlossaryDialog';
import type { InboxConversation, InboxLabel, ConversationStatus } from '@/lib/api/inbox';

interface ConversationHeaderProps {
  conversation: InboxConversation;
  onStatusChange: (status: ConversationStatus) => void;
  onAssign?: (assigneeId: string | null) => void;
  onAddLabel?: (labelId: string) => void;
  onRemoveLabel?: (labelId: string) => void;
  onSnooze?: (until: Date) => void;
  labels?: InboxLabel[];
}

export function ConversationHeader({
  conversation,
  onStatusChange,
  onAssign,
  onAddLabel,
  onRemoveLabel,
  onSnooze,
  labels = [],
}: ConversationHeaderProps) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const glossary = useGlossary();
  const contactName = conversation.contact?.display_name || conversation.contact?.username || conversation.subject || 'Unknown';
  const initials = contactName.slice(0, 2).toUpperCase();

  const statusActions: { status: ConversationStatus; label: string; icon: React.ElementType }[] = [
    { status: 'open', label: 'Reopen', icon: Clock },
    { status: 'pending', label: 'Mark Pending', icon: Clock },
    { status: 'resolved', label: 'Resolve', icon: CheckCircle2 },
    { status: 'closed', label: 'Close', icon: XCircle },
  ];

  const attachedLabelIds = new Set(conversation.labels?.map(l => l.label.id) || []);
  const availableLabels = labels.filter(l => !attachedLabelIds.has(l.id));

  const handleSnoozePreset = (hours: number) => {
    const until = new Date();
    until.setHours(until.getHours() + hours);
    onSnooze?.(until);
    setSnoozeOpen(false);
  };

  const handleSnoozeDate = (date: Date | undefined) => {
    if (date) {
      date.setHours(9, 0, 0, 0);
      onSnooze?.(date);
      setSnoozeOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-3.5 px-[18px] py-[18px] border-b border-border-light bg-card">
      <Avatar className="h-[42px] w-[42px]">
        <AvatarImage src={conversation.contact?.avatar_url || undefined} />
        <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight truncate">{contactName}</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 capitalize">
            {conversation.type}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 capitalize">
            {conversation.platform}
          </Badge>
          {conversation.sentiment && (
            <Badge
              variant="outline"
              className={
                conversation.sentiment === 'positive' ? 'text-green-500 border-green-500/30' :
                conversation.sentiment === 'negative' ? 'text-red-500 border-red-500/30' :
                'text-muted-foreground'
              }
            >
              {conversation.sentiment}
            </Badge>
          )}
        </div>
        {conversation.contact?.username && (
          <p className="text-xs text-muted-foreground">@{conversation.contact.username}</p>
        )}
      </div>

      {/* Status actions */}
      <div className="flex items-center gap-1">
        {conversation.status === 'open' && (
          <Tip label="Mark this conversation as resolved" onLabelClick={() => glossary.open('Resolve')}>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onStatusChange('resolved')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </Button>
          </Tip>
        )}
        {conversation.status === 'resolved' && (
          <Tip label="Reopen this conversation" onLabelClick={() => glossary.open('Reopen')}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => onStatusChange('open')}
            >
              <Clock className="h-3.5 w-3.5" />
              Reopen
            </Button>
          </Tip>
        )}

        {conversation.post_url && (
          <Tip label="View on platform" onLabelClick={() => glossary.open('View on Platform')}>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={conversation.post_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </Tip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Tip label="More actions">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Tip>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statusActions
              .filter((a) => a.status !== conversation.status)
              .map((a) => (
                <DropdownMenuItem key={a.status} onClick={() => onStatusChange(a.status)}>
                  <a.icon className="h-4 w-4 mr-2" />
                  {a.label}
                </DropdownMenuItem>
              ))}

            <DropdownMenuSeparator />

            {/* Assign */}
            {onAssign && (
              <DropdownMenuItem onClick={() => onAssign(conversation.assigned_to ? null : 'me')}>
                <UserPlus className="h-4 w-4 mr-2" />
                {conversation.assigned_to ? 'Unassign' : 'Assign to me'}
              </DropdownMenuItem>
            )}

            {/* Labels submenu */}
            {onAddLabel && availableLabels.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Label
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {availableLabels.map((label) => (
                    <DropdownMenuItem key={label.id} onClick={() => onAddLabel(label.id)}>
                      <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {/* Remove labels */}
            {onRemoveLabel && conversation.labels?.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <X className="h-4 w-4 mr-2" />
                  Remove Label
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {conversation.labels.map(({ label }) => (
                    <DropdownMenuItem key={label.id} onClick={() => onRemoveLabel(label.id)}>
                      <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Snooze popover */}
        {onSnooze && (
          <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Snooze">
                <AlarmClock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium px-2 py-1 text-muted-foreground">Snooze until</p>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleSnoozePreset(1)}>
                  1 hour
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleSnoozePreset(4)}>
                  4 hours
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleSnoozePreset(24)}>
                  Tomorrow
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleSnoozePreset(72)}>
                  3 days
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleSnoozePreset(168)}>
                  1 week
                </Button>
              </div>
              <div className="border-t p-2">
                <p className="text-xs font-medium px-2 py-1 text-muted-foreground">Pick a date</p>
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleSnoozeDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
