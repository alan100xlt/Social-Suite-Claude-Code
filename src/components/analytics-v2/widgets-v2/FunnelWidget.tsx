import { useMemo } from "react";
import { ResponsiveFunnel } from "@nivo/funnel";
import {
  buildPremiumTheme,
  getPremiumSeries,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface FunnelDatum {
  id: string;
  label: string;
  value: number;
}

interface FunnelWidgetProps {
  title: string;
  subtitle?: string;
  data: FunnelDatum[];
  height?: number;
}

export function FunnelWidget({
  title,
  subtitle,
  data,
  height = 320,
}: FunnelWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const premiumSeries = useMemo(() => getPremiumSeries(), []);

  return (
    <ChartCard noPadding>
      <div className="px-6 pt-6 pb-3">
        <h3
          className="text-base font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="px-4 pb-4" style={{ height }}>
        <ResponsiveFunnel
          data={data}
          theme={theme}
          margin={{ top: 12, right: 24, bottom: 12, left: 24 }}
          shapeBlending={0.7}
          colors={premiumSeries}
          borderWidth={0}
          enableLabel
          labelColor={{ from: "color", modifiers: [["darker", 2]] }}
          currentPartSizeExtension={12}
          currentBorderWidth={24}
          animate={false}
          tooltip={({ part }) => (
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: part.color, boxShadow: `0 0 6px ${part.color}50` }}
                />
                <span className="text-xs text-muted-foreground">{part.data.label}</span>
                <span className="font-bold text-foreground ml-2" style={kpiTypography.medium}>
                  {formatMetric(part.data.value)}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </ChartCard>
  );
}
