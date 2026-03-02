import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface HeatmapDatum {
  id: string;
  data: { x: string; y: number | null }[];
}

interface HeatmapChartWrapperProps {
  theme: PartialTheme;
  data: HeatmapDatum[];
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function HeatmapChartWrapper({
  theme,
  data,
  height = 300,
  compact,
}: HeatmapChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveHeatMap
        data={data}
        theme={theme}
        margin={{ top: 20, right: 16, bottom: 28, left: 48 }}
        axisTop={null}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        colors={{ type: 'sequential', scheme: 'blues' }}
        borderRadius={3}
        enableLabels={false}
        motionConfig="gentle"
        tooltip={({ cell }) => (
          <ChartTooltip
            items={[{
              label: `${cell.serieId} / ${cell.data.x}`,
              value: formatNumber(Number(cell.value ?? 0)),
              color: cell.color,
            }]}
          />
        )}
      />
    </div>
  );
}
