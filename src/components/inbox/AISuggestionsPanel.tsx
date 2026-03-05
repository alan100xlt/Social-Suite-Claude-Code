import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Brain, FileText } from 'lucide-react';
import { SentimentBadge } from './SentimentBadge';
import { useAnalyzeSentiment, useSuggestReply, useSummarizeThread } from '@/hooks/useInboxAI';
import type { InboxConversation } from '@/lib/api/inbox';

interface AISuggestionsPanelProps {
  conversation: InboxConversation;
  onInsertReply: (content: string) => void;
}

export function AISuggestionsPanel({ conversation, onInsertReply }: AISuggestionsPanelProps) {
  const analyzeSentiment = useAnalyzeSentiment();
  const suggestReply = useSuggestReply();
  const summarizeThread = useSummarizeThread();

  const [suggestions, setSuggestions] = useState<Array<{ tone: string; content: string; label: string }>>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [sentimentResult, setSentimentResult] = useState<{ sentiment: string; confidence: number; topics: string[] } | null>(null);

  const handleAnalyze = async () => {
    const result = await analyzeSentiment.mutateAsync(conversation.id);
    setSentimentResult(result.analysis);
  };

  const handleSuggest = async () => {
    const result = await suggestReply.mutateAsync(conversation.id);
    setSuggestions(result.suggestions || []);
  };

  const handleSummarize = async () => {
    const result = await summarizeThread.mutateAsync(conversation.id);
    setSummary(result.summary);
  };

  const isLoading = analyzeSentiment.isPending || suggestReply.isPending || summarizeThread.isPending;

  return (
    <div className="border-b bg-muted/30 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">AI Assistant</span>

        <div className="flex items-center gap-1 ml-auto">
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
            {suggestReply.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
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
      </div>

      {/* Sentiment result */}
      {sentimentResult && (
        <div className="flex items-center gap-2 mb-2">
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
        <div className="text-xs text-muted-foreground bg-background/80 rounded-md p-2 mb-2">
          {summary}
        </div>
      )}

      {/* Suggested replies */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onInsertReply(suggestion.content)}
              className="flex-shrink-0 max-w-[200px] text-left p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="secondary" className="text-[9px] px-1">{suggestion.tone}</Badge>
                <span className="text-[10px] text-muted-foreground">{suggestion.label}</span>
              </div>
              <p className="text-xs line-clamp-2">{suggestion.content}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
