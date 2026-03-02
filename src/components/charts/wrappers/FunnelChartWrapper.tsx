import { ResponsiveFunnel } from '@nivo/funnel';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface FunnelDatum {
  id: string;
  value: number;
  label: string;
}

interface FunnelChartWrapperProps {
  theme: PartialTheme;
  data: FunnelDatum[];
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function FunnelChartWrapper({
  theme,
  data,
  colors,
  height = 300,
  compact,
}: FunnelChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveFunnel
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
        shapeBlending={0.6}
        borderWidth={2}
        enableLabel
        labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
        motionConfig="gentle"
        tooltip={({ part }) => (
          <ChartTooltip
            items={[{
              label: part.data.label,
              value: formatNumber(part.data.value),
              color: part.color,
            }]}
          />
        )}
      />
    </div>
  );
}
