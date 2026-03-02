import { ResponsiveLine, type Serie } from '@nivo/line';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface LineChartWrapperProps {
  theme: PartialTheme;
  data: Serie[];
  colors?: string[];
  enableArea?: boolean;
  stacked?: boolean;
  height?: number;
  compact?: boolean;
  enableSlices?: 'x' | 'y' | false;
  gradientDefs?: any[];
  fillRules?: any[];
}

export function LineChartWrapper({
  theme,
  data,
  colors,
  enableArea = false,
  stacked = false,
  height = 300,
  compact,
  enableSlices = 'x',
  gradientDefs,
  fillRules,
}: LineChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveLine
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 12, right: 16, bottom: 28, left: 48 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', stacked }}
        curve="monotoneX"
        enableArea={enableArea}
        areaOpacity={0.15}
        enablePoints={false}
        enableGridX={false}
        enableGridY
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4 }}
        enableSlices={enableSlices || undefined}
        motionConfig="gentle"
        defs={gradientDefs}
        fill={fillRules}
        sliceTooltip={({ slice }) => (
          <ChartTooltip
            title={String(slice.points[0]?.data.xFormatted ?? '')}
            items={slice.points.map(p => ({
              label: String(p.serieId),
              value: formatNumber(Number(p.data.yFormatted)),
              color: p.serieColor,
            }))}
          />
        )}
      />
    </div>
  );
}
