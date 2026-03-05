import { useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";
import {
  buildPremiumTheme,
  premiumColors,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

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
  linkedin: premiumColors.electricBlue,
  instagram: premiumColors.rose,
  twitter: premiumColors.cyan,
  tiktok: premiumColors.coral,
  facebook: premiumColors.deepPurple,
  youtube: 'hsl(0 100% 50%)',
};

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
        y={centerY - 10}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
        style={kpiTypography.large}
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
          style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.03em' }}
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
  const theme = useMemo(() => buildPremiumTheme(), []);

  const coloredData = data.map((d) => ({
    ...d,
    color: d.color || platformColors[d.id.toLowerCase()] || premiumColors.deepPurple,
  }));

  const breakdown = [...coloredData].sort((a, b) => b.value - a.value).slice(0, 5);
  const total = coloredData.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard noPadding className="flex flex-col">
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
          cornerRadius={6}
          activeOuterRadiusOffset={6}
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
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: datum.color, boxShadow: `0 0 6px ${datum.color}50` }}
                />
                <span className="text-xs text-muted-foreground">{datum.label}</span>
                <span className="font-bold text-foreground ml-auto" style={kpiTypography.medium}>
                  {formatMetric(datum.value)}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Legend dots */}
      <div className="px-6 pt-3 pb-2 flex items-center gap-5 flex-wrap">
        {coloredData.map((d) => (
          <div key={d.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-background/80 shadow-sm"
              style={{ background: d.color, boxShadow: `0 0 8px ${d.color}30` }}
            />
            <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Breakdown table with percentage bars */}
      {breakdown.length > 0 && (
        <div className="px-6 pb-5 pt-2 space-y-2.5">
          {breakdown.map((row) => {
            const pct = total > 0 ? (row.value / total) * 100 : 0;
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground/60">{pct.toFixed(0)}%</span>
                    <span
                      className="font-semibold text-foreground tabular-nums"
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                    >
                      {formatMetric(row.value)}
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: row.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
