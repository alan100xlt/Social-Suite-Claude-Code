import { Loader2 } from 'lucide-react';
import { KokoAvatar } from './KokoAvatar';
import { ToolCallIndicator } from './ToolCallIndicator';
import { renderSimpleMarkdown } from './markdown-utils';
import type { ToolCall, ToolResult } from '@/hooks/useKokoChat';
import { cn } from '@/lib/utils';

interface StreamingMessageProps {
  content: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

export function StreamingMessage({ content, toolCalls, toolResults }: StreamingMessageProps) {
  return (
    <div className="flex gap-2 items-start">
      <KokoAvatar size={20} className="text-primary mt-0.5" />
      <div className={cn(
        'flex-1 min-w-0 rounded-xl px-3 py-2',
        'bg-card text-card-foreground',
        'border border-border',
      )}>
        {toolCalls.length > 0 && (
          <div className="space-y-1 mb-2">
            {toolCalls.map((tc, i) => (
              <ToolCallIndicator
                key={i}
                toolCall={tc}
                result={toolResults[i]}
              />
            ))}
          </div>
        )}

        {content ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderSimpleMarkdown(content)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Streaming cursor */}
        {content && (
          <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />
        )}
      </div>
    </div>
  );
}
