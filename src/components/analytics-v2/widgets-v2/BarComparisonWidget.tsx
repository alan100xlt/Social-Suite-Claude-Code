import { useState, useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  buildPremiumTheme,
  getPremiumSeries,
  formatMetric,
  formatTickValue,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";

interface BarComparisonWidgetProps {
  title: string;
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
  colors?: string[];
}

export function BarComparisonWidget({
  title,
  data,
  keys,
  indexBy,
  colors,
}: BarComparisonWidgetProps) {
  const [mode, setMode] = useState<"grouped" | "stacked">("grouped");
  const theme = useMemo(() => buildPremiumTheme(), []);
  const premiumSeries = useMemo(() => getPremiumSeries(), []);
  const palette = colors || premiumSeries;

  const keyTotals = useMemo(() => {
    return keys.map((key, i) => {
      const total = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
      return { key, total, color: palette[i % palette.length] };
    });
  }, [data, keys, palette]);

  const breakdown = useMemo(() => {
    return data
      .map((row) => ({
        label: String(row[indexBy]),
        value: keys.reduce((s, k) => s + (Number(row[k]) || 0), 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data, keys, indexBy]);

  return (
    <ChartCard noPadding className="flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <h3
          className="text-base font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
        <div className="flex gap-0.5 bg-muted/60 dark:bg-white/[0.06] rounded-lg p-0.5 backdrop-blur-sm">
          {(["grouped", "stacked"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "h-7 px-3 text-[11px] font-medium rounded-md transition-all duration-200",
                mode === m
                  ? "bg-background dark:bg-white/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 h-[200px]">
        <ResponsiveBar
          data={data}
          theme={theme}
          keys={keys}
          indexBy={indexBy}
          groupMode={mode}
          margin={{ top: 8, right: 12, bottom: 28, left: 48 }}
          padding={0.35}
          innerPadding={mode === "grouped" ? 3 : 0}
          borderRadius={6}
          colors={palette}
          enableGridY
          enableGridX={false}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
          axisLeft={{ tickSize: 0, tickPadding: 8, format: formatTickValue, tickValues: 4 }}
          enableLabel={false}
          motionConfig="gentle"
          tooltip={({ id, value, indexValue, color }) => (
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{String(indexValue)}</p>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 6px ${color}50` }}
                />
                <span className="text-xs text-muted-foreground">{String(id)}</span>
                <span className="font-bold text-foreground ml-auto" style={kpiTypography.medium}>
                  {formatMetric(Number(value))}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Legend + KPIs */}
      <div className="px-6 pt-4 pb-3 flex items-center gap-6 flex-wrap">
        {keyTotals.map((kt) => (
          <div key={kt.key} className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-background/80 shadow-sm"
              style={{ background: kt.color, boxShadow: `0 0 8px ${kt.color}40` }}
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{kt.key}</span>
              <span className="text-foreground" style={kpiTypography.medium}>
                {formatMetric(kt.total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown table */}
      {breakdown.length > 0 && (
        <div className="px-6 pb-5 pt-1 space-y-2">
          {breakdown.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between text-sm group/row">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/50 w-4">{i + 1}</span>
                <span className="text-muted-foreground group-hover/row:text-foreground transition-colors">
                  {row.label}
                </span>
              </div>
              <span
                className="font-semibold text-foreground tabular-nums"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {formatMetric(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
