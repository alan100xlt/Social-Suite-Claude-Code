import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Send, StickyNote, Loader2, Paperclip, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxMessage } from '@/lib/api/inbox';

interface MessageComposerProps {
  onSend: (content: string, mediaUrl?: string) => void;
  onAddNote?: (content: string) => void;
  isSending?: boolean;
  placeholder?: string;
  conversationType?: 'comment' | 'dm' | 'review' | 'mention';
  replyTo?: InboxMessage | null;
  onCancelReply?: () => void;
  onSlashTrigger?: () => void;
  defaultContent?: string;
}

export function MessageComposer({
  onSend,
  onAddNote,
  isSending,
  placeholder,
  conversationType,
  replyTo,
  onCancelReply,
  onSlashTrigger,
  defaultContent,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Pre-fill from AI suggestions or external source
  useEffect(() => {
    if (defaultContent) {
      setContent(defaultContent);
      textareaRef.current?.focus();
    }
  }, [defaultContent]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    if (isNoteMode && onAddNote) {
      onAddNote(trimmed);
    } else {
      onSend(trimmed, mediaUrl || undefined);
    }
    setContent('');
    setMediaUrl('');
    setShowAttachment(false);
    setIsNoteMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Trigger canned reply picker on "/" at start of input or after a space
    if (onSlashTrigger && value.endsWith('/') && (value.length === 1 || value.charAt(value.length - 2) === ' ')) {
      onSlashTrigger();
    }
  };

  const defaultPlaceholder = conversationType === 'dm'
    ? 'Type a message...'
    : conversationType === 'comment'
    ? 'Reply to comment...'
    : 'Type a reply...';

  return (
    <div className="border-t bg-background p-3 space-y-2">
      {/* Reply-to indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md text-xs">
          <span className="text-muted-foreground">Replying to</span>
          <span className="font-medium truncate flex-1">
            {replyTo.contact?.display_name || 'message'}: {replyTo.content.slice(0, 60)}
            {replyTo.content.length > 60 ? '...' : ''}
          </span>
          {onCancelReply && (
            <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {isNoteMode && (
        <div className="flex items-center gap-2 px-1">
          <StickyNote className="h-3 w-3 text-yellow-600" />
          <span className="text-xs text-yellow-600 font-medium">Adding internal note (not visible to contact)</span>
        </div>
      )}

      {/* Attachment URL input */}
      {showAttachment && (
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Paste media URL..."
            className="h-7 text-xs flex-1"
          />
          <button onClick={() => { setMediaUrl(''); setShowAttachment(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isNoteMode ? 'Add internal note...' : placeholder || defaultPlaceholder}
          className={cn(
            'min-h-[40px] max-h-[120px] resize-none text-sm',
            isNoteMode && 'border-yellow-500/30 bg-yellow-500/5'
          )}
          rows={1}
        />

        <div className="flex gap-1 flex-shrink-0">
          {/* Attachment button */}
          {!isNoteMode && conversationType === 'dm' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowAttachment(!showAttachment)}
              title="Add media URL"
            >
              <Paperclip className={cn('h-4 w-4', showAttachment && 'text-primary')} />
            </Button>
          )}

          {onAddNote && (
            <Button
              variant={isNoteMode ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsNoteMode(!isNoteMode)}
              title="Internal note"
            >
              <StickyNote className={cn('h-4 w-4', isNoteMode && 'text-yellow-600')} />
            </Button>
          )}

          <Button
            size="icon"
            className="h-9 w-9"
            onClick={handleSubmit}
            disabled={!content.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
