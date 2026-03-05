import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StickyNote, Bot, Reply, Download, Play, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import type { InboxMessage } from '@/lib/api/inbox';

interface ChatBubbleProps {
  message: InboxMessage;
  onReply?: (message: InboxMessage) => void;
}

export function ChatBubble({ message, onReply }: ChatBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isAgent = message.sender_type === 'agent';
  const isBot = message.sender_type === 'bot';
  const isNote = message.is_internal_note;
  const isSystem = message.sender_type === 'system' && !isNote;
  const contactName = message.contact?.display_name || message.contact?.username || 'Unknown';
  const initials = isAgent ? 'You' : isBot ? 'AI' : contactName.slice(0, 2).toUpperCase();

  // System message (status change, etc.)
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Internal note
  if (isNote) {
    return (
      <div className="mx-auto max-w-md">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <StickyNote className="h-3 w-3 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">Internal Note</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const isOutbound = isAgent || isBot;

  return (
    <>
      <div className={cn('group flex gap-3 max-w-[80%]', isOutbound && 'ml-auto flex-row-reverse')}>
        {!isOutbound && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={message.contact?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        )}

        <div className={cn('space-y-1', isOutbound && 'items-end')}>
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm relative',
              isAgent ? 'bg-primary text-primary-foreground' :
              isBot ? 'bg-blue-500/10 border border-blue-500/20' :
              'bg-muted'
            )}
          >
            {/* Sender name */}
            {!isOutbound && (
              <p className="text-xs font-medium mb-1 opacity-70">{contactName}</p>
            )}
            {isBot && (
              <div className="flex items-center gap-1 mb-1">
                <Bot className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-medium text-blue-500">Auto-reply</span>
              </div>
            )}

            {/* Text content */}
            {message.content && (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Media rendering */}
            {message.media_url && (
              <div className="mt-2">
                {message.content_type === 'video' ? (
                  <div
                    className="relative w-48 h-32 bg-black/10 rounded overflow-hidden cursor-pointer"
                    onClick={() => window.open(message.media_url!, '_blank')}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white/80" />
                    </div>
                    <img
                      src={message.media_url}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover opacity-50"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : message.content_type === 'attachment' ? (
                  <a
                    href={message.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs p-2 bg-background/50 rounded border hover:bg-accent/50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span className="truncate">Download attachment</span>
                  </a>
                ) : (
                  <img
                    src={message.media_url}
                    alt="Attachment"
                    className="rounded max-w-xs max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxOpen(true)}
                  />
                )}
              </div>
            )}

            {/* Reply button (on hover) */}
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="absolute -top-2 right-1 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-background border shadow-sm hover:bg-accent"
              >
                <Reply className="h-3 w-3" />
              </button>
            )}
          </div>

          <p className={cn('text-[10px] text-muted-foreground', isOutbound && 'text-right')}>
            {format(new Date(message.created_at), 'HH:mm')}
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && message.media_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={message.media_url}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
