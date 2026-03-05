import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import {
  buildPremiumTheme,
  premiumColors,
  getPremiumSeries,
  makeAreaGradient,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatSparklineWidgetProps {
  title: string;
  value: string | number;
  change?: number;
  changeSuffix?: string;
  sparklineData?: { x: string; y: number }[];
  color?: string;
  icon?: React.ReactNode;
  secondaryLabel?: string;
  secondaryValue?: string | number;
  chartType?: "line" | "bar";
  timeframeLabel?: string;
}

export function StatSparklineWidget({
  title,
  value,
  change,
  changeSuffix = "%",
  sparklineData = [],
  color = premiumColors.deepPurple,
  icon,
  secondaryLabel,
  secondaryValue,
  chartType = "line",
  timeframeLabel,
}: StatSparklineWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const changeLabel =
    change !== undefined
      ? `${isPositive ? "+" : ""}${change.toFixed(1)}${changeSuffix}`
      : null;

  const lineData =
    sparklineData.length > 0 ? [{ id: "spark", data: sparklineData }] : [];

  const barData = sparklineData.map((d, i) => ({
    x: i.toString(),
    value: d.y,
  }));

  const gradientDef = useMemo(() => makeAreaGradient("sparkGrad", color, 0.4), [color]);

  // Compute color end for accent gradient
  const series = getPremiumSeries();
  const colorIdx = series.indexOf(color);
  const accentEnd = colorIdx >= 0 ? series[(colorIdx + 1) % series.length] : undefined;

  return (
    <ChartCard
      noPadding
      accentColor={color}
      accentColorEnd={accentEnd}
      className="flex flex-col"
      timeframeLabel={timeframeLabel}
    >
      {/* Title row */}
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <span style={kpiTypography.label} className="text-muted-foreground">
          {title}
        </span>
        {icon && (
          <span className="text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
            {icon}
          </span>
        )}
      </div>

      {/* Sparkline chart */}
      {sparklineData.length > 0 && (
        <div className="w-full h-16 px-1 opacity-75 hover:opacity-100 transition-opacity duration-300">
          {chartType === "line" ? (
            <ResponsiveLine
              data={lineData}
              theme={theme}
              margin={{ top: 6, right: 4, bottom: 4, left: 4 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="natural"
              enableArea
              areaOpacity={1}
              enableGridX={false}
              enableGridY={false}
              enablePoints={false}
              isInteractive={false}
              axisTop={null}
              axisRight={null}
              axisBottom={null}
              axisLeft={null}
              colors={[color]}
              lineWidth={2.5}
              defs={[gradientDef]}
              fill={[{ match: "*", id: "sparkGrad" }]}
            />
          ) : (
            <ResponsiveBar
              data={barData}
              theme={theme}
              margin={{ top: 6, right: 4, bottom: 4, left: 4 }}
              keys={["value"]}
              indexBy="x"
              colors={[color]}
              enableGridX={false}
              enableGridY={false}
              axisBottom={null}
              axisLeft={null}
              enableLabel={false}
              isInteractive={false}
              borderRadius={3}
              padding={0.25}
              innerPadding={1}
            />
          )}
        </div>
      )}

      {/* KPI values */}
      <div className="px-5 pt-3 pb-5 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span
            className="text-foreground tracking-tight"
            style={kpiTypography.large}
          >
            {formatMetric(value)}
          </span>
          {changeLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 w-fit",
                "backdrop-blur-sm",
                isPositive && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
                isNegative && "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
                !isPositive && !isNegative && "bg-muted/80 text-muted-foreground"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {changeLabel}
            </span>
          )}
        </div>

        {secondaryValue !== undefined && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-foreground" style={kpiTypography.medium}>
              {formatMetric(secondaryValue)}
            </span>
            {secondaryLabel && (
              <span className="text-[11px] text-muted-foreground">{secondaryLabel}</span>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
