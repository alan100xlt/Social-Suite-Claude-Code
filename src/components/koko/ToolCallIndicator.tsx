import { Loader2, CheckCircle2 } from 'lucide-react';
import type { ToolCall, ToolResult } from '@/hooks/useKokoChat';
import { cn } from '@/lib/utils';

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
  result?: ToolResult;
}

const TOOL_LABELS: Record<string, string> = {
  generate_draft: 'Generating draft',
  edit_draft: 'Editing draft',
  get_analytics: 'Fetching analytics',
  analytics_summary: 'Analyzing metrics',
  search_content: 'Searching content',
  get_brand_voice: 'Loading brand voice',
  schedule_post: 'Scheduling post',
};

export function ToolCallIndicator({ toolCall, result }: ToolCallIndicatorProps) {
  const isDone = !!result;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;

  return (
    <div className={cn(
      'flex items-center gap-2 py-1 px-2 rounded-md text-xs',
      'bg-muted/50 text-muted-foreground',
    )}>
      {isDone ? (
        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      )}
      <span>{label}{isDone ? '' : '...'}</span>
    </div>
  );
}
