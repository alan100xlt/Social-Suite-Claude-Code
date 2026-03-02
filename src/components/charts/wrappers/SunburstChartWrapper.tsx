import { ResponsiveSunburst } from '@nivo/sunburst';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
}

interface SunburstChartWrapperProps {
  theme: PartialTheme;
  data: SunburstNode;
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function SunburstChartWrapper({
  theme,
  data,
  colors,
  height = 300,
  compact,
}: SunburstChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveSunburst
        data={data}
        theme={theme}
        id="name"
        value="value"
        colors={colors ?? { scheme: 'blues' }}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        cornerRadius={3}
        borderWidth={2}
        borderColor={{ theme: 'background' }}
        enableArcLabels={false}
        motionConfig="gentle"
        tooltip={({ id, value, color }) => (
          <ChartTooltip
            items={[{
              label: String(id),
              value: formatNumber(value),
              color,
            }]}
          />
        )}
      />
    </div>
  );
}
