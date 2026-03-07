import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, FileText, RotateCcw, X } from 'lucide-react';
import { ClassificationBadge } from './ClassificationBadge';
import { SignalScoreBadge } from './SignalScoreBadge';
import { useSuggestReplyV2, useSummarizeThread } from '@/hooks/useInboxAI';
import type { InboxConversation } from '@/lib/api/inbox';

interface AISuggestionsPanelProps {
  conversation: InboxConversation;
  onInsertReply: (content: string) => void;
}

export function AISuggestionsPanel({ conversation, onInsertReply }: AISuggestionsPanelProps) {
  const suggestReplyV2 = useSuggestReplyV2();
  const summarizeThread = useSummarizeThread();

  const [replyData, setReplyData] = useState<{
    recommended: { content: string; label: string; reasoning: string };
    alternatives: Array<{ content: string; label: string }>;
    language: string;
    fused_from_canned: boolean;
  } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeAltIndex, setActiveAltIndex] = useState<number | null>(null);
  const lastRequestedId = useRef<string | null>(null);

  // Auto-generate reply suggestion when conversation changes
  useEffect(() => {
    setReplyData(null);
    setSummary(null);
    setActiveAltIndex(null);
    lastRequestedId.current = conversation.id;

    // Auto-fire reply suggestion
    suggestReplyV2.mutateAsync(conversation.id)
      .then((result) => {
        // Only apply if we're still on the same conversation
        if (lastRequestedId.current !== conversation.id) return;
        setReplyData(result);
        // Auto-fill the composer with the recommended reply
        if (result.recommended?.content) {
          onInsertReply(result.recommended.content);
        }
      })
      .catch(() => {
        // Silently fail — user can still type manually
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const handleRegenerate = async () => {
    setReplyData(null);
    setActiveAltIndex(null);
    try {
      const result = await suggestReplyV2.mutateAsync(conversation.id);
      setReplyData(result);
      if (result.recommended?.content) {
        onInsertReply(result.recommended.content);
      }
    } catch {
      // silently fail
    }
  };

  const handleSummarize = async () => {
    try {
      const result = await summarizeThread.mutateAsync(conversation.id);
      setSummary(result.summary);
    } catch {
      // silently fail
    }
  };

  const handleSelectAlternative = (content: string, index: number) => {
    setActiveAltIndex(index);
    onInsertReply(content);
  };

  const handleSelectRecommended = () => {
    if (!replyData?.recommended?.content) return;
    setActiveAltIndex(null);
    onInsertReply(replyData.recommended.content);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="border-b px-4 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50/50 dark:bg-violet-500/5 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex items-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" /> AI Assistant
      </button>
    );
  }

  return (
    <div className="border-t border-b border-violet-200 dark:border-violet-500/20 bg-gradient-to-r from-violet-50/50 to-violet-50/30 dark:from-violet-500/5 dark:to-transparent">
      {/* Header row */}
      <div className="flex items-center gap-2 px-6 pt-3 pb-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">AI Draft</span>

        {/* Classification display */}
        {conversation.message_type && (
          <div className="flex items-center gap-1.5 ml-1">
            <ClassificationBadge category={conversation.message_type} />
            <SignalScoreBadge score={conversation.editorial_value} />
            {conversation.detected_language && conversation.detected_language !== 'en' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                {conversation.detected_language}
              </Badge>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Summarize (optional) */}
          <button
            onClick={handleSummarize}
            disabled={summarizeThread.isPending}
            className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-violet-100/50 dark:hover:bg-violet-500/10 disabled:opacity-50"
          >
            {summarizeThread.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            Summarize
          </button>

          {/* Regenerate */}
          <button
            onClick={handleRegenerate}
            disabled={suggestReplyV2.isPending}
            className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-violet-100/50 dark:hover:bg-violet-500/10 disabled:opacity-50"
          >
            {suggestReplyV2.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Regenerate
          </button>

          <button
            onClick={() => setCollapsed(true)}
            className="text-violet-400 hover:text-violet-600 transition-colors p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {suggestReplyV2.isPending && !replyData && (
        <div className="flex items-center gap-2 px-6 pb-3 text-[11px] text-violet-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="font-medium">Drafting a reply...</span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mx-6 mb-2 text-xs text-muted-foreground bg-background/80 rounded-md p-2.5 border">
          {summary}
        </div>
      )}

      {/* Alternative tone chips — shown once reply is generated */}
      {replyData && replyData.alternatives.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 pb-2.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground mr-0.5">Tone:</span>
          <button
            onClick={handleSelectRecommended}
            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors ${
              activeAltIndex === null
                ? 'bg-violet-600 text-white'
                : 'border border-violet-200 dark:border-violet-500/30 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10'
            }`}
          >
            {replyData.recommended.label}
          </button>
          {replyData.alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => handleSelectAlternative(alt.content, i)}
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors ${
                activeAltIndex === i
                  ? 'bg-violet-600 text-white'
                  : 'border border-violet-200 dark:border-violet-500/30 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10'
              }`}
            >
              {alt.label}
            </button>
          ))}
          {replyData.fused_from_canned && (
            <span className="text-[10px] text-violet-400 ml-1">from canned reply</span>
          )}
        </div>
      )}

      {/* Reasoning (subtle) */}
      {replyData?.recommended?.reasoning && (
        <div className="px-6 pb-2.5">
          <p className="text-[10px] text-muted-foreground italic">{replyData.recommended.reasoning}</p>
        </div>
      )}
    </div>
  );
}
