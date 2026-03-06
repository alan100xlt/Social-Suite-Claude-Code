import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExternalLink,
  User,
  Tag,
  UserPlus,
  Clock,
  MessageSquare,
  Mail,
  Star,
  AtSign,
  Sparkles,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ClassificationBadge } from './ClassificationBadge';
import { SignalScoreBadge } from './SignalScoreBadge';
import { CorrectionStatusDropdown } from './CorrectionStatusDropdown';
import type { InboxConversation, InboxLabel } from '@/lib/api/inbox';

interface ContactDetailPanelProps {
  conversation: InboxConversation;
  labels?: InboxLabel[];
  onAssign?: (assigneeId: string | null) => void;
  onAddLabel?: (labelId: string) => void;
  onRemoveLabel?: (labelId: string) => void;
}

const typeLabels = {
  comment: { label: 'Comment', icon: MessageSquare },
  dm: { label: 'Direct Message', icon: Mail },
  review: { label: 'Review', icon: Star },
  mention: { label: 'Mention', icon: AtSign },
};

export function ContactDetailPanel({
  conversation,
  labels = [],
  onAssign,
  onAddLabel,
  onRemoveLabel,
}: ContactDetailPanelProps) {
  const contact = conversation.contact;
  const contactName = contact?.display_name || contact?.username || 'Unknown';
  const initials = contactName.slice(0, 2).toUpperCase();
  const TypeInfo = typeLabels[conversation.type] || typeLabels.comment;
  const TypeIcon = TypeInfo.icon;

  const attachedLabelIds = new Set(conversation.labels?.map(l => l.label.id) || []);
  const availableLabels = labels.filter(l => !attachedLabelIds.has(l.id));

  return (
    <div className="p-4 space-y-5">
      {/* Contact info */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-14 w-14 mb-2">
          <AvatarImage src={contact?.avatar_url || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <h3 className="text-sm font-semibold">{contactName}</h3>
        {contact?.username && (
          <p className="text-xs text-muted-foreground">@{contact.username}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <Badge variant="secondary" className="text-[10px] capitalize">
            {conversation.platform}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            <TypeIcon className="h-3 w-3 mr-1" />
            {TypeInfo.label}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Conversation details */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</h4>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Status
            </span>
            <Badge variant="outline" className="capitalize text-xs">{conversation.status}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Priority
            </span>
            <Badge
              variant={conversation.priority === 'urgent' || conversation.priority === 'high' ? 'destructive' : 'outline'}
              className="capitalize text-xs"
            >
              {conversation.priority}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Created</span>
            <span className="text-xs">{format(new Date(conversation.created_at), 'MMM d, yyyy')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Last message</span>
            <span className="text-xs">{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
          </div>

          {conversation.snooze_until && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Snoozed until</span>
              <span className="text-xs">{format(new Date(conversation.snooze_until), 'MMM d, HH:mm')}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis section */}
      {conversation.message_type && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Analysis
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Category</span>
                <ClassificationBadge category={conversation.message_type} subcategory={conversation.message_subtype} showSubcategory />
              </div>

              {conversation.editorial_value && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Signal Score</span>
                  <SignalScoreBadge score={conversation.editorial_value} />
                </div>
              )}

              {conversation.sentiment && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Sentiment</span>
                  <Badge
                    variant="outline"
                    className={
                      conversation.sentiment === 'positive' ? 'text-green-500 border-green-500/30 text-xs capitalize' :
                      conversation.sentiment === 'negative' ? 'text-red-500 border-red-500/30 text-xs capitalize' :
                      'text-muted-foreground text-xs capitalize'
                    }
                  >
                    {conversation.sentiment}
                  </Badge>
                </div>
              )}

              {conversation.detected_language && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Language</span>
                  <span className="text-xs font-medium uppercase">{conversation.detected_language}</span>
                </div>
              )}

              {conversation.correction_status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Correction</span>
                  <CorrectionStatusDropdown
                    conversationId={conversation.id}
                    currentStatus={conversation.correction_status}
                  />
                </div>
              )}

              {conversation.article_title && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Article</span>
                  {conversation.article_url ? (
                    <a href={conversation.article_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[180px]">
                      {conversation.article_title}
                    </a>
                  ) : (
                    <span className="text-xs truncate max-w-[180px]">{conversation.article_title}</span>
                  )}
                </div>
              )}

              {/* Topic tags (from AI classification) */}
              {conversation.ai_topics && conversation.ai_topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {conversation.ai_topics.map((topic: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Assignment */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Assignment
        </h4>
        <div className="text-sm text-muted-foreground">
          {conversation.assigned_to ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Assigned</span>
              </span>
              {onAssign && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onAssign(null)}>
                  Unassign
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs">Unassigned</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Labels */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> Labels
        </h4>

        {conversation.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {conversation.labels.map(({ label }) => (
              <Badge
                key={label.id}
                variant="secondary"
                className="text-xs gap-1 pr-1"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
                {onRemoveLabel && (
                  <button
                    onClick={() => onRemoveLabel(label.id)}
                    className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {onAddLabel && availableLabels.length > 0 && (
          <Select onValueChange={onAddLabel}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Add label..." />
            </SelectTrigger>
            <SelectContent>
              {availableLabels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* External link */}
      {conversation.post_url && (
        <>
          <Separator />
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
            <a href={conversation.post_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              View original post
            </a>
          </Button>
        </>
      )}
    </div>
  );
}
