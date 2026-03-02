import { ResponsiveLine } from '@nivo/line';
import type { PartialTheme } from '@nivo/theming';

interface SparklineWrapperProps {
  theme: PartialTheme;
  data: { id: string; data: { x: string | number; y: number }[] }[];
  colors?: string[];
  height?: number;
  compact?: boolean;
}

export function SparklineWrapper({ theme, data, colors, height = 64 }: SparklineWrapperProps) {
  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        curve="monotoneX"
        enableArea
        areaOpacity={0.2}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        axisBottom={null}
        axisLeft={null}
        enableCrosshair={false}
        isInteractive={false}
      />
    </div>
  );
}
