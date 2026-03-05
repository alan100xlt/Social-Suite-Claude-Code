import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import {
  buildPremiumTheme,
  getPremiumSeries,
  makeAreaGradient,
  formatMetric,
  formatTickValue,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";
import { format, parseISO } from "date-fns";

interface SeriesConfig {
  id: string;
  color: string;
  label?: string;
  total?: number;
}

interface AreaTrendWidgetProps {
  title: string;
  subtitle?: string;
  data: { id: string; data: { x: string; y: number }[] }[];
  series?: SeriesConfig[];
  height?: number;
}

function formatDateLabel(raw: string): string {
  try {
    return format(parseISO(`2024-${raw}`), "MMM d");
  } catch {
    try {
      return format(parseISO(raw), "MMM d");
    } catch {
      return raw;
    }
  }
}

function formatTooltipDate(raw: string): string {
  try {
    return format(parseISO(`2024-${raw}`), "MMMM d");
  } catch {
    try {
      return format(parseISO(raw), "MMMM d, yyyy");
    } catch {
      return raw;
    }
  }
}

const defaultSeriesColors = getPremiumSeries();

export function AreaTrendWidget({
  title,
  subtitle,
  data,
  series,
  height = 380,
}: AreaTrendWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const premiumSeries = useMemo(() => getPremiumSeries(), []);

  const resolvedSeries: SeriesConfig[] = useMemo(() => {
    if (series) return series;
    return data.map((d, i) => ({
      id: d.id,
      color: premiumSeries[i % premiumSeries.length],
      label: d.id,
    }));
  }, [series, data, premiumSeries]);

  const seriesMap = useMemo(() => {
    const m = new Map<string, SeriesConfig>();
    resolvedSeries.forEach((s) => m.set(s.id, s));
    return m;
  }, [resolvedSeries]);

  const colors = useMemo(() => resolvedSeries.map((s) => s.color), [resolvedSeries]);

  const seriesWithTotals = useMemo(() => {
    return resolvedSeries.map((s) => {
      if (s.total !== undefined) return s;
      const matching = data.find((d) => d.id === s.id);
      const total = matching ? matching.data.reduce((sum, p) => sum + p.y, 0) : 0;
      return { ...s, total };
    });
  }, [resolvedSeries, data]);

  // Multi-stop gradient defs per series
  const gradientDefs = useMemo(
    () => resolvedSeries.map((s, i) => makeAreaGradient(`areaGrad_${i}`, s.color, 0.3)),
    [resolvedSeries]
  );

  const fillRules = useMemo(
    () => resolvedSeries.map((s, i) => ({ match: { id: s.id }, id: `areaGrad_${i}` })),
    [resolvedSeries]
  );

  return (
    <ChartCard noPadding>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3">
        <div>
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

        {/* Inline legend with totals */}
        <div className="flex items-center gap-6 flex-wrap">
          {seriesWithTotals.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full ring-2 ring-background/80 shadow-sm"
                style={{
                  background: s.color,
                  boxShadow: `0 0 8px ${s.color}40`,
                }}
              />
              <div className="flex items-baseline gap-1.5">
                <span style={kpiTypography.label} className="text-muted-foreground normal-case text-xs tracking-normal font-medium">
                  {s.label || s.id}
                </span>
                {s.total !== undefined && (
                  <span className="text-foreground" style={kpiTypography.medium}>
                    {formatMetric(s.total)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4" style={{ height }}>
        <ResponsiveLine
          data={data}
          theme={theme}
          margin={{ top: 8, right: 24, bottom: 44, left: 56 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
          curve="natural"
          colors={colors}
          lineWidth={2.5}
          enableArea
          areaOpacity={1}
          enableGridX={false}
          enableGridY
          enablePoints={false}
          useMesh
          enableSlices="x"
          axisBottom={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
            tickValues: 7,
            format: formatDateLabel,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 12,
            format: formatTickValue,
            tickValues: 5,
          }}
          defs={gradientDefs}
          fill={fillRules}
          crosshairType="bottom-left"
          motionConfig="gentle"
          sliceTooltip={({ slice }) => {
            const dateStr = String(slice.points[0]?.data?.x ?? "");
            return (
              <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-5 py-3.5 text-sm min-w-[180px]">
                <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {formatTooltipDate(dateStr)}
                </p>
                <div className="space-y-1.5">
                  {slice.points.map((p) => {
                    const cfg = seriesMap.get(
                      (p as any).serieId || (p as any).seriesId
                    );
                    const pointColor = cfg?.color || (p as any).serieColor || (p as any).seriesColor;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: pointColor,
                              boxShadow: `0 0 6px ${pointColor}50`,
                            }}
                          />
                          <span className="text-muted-foreground text-xs">
                            {cfg?.label || (p as any).serieId || (p as any).seriesId}
                          </span>
                        </div>
                        <span className="font-bold text-foreground" style={kpiTypography.medium}>
                          {formatTickValue(Number(p.data.yFormatted))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        />
      </div>
    </ChartCard>
  );
}
