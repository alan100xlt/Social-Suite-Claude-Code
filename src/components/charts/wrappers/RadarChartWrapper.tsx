import { ResponsiveRadar } from '@nivo/radar';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';

interface RadarChartWrapperProps {
  theme: PartialTheme;
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function RadarChartWrapper({
  theme,
  data,
  keys,
  indexBy,
  colors,
  height = 300,
  compact,
}: RadarChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveRadar
        data={data}
        theme={theme}
        keys={keys}
        indexBy={indexBy}
        colors={colors}
        margin={{ top: 24, right: 60, bottom: 24, left: 60 }}
        borderWidth={2}
        gridLevels={4}
        gridShape="circular"
        enableDots
        dotSize={6}
        dotBorderWidth={2}
        fillOpacity={0.15}
        motionConfig="gentle"
        tooltip={({ index, data: tooltipData }) => (
          <ChartTooltip
            title={String(index)}
            items={tooltipData.map(d => ({
              label: d.id,
              value: String(d.value),
              color: d.color,
            }))}
          />
        )}
      />
    </div>
  );
}
