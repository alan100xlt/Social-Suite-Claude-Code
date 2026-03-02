import type { ChartType, ChartRegistryEntry } from './types';

const registry = new Map<ChartType, ChartRegistryEntry>();

export function registerChart(entry: ChartRegistryEntry): void {
  registry.set(entry.type, entry);
}

export function getChart(type: ChartType): ChartRegistryEntry | undefined {
  return registry.get(type);
}

export function listCharts(): ChartRegistryEntry[] {
  return Array.from(registry.values());
}

// Register all built-in chart types
import { BarChartWrapper } from '@/components/charts/wrappers/BarChartWrapper';
import { LineChartWrapper } from '@/components/charts/wrappers/LineChartWrapper';
import { PieChartWrapper } from '@/components/charts/wrappers/PieChartWrapper';
import { HeatmapChartWrapper } from '@/components/charts/wrappers/HeatmapChartWrapper';
import { RadarChartWrapper } from '@/components/charts/wrappers/RadarChartWrapper';
import { TreemapChartWrapper } from '@/components/charts/wrappers/TreemapChartWrapper';
import { SunburstChartWrapper } from '@/components/charts/wrappers/SunburstChartWrapper';
import { BumpChartWrapper } from '@/components/charts/wrappers/BumpChartWrapper';
import { FunnelChartWrapper } from '@/components/charts/wrappers/FunnelChartWrapper';
import { ScatterChartWrapper } from '@/components/charts/wrappers/ScatterChartWrapper';

registerChart({ type: 'bar', component: BarChartWrapper, label: 'Bar Chart', dataShape: 'Record<string, string | number>[] with keys + indexBy' });
registerChart({ type: 'line', component: LineChartWrapper, label: 'Line Chart', dataShape: '{ id: string; data: { x, y }[] }[]' });
registerChart({ type: 'area', component: LineChartWrapper, label: 'Area Chart', dataShape: '{ id: string; data: { x, y }[] }[] (enableArea=true)' });
registerChart({ type: 'pie', component: PieChartWrapper, label: 'Pie Chart', dataShape: '{ id, value, label? }[]' });
registerChart({ type: 'donut', component: PieChartWrapper, label: 'Donut Chart', dataShape: '{ id, value, label? }[] (innerRadius=0.6)' });
registerChart({ type: 'heatmap', component: HeatmapChartWrapper, label: 'Heatmap', dataShape: '{ id: string; data: { x: string; y: number | null }[] }[]' });
registerChart({ type: 'radar', component: RadarChartWrapper, label: 'Radar Chart', dataShape: 'Record<string, string | number>[] with keys + indexBy' });
registerChart({ type: 'treemap', component: TreemapChartWrapper, label: 'Treemap', dataShape: '{ name, children: [{ name, value }] } (hierarchical)' });
registerChart({ type: 'sunburst', component: SunburstChartWrapper, label: 'Sunburst', dataShape: '{ name, children: [{ name, value }] } (hierarchical)' });
registerChart({ type: 'bump', component: BumpChartWrapper, label: 'Bump Chart', dataShape: '{ id, data: { x, y }[] }[] (all x-values must match)' });
registerChart({ type: 'funnel', component: FunnelChartWrapper, label: 'Funnel', dataShape: '{ id, value, label }[] (order = step order)' });
registerChart({ type: 'scatter', component: ScatterChartWrapper, label: 'Scatter Plot', dataShape: '{ id, data: { x, y }[] }[]' });
