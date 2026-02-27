import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { buildNivoThemeV2, chartColors } from "@/lib/nivo-theme";

interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface DonutKpiWidgetProps {
  title: string;
  centerValue: string | number;
  centerLabel?: string;
  data: DonutSlice[];
}

const platformColors: Record<string, string> = {
  linkedin: chartColors.linkedin,
  instagram: chartColors.instagram,
  twitter: chartColors.twitter,
  tiktok: chartColors.tiktok,
  facebook: chartColors.facebook,
  youtube: "hsl(0 100% 50%)",
};

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function CenteredMetric({ centerX, centerY, centerValue, centerLabel }: any) {
  const display =
    typeof centerValue === "number"
      ? centerValue >= 1000
        ? `${(centerValue / 1000).toFixed(1)}K`
        : centerValue.toLocaleString()
      : centerValue;
  return (
    <g>
      <text
        x={centerX}
        y={centerY - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
        style={{
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        {display}
      </text>
      {centerLabel && (
        <text
          x={centerX}
          y={centerY + 18}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {centerLabel}
        </text>
      )}
    </g>
  );
}

export function DonutKpiWidget({
  title,
  centerValue,
  centerLabel,
  data,
}: DonutKpiWidgetProps) {
  const theme = useMemo(() => buildNivoThemeV2(), []);

  const coloredData = data.map((d) => ({
    ...d,
    color: d.color || platformColors[d.id.toLowerCase()] || chartColors.primary,
  }));

  // Top breakdown entries sorted by value
  const breakdown = [...coloredData].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h3
          className="text-base font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
      </div>

      {/* Donut */}
      <div className="px-4 h-[220px]">
        <ResponsivePie
          data={coloredData}
          theme={theme}
          margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          innerRadius={0.72}
          padAngle={1.5}
          cornerRadius={4}
          activeOuterRadiusOffset={5}
          colors={{ datum: "data.color" }}
          borderWidth={0}
          enableArcLinkLabels={false}
          arcLabelsSkipAngle={20}
          arcLabelsTextColor="hsl(0 0% 100%)"
          layers={[
            "arcs",
            "arcLabels",
            (props: any) => (
              <CenteredMetric
                {...props}
                centerValue={centerValue}
                centerLabel={centerLabel}
              />
            ),
          ]}
          tooltip={({ datum }) => (
            <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: datum.color }} />
                <span className="text-xs text-muted-foreground">{datum.label}</span>
                <span
                  className="font-bold text-foreground ml-auto"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {formatValue(datum.value)}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Legend with dots */}
      <div className="px-6 pt-3 pb-2 flex items-center gap-5 flex-wrap">
        {coloredData.map((d) => (
          <div key={d.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
              style={{ background: d.color }}
            />
            <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Breakdown table */}
      {breakdown.length > 0 && (
        <div className="px-6 pb-5 pt-2 space-y-2">
          {breakdown.map((row) => (
            <div key={row.id} className="flex items-center justify-between text-sm">
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
