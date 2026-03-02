import { ResponsiveBar, type BarDatum } from '@nivo/bar';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber, formatAxisTick } from '@/lib/charts/formatters';

interface BarChartWrapperProps {
  theme: PartialTheme;
  data: BarDatum[];
  keys: string[];
  indexBy: string;
  colors?: string[];
  groupMode?: 'grouped' | 'stacked';
  layout?: 'vertical' | 'horizontal';
  height?: number;
  compact?: boolean;
}

export function BarChartWrapper({
  theme,
  data,
  keys,
  indexBy,
  colors,
  groupMode = 'grouped',
  layout = 'vertical',
  height = 300,
  compact,
}: BarChartWrapperProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveBar
        data={data}
        theme={theme}
        keys={keys}
        indexBy={indexBy}
        groupMode={groupMode}
        layout={layout}
        colors={colors}
        margin={{
          top: 8,
          right: isHorizontal ? 24 : 12,
          bottom: isHorizontal ? 8 : 28,
          left: isHorizontal ? 80 : 48,
        }}
        padding={0.35}
        innerPadding={groupMode === 'grouped' ? 3 : 0}
        borderRadius={4}
        enableGridY={!isHorizontal}
        enableGridX={isHorizontal}
        axisBottom={isHorizontal ? null : { tickSize: 0, tickPadding: 8, tickRotation: 0 }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: isHorizontal ? undefined : formatAxisTick,
          tickValues: 4,
        }}
        enableLabel={false}
        motionConfig="gentle"
        tooltip={({ id, value, indexValue, color }) => (
          <ChartTooltip
            title={String(indexValue)}
            items={[{ label: String(id), value: formatNumber(Number(value)), color }]}
          />
        )}
      />
    </div>
  );
}
