import { useDashboardTrends, TrendData } from "@/hooks/useDashboardTrends";
import { Users, TrendingUp, Eye, FileText, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(n < 10 && n > 0 ? 2 : 0);
};

interface MetricCardProps {
  title: string;
  icon: React.ElementType;
  trend: TrendData;
  formatter?: (n: number) => string;
  suffix?: string;
}

function MetricCard({ title, icon: Icon, trend, formatter, suffix = "" }: MetricCardProps) {
  const fmt = formatter || formatNumber;
  const ArrowIcon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  const changeColor = trend.direction === "up" ? "text-success" : trend.direction === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-xl font-display font-bold text-card-foreground tabular-nums">
        {fmt(trend.current)}{suffix}
      </div>
      <div className={cn("flex items-center gap-1 mt-1", changeColor)}>
        <ArrowIcon className="w-3 h-3" />
        <span className="text-xs font-medium tabular-nums">
          {Math.abs(trend.changePercent).toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground ml-0.5">vs last week</span>
      </div>
    </div>
  );
}

export function TrendMetrics() {
  const trends = useDashboardTrends();

  if (trends.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-6 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard title="Followers" icon={Users} trend={trends.followers} />
      <MetricCard
        title="Engagement Rate"
        icon={TrendingUp}
        trend={trends.engagementRate}
        formatter={(n) => n.toFixed(2)}
        suffix="%"
      />
      <MetricCard title="Reach / Views" icon={Eye} trend={trends.reach} />
      <MetricCard
        title="Posts Published"
        icon={FileText}
        trend={trends.posts}
        formatter={(n) => Math.round(n).toString()}
      />
    </div>
  );
}
