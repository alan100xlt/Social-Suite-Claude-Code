import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Flag } from 'lucide-react';
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { format, isToday, isYesterday } from 'date-fns';
import type { InboxConversation, ConversationType, Sentiment } from '@/lib/api/inbox';

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
};

const platformBgColors: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-500',
  twitter: 'bg-sky-500',
  linkedin: 'bg-blue-700',
  tiktok: 'bg-foreground',
  youtube: 'bg-red-500',
  bluesky: 'bg-sky-400',
  threads: 'bg-foreground',
};

// Avatar warm color palettes (rotating)
const avatarGradients = [
  'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800',
  'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800',
  'bg-gradient-to-br from-green-100 to-green-200 text-green-800',
  'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800',
  'bg-gradient-to-br from-violet-100 to-violet-200 text-violet-800',
  'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800',
  'bg-gradient-to-br from-sky-100 to-sky-200 text-sky-800',
  'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

// Sentiment bar color
function getSentimentBarClass(sentiment: Sentiment | null, category?: string | null): string {
  if (sentiment === 'negative') return 'bg-gradient-to-r from-red-400 to-red-300';
  if (category === 'business') return 'bg-gradient-to-r from-emerald-400 to-emerald-300';
  if (sentiment === 'positive') return 'bg-gradient-to-r from-blue-400 to-blue-300';
  return 'bg-border';
}

// Classification chip styling
const categoryChipStyles: Record<string, string> = {
  editorial: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  business: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  support: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  community: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  noise: 'bg-muted text-muted-foreground',
  general: 'bg-muted text-muted-foreground',
};

const sentimentChipStyles: Record<string, string> = {
  positive: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  negative: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
};

const sentimentDotColors: Record<string, string> = {
  positive: 'bg-blue-500',
  negative: 'bg-red-500',
  neutral: 'bg-muted-foreground',
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

interface ConversationListProps {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onToggleFlag?: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleFlag,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!conversations.length) return;
    const currentIdx = conversations.findIndex(c => c.id === selectedId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(currentIdx + 1, conversations.length - 1);
      onSelect(conversations[nextIdx].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(currentIdx - 1, 0);
      onSelect(conversations[prevIdx].id);
    }
  }, [conversations, selectedId, onSelect]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="p-3.5 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No conversations</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Messages will appear here when synced</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div
        ref={listRef}
        className="flex flex-col gap-4 p-3.5"
        tabIndex={0}
        role="listbox"
      >
        {conversations.map((conv) => {
          const isSelected = conv.id === selectedId;
          const isChecked = selectedIds?.has(conv.id) ?? false;
          const isUnread = conv.unread_count > 0;
          const contactName = conv.contact?.display_name || conv.contact?.username || conv.subject || 'Unknown';
          const initials = contactName.slice(0, 2).toUpperCase();
          const PlatformIcon = platformIcons[conv.platform] || MessageSquare;
          const platformBg = platformBgColors[conv.platform] || 'bg-muted-foreground';
          const avatarGradient = getAvatarGradient(contactName);
          const categoryLabel = conv.message_type
            ? conv.message_type.charAt(0).toUpperCase() + conv.message_type.slice(1)
            : null;
          const sentimentLabel = conv.sentiment
            ? conv.sentiment.charAt(0).toUpperCase() + conv.sentiment.slice(1)
            : null;

          return (
            <div
              key={conv.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'flex flex-col cursor-pointer rounded-xl transition-all border overflow-hidden flex-shrink-0',
                'shadow-sm hover:shadow-md',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 shadow-md'
                  : 'border-border/60 hover:border-border',
              )}
            >
              <div className="p-4 pb-3">
                {/* Row 1: Avatar + name + timestamp */}
                <div className="flex items-center gap-3 mb-2.5">
                  {onToggleSelect && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggleSelect(conv.id)}
                        className="h-4 w-4"
                      />
                    </div>
                  )}

                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      'h-11 w-11 rounded-full flex items-center justify-center text-[15px] font-bold',
                      avatarGradient
                    )}>
                      {initials}
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center',
                      platformBg
                    )}>
                      <PlatformIcon className="h-2 w-2 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[14.5px] truncate', isUnread ? 'font-bold' : 'font-semibold')}>
                      {contactName}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {conv.type === 'dm' ? 'DM' : conv.type === 'comment' ? 'Comment' : conv.type === 'review' ? 'Review' : 'Mention'}
                      {' · '}
                      {conv.platform.charAt(0).toUpperCase() + conv.platform.slice(1)}
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap flex-shrink-0">
                    {formatTimestamp(conv.last_message_at)}
                  </span>
                </div>

                {/* Preview text */}
                <p className={cn(
                  'text-[13.5px] leading-relaxed line-clamp-2 min-h-[42px] mb-3',
                  isUnread ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {conv.last_message_preview || 'No messages yet'}
                </p>

                {/* Chips row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categoryLabel && conv.message_type && (
                    <span className={cn(
                      'text-[11px] font-semibold px-2.5 py-0.5 rounded-full',
                      categoryChipStyles[conv.message_type] || categoryChipStyles.general
                    )}>
                      {categoryLabel}
                    </span>
                  )}

                  {sentimentLabel && conv.sentiment && (
                    <span className={cn(
                      'text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
                      sentimentChipStyles[conv.sentiment] || sentimentChipStyles.neutral
                    )}>
                      <span className={cn('w-[7px] h-[7px] rounded-full', sentimentDotColors[conv.sentiment] || sentimentDotColors.neutral)} />
                      {sentimentLabel}
                    </span>
                  )}

                  {/* Signal score star */}
                  {conv.editorial_value && conv.editorial_value >= 3 && (
                    <span className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5',
                      conv.editorial_value >= 4
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400'
                    )}>
                      {'★'} {conv.editorial_value}
                    </span>
                  )}

                  <span className="flex-1" />

                  {/* Message count */}
                  {(conv.message_count || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 opacity-50" />
                      {conv.message_count}
                    </span>
                  )}

                  {/* Flag for reply */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag?.(conv.id);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors',
                      conv.flagged
                        ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:border-border'
                    )}
                  >
                    <Flag className="h-3.5 w-3.5" fill={conv.flagged ? 'currentColor' : 'none'} />
                    {conv.flagged ? 'Flagged' : 'Flag'}
                  </button>

                  {/* Unread count */}
                  {conv.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom sentiment color bar */}
              <div className={cn('h-[5px] w-full', getSentimentBarClass(conv.sentiment, conv.message_type))} />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
