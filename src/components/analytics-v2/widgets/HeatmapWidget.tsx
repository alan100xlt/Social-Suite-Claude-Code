import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { buildNivoThemeV2 } from "@/lib/nivo-theme";

interface HeatmapWidgetProps {
  title: string;
  data: { id: string; data: { x: string; y: number | null }[] }[];
}

export function HeatmapWidget({ title, data }: HeatmapWidgetProps) {
  const theme = useMemo(() => buildNivoThemeV2(), []);

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="px-6 pt-6 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="h-[280px]">
          <ResponsiveHeatMap
            data={data}
            theme={theme}
            margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
            axisTop={null}
            axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -45 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            colors={{ type: "sequential", scheme: "blues", minValue: 0 }}
            emptyColor="hsl(var(--muted))"
            borderRadius={4}
            borderWidth={2}
            borderColor="hsl(var(--card))"
            enableLabels
            labelTextColor={{ from: "color", modifiers: [["darker", 2.4]] }}
            hoverTarget="cell"
            tooltip={({ cell }) => (
              <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-sm">
                <p className="font-semibold text-foreground">
                  {cell.serieId} · {cell.data.x}
                </p>
                <p className="text-muted-foreground">
                  Engagement: <span className="font-semibold text-foreground">{cell.formattedValue}</span>
                </p>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
