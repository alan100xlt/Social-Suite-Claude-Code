import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveLine } from "@nivo/line";
import { buildNivoThemeV2, chartColors } from "@/lib/nivo-theme";
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
  /** Each series' data.x should be an ISO date string (YYYY-MM-DD) */
  data: { id: string; data: { x: string; y: number }[] }[];
  series?: SeriesConfig[];
  height?: number;
}

function formatTick(v: string | number): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
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

const defaultSeries: SeriesConfig[] = [
  { id: "Views", color: chartColors.primary, label: "Views" },
  { id: "Engagement", color: chartColors.accent, label: "Engagement" },
];

export function AreaTrendWidget({
  title,
  subtitle,
  data,
  series = defaultSeries,
  height = 380,
}: AreaTrendWidgetProps) {
  const theme = useMemo(() => buildNivoThemeV2(), []);

  const seriesMap = useMemo(() => {
    const m = new Map<string, SeriesConfig>();
    series.forEach((s) => m.set(s.id, s));
    return m;
  }, [series]);

  const colors = useMemo(() => series.map((s) => s.color), [series]);

  // Compute totals from data if not provided
  const seriesWithTotals = useMemo(() => {
    return series.map((s) => {
      if (s.total !== undefined) return s;
      const matching = data.find((d) => d.id === s.id);
      const total = matching ? matching.data.reduce((sum, p) => sum + p.y, 0) : 0;
      return { ...s, total };
    });
  }, [series, data]);

  // Build gradient defs dynamically per series
  const gradientDefs = useMemo(
    () =>
      series.map((s, i) => ({
        id: `areaGrad_${i}`,
        type: "linearGradient" as const,
        colors: [
          { offset: 0, color: s.color, opacity: 0.28 },
          { offset: 100, color: s.color, opacity: 0.01 },
        ],
      })),
    [series]
  );

  const fillRules = useMemo(
    () => series.map((s, i) => ({ match: { id: s.id }, id: `areaGrad_${i}` })),
    [series]
  );

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header with title + inline legend */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Inline legend with totals */}
        <div className="flex items-center gap-6">
          {seriesWithTotals.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
                style={{ background: s.color }}
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {s.label || s.id}
                </span>
                {s.total !== undefined && (
                  <span
                    className="text-lg font-bold text-foreground tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                  >
                    {formatTick(s.total)}
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
          curve="monotoneX"
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
            format: formatTick,
            tickValues: 5,
          }}
          defs={gradientDefs}
          fill={fillRules}
          crosshairType="bottom-left"
          motionConfig="gentle"
          sliceTooltip={({ slice }) => {
            const dateStr = String(slice.points[0]?.data?.x ?? "");
            return (
              <div className="bg-card border border-border rounded-xl shadow-xl px-5 py-3.5 text-sm min-w-[180px]">
                <p className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {formatTooltipDate(dateStr)}
                </p>
                <div className="space-y-1.5">
                  {slice.points.map((p) => {
                    const cfg = seriesMap.get(
                      (p as any).serieId || (p as any).seriesId
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background:
                                cfg?.color ||
                                (p as any).serieColor ||
                                (p as any).seriesColor,
                            }}
                          />
                          <span className="text-muted-foreground text-xs">
                            {cfg?.label ||
                              (p as any).serieId ||
                              (p as any).seriesId}
                          </span>
                        </div>
                        <span
                          className="font-bold text-foreground"
                          style={{
                            fontFamily:
                              "'Space Grotesk', system-ui, sans-serif",
                          }}
                        >
                          {formatTick(Number(p.data.yFormatted))}
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
    </Card>
  );
}
