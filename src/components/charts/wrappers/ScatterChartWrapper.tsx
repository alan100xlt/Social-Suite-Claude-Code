import { ResponsiveScatterPlot, type ScatterPlotDatum, type ScatterPlotRawSerie } from '@nivo/scatterplot';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';

interface ScatterChartWrapperProps {
  theme: PartialTheme;
  data: ScatterPlotRawSerie<ScatterPlotDatum>[];
  colors?: string[];
  height?: number;
  compact?: boolean;
  nodeSize?: number;
}

export function ScatterChartWrapper({
  theme,
  data,
  colors,
  height = 300,
  compact,
  nodeSize = 8,
}: ScatterChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveScatterPlot
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 12, right: 16, bottom: 40, left: 52 }}
        nodeSize={nodeSize}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4 }}
        motionConfig="gentle"
        tooltip={({ node }) => (
          <ChartTooltip
            items={[{
              label: String(node.serieId),
              value: `(${node.formattedX}, ${node.formattedY})`,
              color: node.color,
            }]}
          />
        )}
      />
    </div>
  );
}
