import { useKoko } from '@/contexts/KokoContext';
import { useKokoChat } from '@/hooks/useKokoChat';
import { KokoHeader } from './KokoHeader';
import { KokoMessageList } from './KokoMessageList';
import { KokoInput } from './KokoInput';
import { cn } from '@/lib/utils';

export function KokoCopilot() {
  const { isOpen, close, activeThreadId } = useKoko();
  const {
    messages,
    isStreaming,
    sendMessage,
    streamingContent,
    streamingToolCalls,
    streamingToolResults,
  } = useKokoChat(activeThreadId);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[420px] max-w-[100vw]',
          'flex flex-col',
          'bg-background/95 backdrop-blur-xl',
          'border-l border-border',
          'shadow-2xl',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="Koko AI Copilot"
        aria-hidden={!isOpen}
      >
        <KokoHeader />

        <KokoMessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          streamingToolCalls={streamingToolCalls}
          streamingToolResults={streamingToolResults}
          sendMessage={sendMessage}
        />

        <KokoInput
          onSend={sendMessage}
          isStreaming={isStreaming}
        />
      </div>
    </>
  );
}
