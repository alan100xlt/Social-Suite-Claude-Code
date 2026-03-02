import { ResponsiveTreeMap } from '@nivo/treemap';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
}

interface TreemapChartWrapperProps {
  theme: PartialTheme;
  data: TreemapNode;
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function TreemapChartWrapper({
  theme,
  data,
  colors,
  height = 300,
  compact,
}: TreemapChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveTreeMap
        data={data}
        theme={theme}
        identity="name"
        value="value"
        colors={colors ?? { scheme: 'blues' }}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        labelSkipSize={24}
        borderRadius={4}
        borderWidth={2}
        borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
        label={d => d.id}
        motionConfig="gentle"
        tooltip={({ node }) => (
          <ChartTooltip
            items={[{
              label: node.id,
              value: formatNumber(node.value),
              color: node.color,
            }]}
          />
        )}
      />
    </div>
  );
}
