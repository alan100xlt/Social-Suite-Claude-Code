import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Bot, Check, Paperclip, ExternalLink } from 'lucide-react';
import type { InboxMessage, InboxConversation } from '@/lib/api/inbox';

interface ConversationThreadProps {
  messages: InboxMessage[];
  isLoading?: boolean;
  onReplyToMessage?: (message: InboxMessage) => void;
  conversation?: InboxConversation | null;
}

export function ConversationThread({ messages, isLoading, onReplyToMessage, conversation }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 1 && 'justify-end')}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            <div className="space-y-1">
              <Skeleton className="h-16 w-64 rounded-2xl" />
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

  const isCommentThread = conversation?.type === 'comment';

  return (
    <ScrollArea className="h-full">
      <div className={cn('p-6 space-y-4', isCommentThread ? 'bg-muted/30' : 'bg-muted/20')}>
        {/* Comment thread: post reference bar */}
        {isCommentThread && conversation?.post_url && (
          <a
            href={conversation.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 -mx-2 mb-2 rounded-lg bg-background border hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground leading-relaxed truncate">
                <span className="font-semibold text-foreground">{conversation.article_title || 'Social Post'}</span>
                {' · '}
                {conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1)}
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 flex-shrink-0">
              View post <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </a>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap px-4 py-1.5 bg-background rounded-full border">
                {format(new Date(group.date), 'MMMM d, yyyy')}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            <div className="space-y-5">
              {group.messages.map((msg) => (
                isCommentThread
                  ? <CommentBubble key={msg.id} message={msg} onReply={onReplyToMessage} />
                  : <DMBubble key={msg.id} message={msg} onReply={onReplyToMessage} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

// ─── DM Bubble (chat-style) ─────────────────────────────────

function DMBubble({ message, onReply }: { message: InboxMessage; onReply?: (m: InboxMessage) => void }) {
  const isAgent = message.sender_type === 'agent';
  const isBot = message.sender_type === 'bot';
  const isNote = message.is_internal_note;
  const isSystem = message.sender_type === 'system' && !isNote;
  const isOutbound = isAgent || isBot;
  const contactName = message.contact?.display_name || message.contact?.username || 'Unknown';
  const initials = isAgent ? 'You' : isBot ? 'AI' : contactName.slice(0, 2).toUpperCase();

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border">
          {message.content}
        </span>
      </div>
    );
  }

  // Internal note
  if (isNote) {
    return (
      <div className="mx-auto max-w-md">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-yellow-600">Internal Note</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group flex gap-3 max-w-[70%]', isOutbound && 'ml-auto flex-row-reverse')}>
      {/* Avatar */}
      {!isOutbound && (
        <div className="h-[34px] w-[34px] rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
          {initials}
        </div>
      )}
      {isOutbound && !isBot && (
        <div className="h-[34px] w-[34px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
          {initials}
        </div>
      )}
      {isBot && (
        <div className="h-[34px] w-[34px] rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
          AI
        </div>
      )}

      <div className="flex flex-col gap-1">
        {/* Sender + sentiment */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold text-muted-foreground">{isAgent ? 'You' : contactName}</span>
        </div>

        {/* Bubble */}
        <div className={cn(
          'px-4 py-3 text-[13.5px] leading-relaxed break-words',
          isAgent
            ? 'bg-primary text-primary-foreground rounded-[18px_18px_4px_18px]'
            : isBot
              ? 'bg-violet-50 dark:bg-violet-500/10 border-[1.5px] border-dashed border-violet-300 dark:border-violet-500/30 rounded-[18px_18px_4px_18px] text-foreground'
              : 'bg-background border rounded-[18px_18px_18px_4px]'
        )}>
          {isBot && (
            <div className="flex items-center gap-1 mb-1.5">
              <Bot className="h-3 w-3 text-violet-600" />
              <span className="text-[10px] font-bold tracking-wide text-violet-600 uppercase">Auto-reply</span>
            </div>
          )}

          {message.content ? (
            <p className="whitespace-pre-wrap">
              {linkifyText(message.content)}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
              <Paperclip className="h-3.5 w-3.5" /> Image attachment
            </div>
          )}

          {message.media_url && (
            <div className="mt-2">
              <img
                src={message.media_url}
                alt="Attachment"
                className="rounded-lg max-w-xs max-h-48 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Timestamp + delivery status */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <span>{format(new Date(message.created_at), 'HH:mm')}</span>
          {isBot && (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <Check className="h-3 w-3" /><Check className="h-3 w-3 -ml-1.5" /> Delivered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Bubble (Facebook-style) ────────────────────────

function CommentBubble({ message, onReply }: { message: InboxMessage; onReply?: (m: InboxMessage) => void }) {
  const isAgent = message.sender_type === 'agent';
  const isBot = message.sender_type === 'bot';
  const isPageResponse = isAgent || isBot;
  const contactName = message.contact?.display_name || message.contact?.username || 'Unknown';
  const initials = isPageResponse ? 'DJ' : contactName.slice(0, 2).toUpperCase();

  if (message.is_internal_note) {
    return (
      <div className="mx-auto max-w-md">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-yellow-600">Internal Note</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 mb-3.5">
      <div className={cn(
        'h-[34px] w-[34px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
        isPageResponse
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
          : 'bg-gradient-to-br from-green-100 to-green-200 text-green-800'
      )}>
        {initials}
      </div>

      <div className="flex-1">
        <div className={cn(
          'inline-block px-3.5 py-2.5 rounded-[18px] text-[13.5px] leading-relaxed max-w-full',
          isPageResponse
            ? 'bg-primary/5 border border-primary/20'
            : 'bg-muted'
        )}>
          <span className="font-bold text-[13px] mr-1">{isPageResponse ? 'Page' : contactName}</span>
          {message.content ? linkifyText(message.content) : <em className="text-muted-foreground">No content</em>}
        </div>

        <div className="flex items-center gap-3 px-3.5 mt-1 text-[11.5px] font-semibold text-muted-foreground">
          <button className="hover:underline hover:text-foreground transition-colors" onClick={() => {}}>Like</button>
          {onReply && (
            <button className="hover:underline hover:text-foreground transition-colors" onClick={() => onReply(message)}>Reply</button>
          )}
          {isPageResponse && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">PAGE</span>
          )}
          <span>{format(new Date(message.created_at), 'h:mm a')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
