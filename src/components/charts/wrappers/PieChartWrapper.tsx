import { ResponsivePie } from '@nivo/pie';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface PieChartWrapperProps {
  theme: PartialTheme;
  data: { id: string; value: number; label?: string; color?: string }[];
  colors?: string[];
  innerRadius?: number;
  height?: number;
  compact?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export function PieChartWrapper({
  theme,
  data,
  colors,
  innerRadius = 0,
  height = 300,
  compact,
}: PieChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsivePie
        data={data}
        theme={theme}
        colors={colors}
        innerRadius={innerRadius}
        padAngle={1.5}
        cornerRadius={4}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        enableArcLinkLabels={false}
        enableArcLabels={false}
        motionConfig="gentle"
        tooltip={({ datum }) => (
          <ChartTooltip
            items={[{
              label: String(datum.label ?? datum.id),
              value: formatNumber(datum.value),
              color: datum.color,
            }]}
          />
        )}
      />
    </div>
  );
}
