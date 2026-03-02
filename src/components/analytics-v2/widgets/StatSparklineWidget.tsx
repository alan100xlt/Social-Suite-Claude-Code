import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { buildNivoThemeV2, chartColors } from "@/lib/nivo-theme";
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
  /** Optional secondary label shown under the sparkline */
  secondaryLabel?: string;
  secondaryValue?: string | number;
  /** Chart type: "line" for area chart, "bar" for vertical bar sparkline */
  chartType?: "line" | "bar";
}

function formatValue(v: string | number): string {
  if (typeof v === "string") return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function StatSparklineWidget({
  title,
  value,
  change,
  changeSuffix = "%",
  sparklineData = [],
  color = chartColors.primary,
  icon,
  secondaryLabel,
  secondaryValue,
  chartType = "line",
}: StatSparklineWidgetProps) {
  const theme = useMemo(() => buildNivoThemeV2(), []);

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const changeLabel =
    change !== undefined
      ? `${isPositive ? "+" : ""}${change.toFixed(1)}${changeSuffix}`
      : null;

  const lineData =
    sparklineData.length > 0 ? [{ id: "spark", data: sparklineData }] : [];

  // Prepare data for bar chart
  const barData = sparklineData.map((d, i) => ({
    x: i.toString(),
    value: d.y,
  }));

  return (
    <Card className="relative overflow-hidden p-0 flex flex-col group hover:shadow-lg transition-all duration-200">
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ background: color }}
      />

      {/* Title row */}
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <span className="text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors">
            {icon}
          </span>
        )}
      </div>

      {/* Chart - wider, takes full card width */}
      {sparklineData.length > 0 && (
        <div className="w-full h-16 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {chartType === "line" ? (
            <ResponsiveLine
              data={lineData}
              theme={theme}
              margin={{ top: 6, right: 4, bottom: 4, left: 4 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
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
              lineWidth={2}
              defs={[
                {
                  id: "sparkGrad",
                  type: "linearGradient",
                  colors: [
                    { offset: 0, color, opacity: 0.25 },
                    { offset: 100, color, opacity: 0.02 },
                  ],
                },
              ]}
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
              borderRadius={2}
              padding={0.2}
              innerPadding={0}
            />
          )}
        </div>
      )}

      {/* KPI values */}
      <div className="px-5 pt-3 pb-4 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {formatValue(value)}
          </span>
          {changeLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 w-fit",
                isPositive && "bg-success/10 text-success",
                isNegative && "bg-destructive/10 text-destructive",
                !isPositive && !isNegative && "bg-muted text-muted-foreground"
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

        {/* Optional secondary metric */}
        {secondaryValue !== undefined && (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className="text-lg font-bold text-foreground tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {formatValue(secondaryValue)}
            </span>
            {secondaryLabel && (
              <span className="text-[11px] text-muted-foreground">{secondaryLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
