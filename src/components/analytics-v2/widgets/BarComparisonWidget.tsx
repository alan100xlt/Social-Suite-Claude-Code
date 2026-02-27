import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveBar } from "@nivo/bar";
import { buildNivoThemeV2, chartColors } from "@/lib/nivo-theme";
import { Button } from "@/components/ui/button";

interface BarComparisonWidgetProps {
  title: string;
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
  colors?: string[];
}

const DEFAULT_COLORS = [chartColors.primary, chartColors.accent, chartColors.success, chartColors.warning];

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatTick(v: string | number): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return formatValue(n);
}

export function BarComparisonWidget({
  title,
  data,
  keys,
  indexBy,
  colors,
}: BarComparisonWidgetProps) {
  const [mode, setMode] = useState<"grouped" | "stacked">("grouped");
  const theme = useMemo(() => buildNivoThemeV2(), []);
  const palette = colors || DEFAULT_COLORS;

  // Compute totals per key for KPI display
  const keyTotals = useMemo(() => {
    return keys.map((key, i) => {
      const total = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
      return { key, total, color: palette[i % palette.length] };
    });
  }, [data, keys, palette]);

  // Breakdown by indexBy
  const breakdown = useMemo(() => {
    return data.map((row) => ({
      label: String(row[indexBy]),
      value: keys.reduce((s, k) => s + (Number(row[k]) || 0), 0),
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [data, keys, indexBy]);

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <h3
          className="text-base font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <Button
            size="sm"
            variant={mode === "grouped" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMode("grouped")}
          >
            Grouped
          </Button>
          <Button
            size="sm"
            variant={mode === "stacked" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMode("stacked")}
          >
            Stacked
          </Button>
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
          borderRadius={4}
          colors={palette}
          enableGridY
          enableGridX={false}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
          axisLeft={{ tickSize: 0, tickPadding: 8, format: formatTick, tickValues: 4 }}
          enableLabel={false}
          motionConfig="gentle"
          tooltip={({ id, value, indexValue, color }) => (
            <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{String(indexValue)}</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs text-muted-foreground">{String(id)}</span>
                <span
                  className="font-bold text-foreground ml-auto"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {formatValue(Number(value))}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Legend + KPIs */}
      <div className="px-6 pt-4 pb-3 flex items-center gap-6 flex-wrap">
        {keyTotals.map((kt) => (
          <div key={kt.key} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
              style={{ background: kt.color }}
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{kt.key}</span>
              <span
                className="text-lg font-bold text-foreground tracking-tight"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {formatValue(kt.total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown table */}
      {breakdown.length > 0 && (
        <div className="px-6 pb-5 pt-1 space-y-2">
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className="font-semibold text-foreground tabular-nums"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {formatValue(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
