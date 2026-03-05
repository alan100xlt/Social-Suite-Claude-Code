import { Badge } from '@/components/ui/badge';
import type { Sentiment } from '@/lib/api/inbox';

interface SentimentBadgeProps {
  sentiment: Sentiment | null;
  className?: string;
}

const sentimentStyles: Record<string, string> = {
  positive: 'text-green-500 border-green-500/30',
  negative: 'text-red-500 border-red-500/30',
  neutral: 'text-muted-foreground',
};

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  if (!sentiment) return null;

  return (
    <Badge
      variant="outline"
      className={`${sentimentStyles[sentiment] || ''} ${className || ''}`}
    >
      {sentiment}
    </Badge>
  );
}
