import { useMemo } from "react";
import { ResponsiveRadialBar } from "@nivo/radial-bar";
import {
  buildPremiumTheme,
  getPremiumSeries,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface GaugeDatum {
  id: string;
  data: { x: string; y: number }[];
}

interface GaugeWidgetProps {
  title: string;
  subtitle?: string;
  data: GaugeDatum[];
  height?: number;
  maxValue?: number;
}

export function GaugeWidget({
  title,
  subtitle,
  data,
  height = 300,
  maxValue = 100,
}: GaugeWidgetProps) {
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
        <ResponsiveRadialBar
          data={data}
          theme={theme}
          maxValue={maxValue}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          padding={0.3}
          innerRadius={0.3}
          cornerRadius={4}
          colors={premiumSeries}
          tracksColor="hsl(var(--muted) / 0.3)"
          enableRadialGrid={false}
          enableCircularGrid={false}
          radialAxisStart={null}
          circularAxisOuter={null}
          labelsSkipAngle={15}
          labelsTextColor={{ from: "color", modifiers: [["darker", 1.8]] }}
          tooltip={({ bar }) => (
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: bar.color, boxShadow: `0 0 6px ${bar.color}50` }}
                />
                <span className="text-xs text-muted-foreground">{bar.category}</span>
                <span className="font-bold text-foreground ml-2" style={kpiTypography.medium}>
                  {formatMetric(bar.value)}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </ChartCard>
  );
}
