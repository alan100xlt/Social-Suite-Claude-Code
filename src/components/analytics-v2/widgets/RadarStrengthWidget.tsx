import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveRadar } from "@nivo/radar";
import { buildNivoThemeV2, chartColors } from "@/lib/nivo-theme";

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
          <ResponsiveRadar
            data={data}
            theme={theme}
            keys={keys}
            indexBy={indexBy}
            maxValue="auto"
            margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor={{ from: "color" }}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={14}
            enableDots
            dotSize={8}
            dotColor={{ theme: "background" }}
            dotBorderWidth={2}
            dotBorderColor={{ from: "color" }}
            colors={colors || [chartColors.linkedin, chartColors.instagram, chartColors.twitter, chartColors.facebook]}
            fillOpacity={0.15}
            blendMode="multiply"
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
      </CardContent>
    </Card>
  );
}
