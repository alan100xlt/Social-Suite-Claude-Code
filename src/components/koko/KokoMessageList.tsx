import { useEffect, useRef } from 'react';
import { KokoMessage as KokoMessageComponent } from './KokoMessage';
import { WelcomeScreen } from './WelcomeScreen';
import { StreamingMessage } from './StreamingMessage';
import type { KokoMessage, KokoAction, ToolCall, ToolResult } from '@/hooks/useKokoChat';

interface KokoMessageListProps {
  messages: KokoMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingToolCalls: ToolCall[];
  streamingToolResults: ToolResult[];
  sendMessage: (text: string, action?: KokoAction) => void;
}

export function KokoMessageList({
  messages,
  isStreaming,
  streamingContent,
  streamingToolCalls,
  streamingToolResults,
  sendMessage,
}: KokoMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return <WelcomeScreen onAction={sendMessage} />;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
    >
      {messages.map(message => (
        <KokoMessageComponent
          key={message.id}
          message={message}
          sendMessage={sendMessage}
        />
      ))}

      {isStreaming && (
        <StreamingMessage
          content={streamingContent}
          toolCalls={streamingToolCalls}
          toolResults={streamingToolResults}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
