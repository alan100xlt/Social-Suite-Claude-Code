import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  result: Record<string, unknown>;
}

export function AnalyticsCard({ result }: AnalyticsCardProps) {
  const period = (result.period as string) || 'Recent';
  const totalReach = result.total_reach as number | undefined;
  const engagementRate = result.engagement_rate as number | undefined;
  const topPlatform = result.top_platform as string | undefined;

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className={cn(
      'rounded-lg border border-border',
      'bg-muted/30 p-3 my-2',
    )}>
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Analytics Summary</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{period}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {totalReach != null && (
          <div>
            <p className="text-[10px] text-muted-foreground">Total Reach</p>
            <p className="text-sm font-semibold">{formatNumber(totalReach)}</p>
          </div>
        )}

        {engagementRate != null && (
          <div>
            <p className="text-[10px] text-muted-foreground">Engagement</p>
            <p className="text-sm font-semibold">{engagementRate.toFixed(1)}%</p>
          </div>
        )}

        {topPlatform && (
          <div>
            <p className="text-[10px] text-muted-foreground">Top Platform</p>
            <p className="text-sm font-semibold capitalize">{topPlatform}</p>
          </div>
        )}
      </div>
    </div>
  );
}
