import { cn } from '@/lib/utils';

interface SignalScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

export function SignalScoreBadge({ score, size = 'sm' }: SignalScoreBadgeProps) {
  if (!score || score < 3) return null;

  const isHigh = score >= 4;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-semibold rounded-full whitespace-nowrap',
      isHigh
        ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400',
      size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
    )}>
      {'★'} {score}
    </span>
  );
}
