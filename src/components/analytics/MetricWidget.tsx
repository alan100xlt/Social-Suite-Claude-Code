/**
 * MetricWidget — Generic component that renders any registered metric.
 *
 * Pass a metric ID + optional config, and it auto-resolves the definition,
 * computes the value, picks the right visualization, and formats everything.
 *
 * Usage:
 * ```tsx
 * <MetricWidget metricId="engagement_rate" />
 * <MetricWidget metricId="virality_score" compact />
 * <MetricWidget metricId="views_per_post" widgetType="sparkline" />
 * ```
 */

import { useMetric } from "@/hooks/useMetric";
import { formatMetricValue, formatChange, evaluateThreshold } from "@/lib/metrics/formatters";
import type { WidgetType } from "@/lib/metrics/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Eye, Heart, Users, Zap, BarChart3, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { ResponsiveLine } from "@nivo/line";
import { nivoTheme } from "@/lib/nivo-theme";
import type { Platform } from "@/lib/api/getlate";

// Icon map for metric definitions
const iconMap: Record<string, React.ElementType> = {
  Eye, Heart, Users, Zap, BarChart3, TrendingUp,
};

interface MetricWidgetProps {
  metricId: string;
  widgetType?: WidgetType;
  compact?: boolean;
  days?: number;
  platform?: Platform;
  className?: string;
  showChange?: boolean;
  showSparkline?: boolean;
  showThreshold?: boolean;
}

export function MetricWidget({
  metricId,
  widgetType,
  compact = false,
  days = 30,
  platform,
  className,
  showChange = true,
  showSparkline = true,
  showThreshold = true,
}: MetricWidgetProps) {
  const { definition, result, isLoading, isError } = useMetric(metricId, { days, platform });

  if (!definition) {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">Unknown metric: {metricId}</p>
        </CardContent>
      </Card>
    );
  }

  const resolvedType = widgetType || definition.defaultWidget;
  const Icon = definition.icon ? iconMap[definition.icon] : BarChart3;
  const formattedValue = formatMetricValue(result.value, definition.format, definition.formatFn);
  const threshold = showThreshold ? evaluateThreshold(result.value, definition.thresholds) : null;
  const changeInfo = result.change !== undefined ? formatChange(result.change) : null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          {showSparkline && <Skeleton className="h-16 w-full" />}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">Failed to load {definition.label}</p>
        </CardContent>
      </Card>
    );
  }

  // ── Stat Widget ──
  if (resolvedType === "stat" || resolvedType === "trend") {
    return (
      <Card className={className}>
        <CardHeader className={cn("flex flex-row items-center justify-between space-y-0", compact ? "pb-1" : "pb-2")}>
          <CardTitle className={cn("font-medium text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {definition.label}
          </CardTitle>
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${definition.color}15` }}
          >
            <Icon className="h-4 w-4" style={{ color: definition.color }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <span className={cn("font-bold font-display", compact ? "text-xl" : "text-2xl")}>
              {formattedValue}
            </span>
            {showChange && changeInfo && (
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-0.5 mb-0.5",
                  changeInfo.type === "positive" && "text-success",
                  changeInfo.type === "negative" && "text-destructive",
                  changeInfo.type === "neutral" && "text-muted-foreground"
                )}
              >
                {changeInfo.type === "positive" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : changeInfo.type === "negative" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {changeInfo.text}
              </span>
            )}
          </div>

          {showThreshold && threshold && (
            <Badge
              variant="outline"
              className={cn(
                "mt-2 text-xs",
                threshold.status === "success" && "border-success text-success",
                threshold.status === "warning" && "border-warning text-warning",
                threshold.status === "danger" && "border-destructive text-destructive",
                threshold.status === "neutral" && "border-muted-foreground text-muted-foreground"
              )}
            >
              {threshold.label}
            </Badge>
          )}

          {/* Sparkline */}
          {showSparkline && definition.supportsTimeSeries && result.series && result.series.length > 1 && (
            <div className={cn("mt-3", compact ? "h-12" : "h-16")}>
              <ResponsiveLine
                data={[
                  {
                    id: definition.id,
                    data: result.series.map((s) => ({ x: s.date, y: s.value })),
                  },
                ]}
                theme={nivoTheme}
                colors={[definition.color || "hsl(224 71% 25%)"]}
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
                xFormat="time:%Y-%m-%d"
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={null}
                axisLeft={null}
                enableGridX={false}
                enableGridY={false}
                pointSize={0}
                curve="monotoneX"
                enableArea
                areaOpacity={0.1}
                enableCrosshair={false}
                isInteractive={false}
              />
            </div>
          )}

          {!compact && (
            <p className="text-xs text-muted-foreground mt-2">{definition.description}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Area / Line Widget ──
  if (resolvedType === "area" || resolvedType === "line") {
    const hasSeries = result.series && result.series.length > 1;

    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{definition.label}</CardTitle>
              <p className="text-2xl font-bold font-display mt-1">
                {formattedValue}
                {showChange && changeInfo && (
                  <span
                    className={cn(
                      "text-sm font-normal ml-2",
                      changeInfo.type === "positive" && "text-success",
                      changeInfo.type === "negative" && "text-destructive",
                      changeInfo.type === "neutral" && "text-muted-foreground"
                    )}
                  >
                    {changeInfo.text}
                  </span>
                )}
              </p>
            </div>
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${definition.color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: definition.color }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasSeries ? (
            <div className={compact ? "h-[160px]" : "h-[220px]"}>
              <ResponsiveLine
                data={[
                  {
                    id: definition.label,
                    data: result.series!.map((s) => ({ x: s.date, y: s.value })),
                  },
                ]}
                theme={nivoTheme}
                colors={[definition.color || "hsl(224 71% 25%)"]}
                margin={{ top: 5, right: 10, bottom: 30, left: 45 }}
                xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
                xFormat="time:%Y-%m-%d"
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: "every 7 days",
                  format: (v) => {
                    const d = new Date(v);
                    return `${d.toLocaleDateString("en", { month: "short" })} ${d.getDate()}`;
                  },
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  format: (v) =>
                    Number(v) >= 1000
                      ? `${(Number(v) / 1000).toFixed(0)}K`
                      : String(v),
                }}
                curve="monotoneX"
                enableArea={resolvedType === "area"}
                areaOpacity={0.12}
                pointSize={0}
                enableCrosshair
                useMesh
                enableGridX={false}
              />
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Not enough data for chart</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Fallback: stat view ──
  return (
    <Card className={className}>
      <CardContent className="py-6 text-center">
        <p className="text-sm text-muted-foreground">{definition.label}</p>
        <p className="text-2xl font-bold font-display mt-1">{formattedValue}</p>
      </CardContent>
    </Card>
  );
}
