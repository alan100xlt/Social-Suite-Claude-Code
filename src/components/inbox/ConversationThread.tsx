import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ThreadedMessages } from './ThreadedMessages';
import type { InboxMessage } from '@/lib/api/inbox';

interface ConversationThreadProps {
  messages: InboxMessage[];
  isLoading?: boolean;
  onReplyToMessage?: (message: InboxMessage) => void;
}

export function ConversationThread({ messages, isLoading, onReplyToMessage }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 1 && 'justify-end')}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            <div className="space-y-1">
              <Skeleton className="h-16 w-64 rounded-lg" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No messages in this conversation
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: InboxMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                {format(new Date(group.date), 'MMM d, yyyy')}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <ThreadedMessages
              messages={group.messages}
              onReply={onReplyToMessage}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
