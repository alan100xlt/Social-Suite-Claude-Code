import { usePlatformSparklines } from '@/hooks/usePlatformSparklines';
import { getAvailableMetrics, METRIC_LABELS, type MetricType } from '@/lib/platform-metrics';
import type { Platform } from '@/lib/api/getlate';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  platform: Platform;
}

function MiniSparkline({ data, label }: { data: number[]; label: string }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  const w = 80;
  const h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const trending = data[data.length - 1] >= data[0];
  const strokeColor = trending ? '#22c55e' : '#ef4444';
  const fillColor = trending ? '#22c55e10' : '#ef444410';
  const areaPath = `M${coords[0].x},${h} ${coords.map((c) => `L${c.x},${c.y}`).join(' ')} L${coords[coords.length - 1].x},${h} Z`;

  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <svg width={w} height={h} className="shrink-0">
        <path d={areaPath} fill={fillColor} />
        <polyline
          points={polyline}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={2.5}
          fill={strokeColor}
        />
      </svg>
    </div>
  );
}

export function PlatformSparklineDetail({ platform }: Props) {
  const { data: sparklines, isLoading } = usePlatformSparklines(platform);
  const availableMetrics = getAvailableMetrics(platform);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-6 py-4">
        {Array.from({ length: Math.min(availableMetrics.length, 8) }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sparklines || availableMetrics.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        No trend data available for this platform.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-l-2 border-l-emerald-500 bg-muted/20">
      {availableMetrics.map((metric) => (
        <MiniSparkline
          key={metric}
          data={sparklines[metric] ?? []}
          label={METRIC_LABELS[metric]}
        />
      ))}
    </div>
  );
}
