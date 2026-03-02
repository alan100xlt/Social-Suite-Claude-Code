import type { PartialTheme } from '@nivo/theming';
import type { ComponentType } from 'react';

/** All chart types supported by the registry */
export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'heatmap'
  | 'radar'
  | 'treemap'
  | 'sunburst'
  | 'bump'
  | 'funnel'
  | 'scatter'
  | 'sparkline'
  | 'bar-horizontal';

/** Theme preset identifier */
export type ChartPresetId = 'brand' | 'figma-kit' | (string & {});

/** Colors provided by a theme preset */
export interface ChartPresetColors {
  primary: string;
  primaryLight: string;
  secondary: string;
  series: string[];
  success: string;
  warning: string;
  error: string;
  platforms?: Record<string, string>;
}

/** Full preset definition */
export interface ChartThemePreset {
  id: ChartPresetId;
  colors: ChartPresetColors;
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
  card: {
    borderRadius: string;
    shadow: string;
    padding: string;
  };
}

/** Registration entry in the chart registry */
export interface ChartRegistryEntry {
  type: ChartType;
  component: ComponentType<any>;
  label: string;
  /** Human-readable data shape description */
  dataShape: string;
}

/** Props common to all chart wrappers */
export interface BaseChartProps {
  theme: PartialTheme;
  colors?: string[];
  height?: number;
  compact?: boolean;
  animate?: boolean;
}

/** Props for ChartWidget dispatcher */
export interface ChartWidgetProps {
  type: ChartType;
  title?: string;
  subtitle?: string;
  preset?: ChartPresetId;
  height?: number;
  compact?: boolean;
  isEmpty?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  /** Pass-through props forwarded to the chart wrapper */
  [key: string]: any;
}
