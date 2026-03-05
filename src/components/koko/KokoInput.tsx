import { useState, useRef, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KokoInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
}

export function KokoInput({ onSend, isStreaming }: KokoInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !isStreaming;

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 4 * 24; // 4 rows * ~24px line height
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="border-t border-border px-3 py-3 shrink-0">
      <div className={cn(
        'flex items-end gap-2',
        'rounded-xl border border-border',
        'bg-muted/30',
        'px-3 py-2',
        'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
        'transition-all',
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Koko anything..."
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none',
            'min-h-[24px]',
          )}
          disabled={isStreaming}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex items-center justify-center',
            'h-7 w-7 rounded-lg shrink-0',
            'transition-all',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground/40',
          )}
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center mt-1.5">
        Koko can make mistakes. Review important information.
      </p>
    </div>
  );
}
