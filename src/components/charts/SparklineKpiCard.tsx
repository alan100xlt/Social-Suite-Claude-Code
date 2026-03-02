import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ResponsiveLine } from '@nivo/line';
import { Card, CardContent } from '@/components/ui/card';
import { createChartTheme, getChartPreset } from '@/lib/charts/theme';
import { formatNumber } from '@/lib/charts/formatters';
import type { ReactNode } from 'react';
import type { ChartPresetId } from '@/lib/charts/types';

interface SparklineKpiCardProps {
  title: string;
  value: number;
  change?: number;
  sparklineData: { x: string; y: number }[];
  color: string;
  icon?: ReactNode;
  preset?: ChartPresetId;
}

export function SparklineKpiCard({
  title,
  value,
  change,
  sparklineData,
  color,
  icon,
  preset,
}: SparklineKpiCardProps) {
  const { currentTheme } = useTheme();
  const nivoTheme = useMemo(() => createChartTheme(preset), [preset, currentTheme]);
  const presetObj = useMemo(() => getChartPreset(preset), [preset]);
  const cardPadding = presetObj.card.padding;

  const lineData = [{ id: 'trend', data: sparklineData }];

  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? 'text-emerald-500' : 'text-red-500';
  const changeArrow = isPositive ? '▲' : '▼';

  return (
    <Card>
      <CardContent style={{ padding: cardPadding }}>
        {/* Top row: icon + title */}
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>

        {/* Value + change */}
        <div className="flex items-baseline gap-2 mb-3">
          <span
            className="text-2xl font-bold text-foreground tabular-nums"
            style={{ fontFamily: presetObj.fonts.heading }}
          >
            {formatNumber(value)}
          </span>
          {change !== undefined && (
            <span className={`text-xs font-semibold ${changeColor}`}>
              {changeArrow} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <div style={{ height: 56 }}>
            <ResponsiveLine
              data={lineData}
              theme={nivoTheme}
              colors={[color]}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              curve="monotoneX"
              enableArea
              areaOpacity={0.15}
              enablePoints={false}
              enableGridX={false}
              enableGridY={false}
              axisBottom={null}
              axisLeft={null}
              enableCrosshair={false}
              isInteractive={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
