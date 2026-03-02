import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createChartTheme, getChartPreset } from '@/lib/charts/theme';
import { getChart } from '@/lib/charts/registry';
import { ChartCard } from './ChartCard';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLegend } from './ChartLegend';
import type { ChartWidgetProps } from '@/lib/charts/types';

interface LegendItem {
  id: string;
  label: string;
  color: string;
  value?: string | number;
}

export function ChartWidget({
  type,
  title,
  subtitle,
  preset,
  height,
  compact,
  isEmpty,
  isLoading,
  isError,
  emptyMessage,
  legendItems,
  legendPosition,
  ...chartProps
}: ChartWidgetProps & {
  legendItems?: LegendItem[];
  legendPosition?: 'top' | 'bottom' | 'right';
}) {
  const { currentTheme } = useTheme();
  const theme = useMemo(() => createChartTheme(preset), [preset, currentTheme]);
  const presetObj = useMemo(() => getChartPreset(preset), [preset]);

  const entry = getChart(type);
  if (!entry) {
    return <ChartEmptyState isError message={`Unknown chart type: ${type}`} height={height} />;
  }

  if (isLoading || isEmpty || isError) {
    return (
      <ChartCard title={title} subtitle={subtitle} compact={compact}>
        <ChartEmptyState
          isLoading={isLoading}
          isEmpty={isEmpty}
          isError={isError}
          message={emptyMessage}
          height={height}
        />
      </ChartCard>
    );
  }

  const Component = entry.component;

  const typeDefaults: Record<string, Record<string, unknown>> = {
    donut: { innerRadius: 0.6 },
    area: { enableArea: true },
  };

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      compact={compact}
      footer={legendItems ? <ChartLegend items={legendItems} position={legendPosition} /> : undefined}
    >
      <Component
        theme={theme}
        colors={chartProps.colors ?? presetObj.colors.series}
        height={height}
        compact={compact}
        {...(typeDefaults[type] ?? {})}
        {...chartProps}
      />
    </ChartCard>
  );
}
