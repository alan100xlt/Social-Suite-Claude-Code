import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Brain, FileText, Tag, X } from 'lucide-react';
import { ClassificationBadge } from './ClassificationBadge';
import { SignalScoreBadge } from './SignalScoreBadge';
import { SentimentBadge } from './SentimentBadge';
import { useAnalyzeSentiment, useSuggestReplyV2, useSummarizeThread, useClassifyConversation, useTranslateMessage } from '@/hooks/useInboxAI';
import type { InboxConversation } from '@/lib/api/inbox';

interface AISuggestionsPanelProps {
  conversation: InboxConversation;
  onInsertReply: (content: string) => void;
}

export function AISuggestionsPanel({ conversation, onInsertReply }: AISuggestionsPanelProps) {
  const analyzeSentiment = useAnalyzeSentiment();
  const suggestReplyV2 = useSuggestReplyV2();
  const summarizeThread = useSummarizeThread();
  const classifyConversation = useClassifyConversation();
  const translateMessage = useTranslateMessage();

  const [replyData, setReplyData] = useState<{
    recommended: { content: string; label: string; reasoning: string };
    alternatives: Array<{ content: string; label: string }>;
    language: string;
    fused_from_canned: boolean;
  } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [sentimentResult, setSentimentResult] = useState<{ sentiment: string; confidence: number; topics: string[] } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleAnalyze = async () => {
    const result = await analyzeSentiment.mutateAsync(conversation.id);
    setSentimentResult(result.analysis);
  };

  const handleSuggest = async () => {
    const result = await suggestReplyV2.mutateAsync(conversation.id);
    setReplyData(result);
  };

  const handleSummarize = async () => {
    const result = await summarizeThread.mutateAsync(conversation.id);
    setSummary(result.summary);
  };

  const handleClassify = async () => {
    await classifyConversation.mutateAsync(conversation.id);
  };

  const isLoading = analyzeSentiment.isPending || suggestReplyV2.isPending || summarizeThread.isPending || classifyConversation.isPending || translateMessage.isPending;

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
    <div className="border-b bg-gradient-to-r from-violet-50/50 to-violet-50/30 dark:from-violet-500/5 dark:to-transparent">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">AI Assistant</span>

        {/* Classification display */}
        {conversation.message_type && (
          <div className="flex items-center gap-1.5 ml-2">
            <ClassificationBadge category={conversation.message_type} />
            <SignalScoreBadge score={conversation.editorial_value} />
            {conversation.detected_language && conversation.detected_language !== 'en' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                {conversation.detected_language}
              </Badge>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(true)}
          className="ml-auto text-violet-400 hover:text-violet-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-4 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={handleClassify}
          disabled={isLoading}
        >
          {classifyConversation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
          Classify
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={handleAnalyze}
          disabled={isLoading}
        >
          {analyzeSentiment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
          Analyze
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={handleSuggest}
          disabled={isLoading}
        >
          {suggestReplyV2.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Suggest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={handleSummarize}
          disabled={isLoading}
        >
          {summarizeThread.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          Summarize
        </Button>
      </div>

      {/* Sentiment result */}
      {sentimentResult && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <SentimentBadge sentiment={sentimentResult.sentiment as any} />
          <span className="text-[10px] text-muted-foreground">
            {Math.round(sentimentResult.confidence * 100)}% confidence
          </span>
          {sentimentResult.topics?.map((topic, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5">
              {topic}
            </Badge>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mx-4 mb-2 text-xs text-muted-foreground bg-background/80 rounded-md p-2 border">
          {summary}
        </div>
      )}

      {/* Suggested replies (V2 format) */}
      {replyData?.recommended?.content && (
        <div className="px-4 pb-2.5">
          <div className="p-3 rounded-lg bg-background border border-violet-200 dark:border-violet-500/20 border-l-[3px] border-l-violet-500 mb-1.5">
            <p className="text-[13px] leading-relaxed">{replyData.recommended.content}</p>
            {replyData.recommended.reasoning && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">{replyData.recommended.reasoning}</p>
            )}
          </div>
          {replyData.fused_from_canned && (
            <p className="text-[10px] text-violet-500 mb-1.5 px-0.5">Adapted from canned reply</p>
          )}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => onInsertReply(replyData.recommended.content)}
              className="px-3 py-1.5 rounded-full bg-violet-600 text-white text-[11.5px] font-semibold hover:bg-violet-700 transition-colors flex items-center gap-1.5"
            >
              Use: {replyData.recommended.label}
            </button>
            {replyData.alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => onInsertReply(alt.content)}
                className="px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-500/30 text-violet-600 text-[11.5px] font-semibold hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
              >
                {alt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
