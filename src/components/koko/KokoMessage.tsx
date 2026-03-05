import { KokoAvatar } from './KokoAvatar';
import { ActionChips } from './ActionChips';
import { ToolCallIndicator } from './ToolCallIndicator';
import { DraftPreviewCard } from './DraftPreviewCard';
import { AnalyticsCard } from './AnalyticsCard';
import { renderSimpleMarkdown } from './markdown-utils';
import type { KokoMessage as KokoMessageType, KokoAction } from '@/hooks/useKokoChat';
import { cn } from '@/lib/utils';

interface KokoMessageProps {
  message: KokoMessageType;
  sendMessage: (text: string, action?: KokoAction) => void;
}

export function KokoMessage({ message, sendMessage }: KokoMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2 items-start', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <KokoAvatar size={20} className="text-primary mt-0.5" />
      )}

      <div className={cn(
        'max-w-[85%] rounded-xl px-3 py-2',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-card-foreground border border-border',
      )}>
        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="space-y-1 mb-2">
            {message.tool_calls.map((tc, i) => (
              <ToolCallIndicator
                key={i}
                toolCall={tc}
                result={message.tool_results?.[i]}
              />
            ))}
          </div>
        )}

        {/* Tool result cards */}
        {message.tool_results?.map((tr, i) => {
          if (tr.name === 'generate_draft' || tr.name === 'edit_draft') {
            return (
              <DraftPreviewCard
                key={`draft-${i}`}
                result={tr.result}
              />
            );
          }
          if (tr.name === 'get_analytics' || tr.name === 'analytics_summary') {
            return (
              <AnalyticsCard
                key={`analytics-${i}`}
                result={tr.result}
              />
            );
          }
          return null;
        })}

        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {isUser ? message.content : renderSimpleMarkdown(message.content)}
        </div>

        {/* Action chips */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2">
            <ActionChips actions={message.actions} sendMessage={sendMessage} />
          </div>
        )}
      </div>
    </div>
  );
}
