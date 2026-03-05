import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Mail, Star, AtSign } from 'lucide-react';
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { formatDistanceToNow } from 'date-fns';
import type { InboxConversation, ConversationType } from '@/lib/api/inbox';

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

const platformColors: Record<string, string> = {
  instagram: 'text-pink-500',
  twitter: 'text-sky-500',
  facebook: 'text-blue-600',
  linkedin: 'text-blue-700',
  tiktok: 'text-foreground',
  youtube: 'text-red-500',
  bluesky: 'text-sky-400',
  threads: 'text-foreground',
};

const typeIcons: Record<ConversationType, React.ElementType> = {
  comment: MessageSquare,
  dm: Mail,
  review: Star,
  mention: AtSign,
};

interface ConversationListProps {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  selectedIds,
  onToggleSelect,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
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
      <div className="p-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
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
      <div ref={listRef} className="divide-y divide-border" tabIndex={0} role="listbox">
        {conversations.map((conv) => {
          const PlatformIcon = platformIcons[conv.platform] || MessageSquare;
          const platformColor = platformColors[conv.platform] || 'text-muted-foreground';
          const TypeIcon = typeIcons[conv.type] || MessageSquare;
          const isSelected = conv.id === selectedId;
          const isChecked = selectedIds?.has(conv.id) ?? false;
          const isUnread = conv.unread_count > 0;
          const contactName = conv.contact?.display_name || conv.contact?.username || conv.subject || 'Unknown';
          const initials = contactName.slice(0, 2).toUpperCase();

          return (
            <div
              key={conv.id}
              role="option"
              aria-selected={isSelected}
              className={cn(
                'relative flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 cursor-pointer',
                isSelected && 'bg-accent',
                isUnread && !isSelected && 'bg-accent/20',
                isUnread && 'border-l-2 border-l-primary',
              )}
            >
              {/* Bulk select checkbox */}
              {onToggleSelect && (
                <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggleSelect(conv.id)}
                    className="h-4 w-4"
                  />
                </div>
              )}

              <button
                onClick={() => onSelect(conv.id)}
                className="flex items-start gap-3 flex-1 min-w-0 text-left"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.contact?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background', platformColor)}>
                    <PlatformIcon className="h-3 w-3" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm truncate', isUnread ? 'font-semibold' : 'font-medium')}>
                      {contactName}
                    </span>
                    <TypeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    {conv.labels?.map(({ label }) => (
                      <span
                        key={label.id}
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                        title={label.name}
                      />
                    ))}
                  </div>

                  <p className={cn('text-xs truncate mt-0.5', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
                    {conv.last_message_preview || 'No messages yet'}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </span>
                    {conv.status !== 'open' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {conv.status}
                      </Badge>
                    )}
                    {conv.priority === 'high' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">!</Badge>
                    )}
                    {conv.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">!!</Badge>
                    )}
                    {isUnread && conv.unread_count > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
