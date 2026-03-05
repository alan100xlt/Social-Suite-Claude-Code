import { useMemo } from "react";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import {
  buildPremiumTheme,
  premiumColors,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface HeatmapWidgetProps {
  title: string;
  data: { id: string; data: { x: string; y: number | null }[] }[];
}

export function HeatmapWidget({ title, data }: HeatmapWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);

  return (
    <ChartCard noPadding>
      <div className="px-6 pt-6 pb-2">
        <h3
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {title}
        </h3>
      </div>
      <div className="px-6 pb-6">
        <div className="h-[280px]">
          <ResponsiveHeatMap
            data={data}
            theme={theme}
            margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
            axisTop={null}
            axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -45 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            colors={{
              type: "sequential",
              scheme: "purple_blue",
              minValue: 0,
            }}
            emptyColor="hsl(var(--muted))"
            borderRadius={6}
            borderWidth={3}
            borderColor="hsl(var(--card))"
            enableLabels
            labelTextColor={{ from: "color", modifiers: [["darker", 2.4]] }}
            hoverTarget="cell"
            tooltip={({ cell }) => (
              <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
                <p className="font-semibold text-foreground">
                  {cell.serieId} · {cell.data.x}
                </p>
                <p className="text-muted-foreground">
                  Engagement:{" "}
                  <span className="font-semibold text-foreground" style={kpiTypography.medium}>
                    {cell.formattedValue}
                  </span>
                </p>
              </div>
            )}
          />
        </div>
      </div>
    </ChartCard>
  );
}
