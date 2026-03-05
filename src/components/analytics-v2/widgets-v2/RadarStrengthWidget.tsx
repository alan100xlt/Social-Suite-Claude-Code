import { useMemo } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import {
  buildPremiumTheme,
  getPremiumSeries,
  premiumColors,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface RadarStrengthWidgetProps {
  title: string;
  data: Record<string, unknown>[];
  keys: string[];
  indexBy: string;
  colors?: string[];
}

export function RadarStrengthWidget({
  title,
  data,
  keys,
  indexBy,
  colors,
}: RadarStrengthWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const premiumSeries = useMemo(() => getPremiumSeries(), []);

  const palette = colors || [
    premiumSeries[0],
    premiumSeries[1],
    premiumSeries[2],
    premiumSeries[4],
  ];

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
          <ResponsiveRadar
            data={data}
            theme={theme}
            keys={keys}
            indexBy={indexBy}
            maxValue="auto"
            margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
            curve="linearClosed"
            borderWidth={2.5}
            borderColor={{ from: "color" }}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={14}
            enableDots
            dotSize={8}
            dotColor={{ theme: "background" }}
            dotBorderWidth={2.5}
            dotBorderColor={{ from: "color" }}
            colors={palette}
            fillOpacity={0.12}
            blendMode="normal"
            legends={[
              {
                anchor: "top-right",
                direction: "column",
                translateX: 10,
                itemWidth: 80,
                itemHeight: 20,
                symbolSize: 10,
                symbolShape: "circle",
              },
            ]}
          />
        </div>
      </div>
    </ChartCard>
  );
}
