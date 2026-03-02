import { ResponsiveBump, type BumpSerie } from '@nivo/bump';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';

// NOTE: All series must have identical x-values or Nivo crashes (GitHub issue #601)
interface BumpChartWrapperProps {
  theme: PartialTheme;
  data: BumpSerie<Record<string, unknown>, Record<string, unknown>>[];
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function BumpChartWrapper({
  theme,
  data,
  colors,
  height = 300,
  compact,
}: BumpChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveBump
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 24, right: 80, bottom: 28, left: 60 }}
        lineWidth={3}
        activeLineWidth={5}
        inactiveLineWidth={2}
        inactiveOpacity={0.25}
        pointSize={10}
        activePointSize={14}
        inactivePointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serie.color' }}
        motionConfig="gentle"
        tooltip={({ serie }) => (
          <ChartTooltip
            items={[{
              label: serie.id,
              value: '',
              color: serie.color,
            }]}
          />
        )}
      />
    </div>
  );
}
