import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import type { ReactionSummary } from '@/hooks/useMessageReactions';
import { REACTION_EMOJIS } from '@/hooks/useMessageReactions';

interface MessageReactionsProps {
  messageId: string;
  reactions: ReactionSummary[];
  onToggle: (messageId: string, emoji: string, hasReacted: boolean) => void;
}

export function MessageReactions({ messageId, reactions, onToggle }: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map((r) => (
        <Tip key={r.emoji} label={r.users.map(u => u.name).join(', ')}>
          <button
            onClick={() => onToggle(messageId, r.emoji, r.hasReacted)}
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
              r.hasReacted
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted/50 border-border hover:bg-muted'
            )}
          >
            <span>{r.emoji}</span>
            <span className="font-medium text-[10px]">{r.count}</span>
          </button>
        </Tip>
      ))}
      <ReactionPicker messageId={messageId} onSelect={(emoji) => onToggle(messageId, emoji, false)} />
    </div>
  );
}

export function ReactionPicker({
  messageId,
  onSelect,
}: {
  messageId: string;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
          <SmilePlus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" align="start" side="top">
        <div className="flex items-center gap-0.5">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
