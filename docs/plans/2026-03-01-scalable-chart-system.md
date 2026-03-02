# Scalable Chart System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a themeable, registry-based chart system that makes adding new Nivo chart types a configuration change, with shared components eliminating duplication across 18 existing charts.

**Architecture:** Dispatcher pattern — a `ChartWidget` component looks up chart type in a registry, resolves the correct typed wrapper, applies a theme preset derived from CSS variables. Each Nivo chart type gets a thin wrapper with proper TypeScript generics. Shared tooltip, legend, card shell, empty state, and formatters replace 18 copies of each.

**Tech Stack:** Nivo v0.99 (bar, line, pie, heatmap, radar, treemap, sunburst, bump, funnel, scatterplot), React 18, TypeScript, Tailwind CSS, Shadcn/ui Card.

---

## Task 1: Chart Types & Formatters (`src/lib/charts/types.ts` + `formatters.ts`)

**Files:**
- Create: `src/lib/charts/types.ts`
- Create: `src/lib/charts/formatters.ts`
- Create: `src/lib/charts/index.ts`

**Step 1: Create the type system**

```typescript
// src/lib/charts/types.ts
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
  | 'scatter';

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
```

**Step 2: Extract formatters from duplicated code**

The `formatValue` function exists in at least 8 chart files. Extract once:

```typescript
// src/lib/charts/formatters.ts

/** Compact number formatting: 1200 → "1.2K", 1500000 → "1.5M" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Format as percentage with 1 decimal */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format a tick value (string or number) for chart axes */
export function formatAxisTick(v: string | number): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return formatNumber(n);
}
```

**Step 3: Create barrel export**

```typescript
// src/lib/charts/index.ts
export * from './types';
export * from './formatters';
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors from the new files.

**Step 5: Commit**

```bash
git add src/lib/charts/
git commit -m "feat(charts): add chart system types and shared formatters"
```

---

## Task 2: Theme System (`src/lib/charts/theme.ts` + presets)

**Files:**
- Create: `src/lib/charts/theme.ts`
- Create: `src/lib/charts/presets/brand.ts`
- Create: `src/lib/charts/presets/figma-kit.ts`
- Reference: `src/lib/nivo-theme.ts` (existing — we read its `cssVar` pattern)
- Reference: `src/contexts/ThemeContext.tsx:338` (`useTheme()` returns `{ currentTheme: ThemeVariant }`)

**Step 1: Create the brand preset**

```typescript
// src/lib/charts/presets/brand.ts
import type { ChartThemePreset } from '../types';

export const brandPreset: ChartThemePreset = {
  id: 'brand',
  colors: {
    primary: 'hsl(224 71% 25%)',
    primaryLight: 'hsl(224 71% 35%)',
    secondary: 'hsl(12 95% 62%)',
    series: [
      'hsl(224 71% 25%)',   // primary
      'hsl(12 95% 62%)',    // accent
      'hsl(142 71% 45%)',   // success
      'hsl(38 92% 50%)',    // warning
      'hsl(201 100% 35%)',  // linkedin blue
      'hsl(330 80% 55%)',   // accentWarm
      'hsl(203 89% 53%)',   // twitter
      'hsl(329 70% 58%)',   // instagram
    ],
    success: 'hsl(142 71% 45%)',
    warning: 'hsl(38 92% 50%)',
    error: 'hsl(0 84% 60%)',
    platforms: {
      linkedin: 'hsl(201 100% 35%)',
      instagram: 'hsl(329 70% 58%)',
      twitter: 'hsl(203 89% 53%)',
      tiktok: 'hsl(349 100% 50%)',
      facebook: 'hsl(221 44% 41%)',
    },
  },
  fonts: {
    body: "'Inter', system-ui, sans-serif",
    heading: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  card: {
    borderRadius: '0.75rem',
    shadow: '0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)',
    padding: '1.5rem',
  },
};
```

**Step 2: Create the Figma kit preset**

```typescript
// src/lib/charts/presets/figma-kit.ts
import type { ChartThemePreset } from '../types';

export const figmaKitPreset: ChartThemePreset = {
  id: 'figma-kit',
  colors: {
    primary: '#855CF8',
    primaryLight: '#B49BFC',
    secondary: '#607D8B',
    series: [
      '#855CF8',           // purple primary
      '#B49BFC',           // purple light
      '#607D8B',           // blue grey
      '#26C6DA',           // cyan
      '#FF7043',           // deep orange
      '#AB47BC',           // purple accent
      '#66BB6A',           // green
      '#FFA726',           // orange
    ],
    success: '#66BB6A',
    warning: '#FFA726',
    error: '#EF5350',
    platforms: {
      linkedin: '#0A66C2',
      instagram: '#E1306C',
      twitter: '#1DA1F2',
      tiktok: '#FF0050',
      facebook: '#4267B2',
    },
  },
  fonts: {
    body: "'IBM Plex Sans', system-ui, sans-serif",
    heading: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  card: {
    borderRadius: '0.5rem',
    shadow: '0px 8px 24px 0px rgba(176,190,197,0.32), 0px 3px 5px 0px rgba(176,190,197,0.32)',
    padding: '1rem',
  },
};
```

**Step 3: Create the theme factory**

```typescript
// src/lib/charts/theme.ts
import type { PartialTheme } from '@nivo/theming';
import type { ChartPresetId, ChartThemePreset } from './types';
import { brandPreset } from './presets/brand';
import { figmaKitPreset } from './presets/figma-kit';

const presetMap: Record<string, ChartThemePreset> = {
  brand: brandPreset,
  'figma-kit': figmaKitPreset,
};

/** Register a custom preset at runtime */
export function registerChartPreset(preset: ChartThemePreset): void {
  presetMap[preset.id] = preset;
}

/** Get a preset by ID (defaults to 'brand') */
export function getChartPreset(id?: ChartPresetId): ChartThemePreset {
  return presetMap[id ?? 'brand'] ?? brandPreset;
}

/**
 * Read a CSS custom property from :root.
 * SSR-safe: returns fallback when window is undefined.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

/**
 * Build a Nivo PartialTheme from CSS custom properties + a preset overlay.
 *
 * IMPORTANT: Call inside useMemo with the app theme variant as dependency:
 *   const { currentTheme } = useTheme();
 *   const theme = useMemo(() => createChartTheme('brand'), [currentTheme]);
 */
export function createChartTheme(presetId?: ChartPresetId): PartialTheme {
  const preset = getChartPreset(presetId);
  const fg = `hsl(${cssVar('--foreground', '222 47% 11%')})`;
  const muted = `hsl(${cssVar('--muted-foreground', '220 9% 46%')})`;
  const border = `hsl(${cssVar('--border', '220 13% 91%')})`;
  const cardBg = `hsl(${cssVar('--card', '0 0% 100%')})`;

  return {
    text: { fontSize: 12, fontFamily: preset.fonts.body, fill: muted },
    axis: {
      domain: { line: { stroke: 'transparent' } },
      ticks: {
        line: { stroke: 'transparent' },
        text: { fontSize: 11, fontFamily: preset.fonts.body, fill: muted },
      },
      legend: {
        text: { fontSize: 13, fontWeight: 600, fontFamily: preset.fonts.heading, fill: fg },
      },
    },
    grid: { line: { stroke: border, strokeDasharray: '3 3', strokeOpacity: 0.8 } },
    crosshair: { line: { stroke: muted, strokeWidth: 1, strokeOpacity: 0.35, strokeDasharray: '4 4' } },
    tooltip: {
      container: {
        background: cardBg,
        border: 'none',
        borderRadius: preset.card.borderRadius,
        boxShadow: preset.card.shadow,
        fontSize: 13,
        fontFamily: preset.fonts.body,
        padding: '12px 16px',
      },
    },
    legends: { text: { fontSize: 12, fontFamily: preset.fonts.body, fill: muted } },
  };
}
```

**Step 4: Export from barrel**

Add to `src/lib/charts/index.ts`:
```typescript
export { createChartTheme, getChartPreset, registerChartPreset } from './theme';
export { brandPreset } from './presets/brand';
export { figmaKitPreset } from './presets/figma-kit';
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/lib/charts/
git commit -m "feat(charts): add theme factory with brand and figma-kit presets"
```

---

## Task 3: Shared UI Components

**Files:**
- Create: `src/components/charts/ChartTooltip.tsx`
- Create: `src/components/charts/ChartLegend.tsx`
- Create: `src/components/charts/ChartEmptyState.tsx`
- Create: `src/components/charts/ChartCard.tsx`

**Step 1: ChartTooltip — shared Nivo tooltip**

Replaces the inline tooltip pattern duplicated across all 18 chart components. Pattern extracted from `src/components/analytics-v2/widgets/BarComparisonWidget.tsx:105-119`.

```typescript
// src/components/charts/ChartTooltip.tsx
interface ChartTooltipItem {
  label: string;
  value: string | number;
  color: string;
}

interface ChartTooltipProps {
  title?: string;
  items: ChartTooltipItem[];
}

export function ChartTooltip({ title, items }: ChartTooltipProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 text-sm">
      {title && <p className="text-xs text-muted-foreground mb-1">{title}</p>}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="font-bold text-foreground ml-auto tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: ChartLegend**

```typescript
// src/components/charts/ChartLegend.tsx
interface ChartLegendItem {
  id: string;
  label: string;
  color: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  position?: 'top' | 'bottom' | 'right';
}

export function ChartLegend({ items, position = 'bottom' }: ChartLegendProps) {
  const isVertical = position === 'right';

  return (
    <div className={`flex ${isVertical ? 'flex-col gap-2' : 'items-center gap-4 flex-wrap justify-center'}`}>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-sm font-bold text-foreground tabular-nums">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: ChartEmptyState**

```typescript
// src/components/charts/ChartEmptyState.tsx
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';

interface ChartEmptyStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  message?: string;
  height?: number;
}

export function ChartEmptyState({ isLoading, isEmpty, isError, message, height = 200 }: ChartEmptyStateProps) {
  const Icon = isLoading ? Loader2 : isError ? AlertCircle : BarChart3;
  const defaultMessage = isLoading
    ? 'Loading chart data...'
    : isError
      ? 'Failed to load data'
      : 'No data available';

  return (
    <div
      className="flex flex-col items-center justify-center text-muted-foreground gap-2"
      style={{ height }}
    >
      <Icon className={`h-8 w-8 opacity-40 ${isLoading ? 'animate-spin' : ''}`} />
      <p className="text-sm">{message ?? defaultMessage}</p>
    </div>
  );
}
```

**Step 4: ChartCard**

```typescript
// src/components/charts/ChartCard.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, compact, children, footer, className }: ChartCardProps) {
  return (
    <Card className={className}>
      {(title || subtitle || action) && (
        <CardHeader className={compact ? 'pb-1' : 'pb-2'}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3
                  className="text-base font-bold text-foreground tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {action}
          </div>
        </CardHeader>
      )}
      <CardContent className={compact ? 'pt-0' : ''}>
        {children}
      </CardContent>
      {footer && (
        <div className="px-6 pb-4">
          {footer}
        </div>
      )}
    </Card>
  );
}
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/components/charts/
git commit -m "feat(charts): add shared ChartTooltip, ChartLegend, ChartEmptyState, ChartCard"
```

---

## Task 4: Chart Wrappers (10 wrappers for all Nivo chart types)

**Files:**
- Create: `src/components/charts/wrappers/BarChartWrapper.tsx`
- Create: `src/components/charts/wrappers/LineChartWrapper.tsx`
- Create: `src/components/charts/wrappers/PieChartWrapper.tsx`
- Create: `src/components/charts/wrappers/HeatmapChartWrapper.tsx`
- Create: `src/components/charts/wrappers/RadarChartWrapper.tsx`
- Create: `src/components/charts/wrappers/TreemapChartWrapper.tsx`
- Create: `src/components/charts/wrappers/SunburstChartWrapper.tsx`
- Create: `src/components/charts/wrappers/BumpChartWrapper.tsx`
- Create: `src/components/charts/wrappers/FunnelChartWrapper.tsx`
- Create: `src/components/charts/wrappers/ScatterChartWrapper.tsx`

Each wrapper is a thin typed component. Here are the three most representative ones — the rest follow the same pattern.

**Step 1: BarChartWrapper**

```typescript
// src/components/charts/wrappers/BarChartWrapper.tsx
import { ResponsiveBar, type BarDatum } from '@nivo/bar';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber, formatAxisTick } from '@/lib/charts/formatters';

interface BarChartWrapperProps {
  theme: PartialTheme;
  data: BarDatum[];
  keys: string[];
  indexBy: string;
  colors?: string[];
  groupMode?: 'grouped' | 'stacked';
  layout?: 'vertical' | 'horizontal';
  height?: number;
  compact?: boolean;
}

export function BarChartWrapper({
  theme,
  data,
  keys,
  indexBy,
  colors,
  groupMode = 'grouped',
  layout = 'vertical',
  height = 300,
  compact,
}: BarChartWrapperProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveBar
        data={data}
        theme={theme}
        keys={keys}
        indexBy={indexBy}
        groupMode={groupMode}
        layout={layout}
        colors={colors}
        margin={{
          top: 8,
          right: isHorizontal ? 24 : 12,
          bottom: isHorizontal ? 8 : 28,
          left: isHorizontal ? 80 : 48,
        }}
        padding={0.35}
        innerPadding={groupMode === 'grouped' ? 3 : 0}
        borderRadius={4}
        enableGridY={!isHorizontal}
        enableGridX={isHorizontal}
        axisBottom={isHorizontal ? null : { tickSize: 0, tickPadding: 8, tickRotation: 0 }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: isHorizontal ? undefined : formatAxisTick,
          tickValues: 4,
        }}
        enableLabel={false}
        motionConfig="gentle"
        tooltip={({ id, value, indexValue, color }) => (
          <ChartTooltip
            title={String(indexValue)}
            items={[{ label: String(id), value: formatNumber(Number(value)), color }]}
          />
        )}
      />
    </div>
  );
}
```

**Step 2: LineChartWrapper** (handles both line and area via `enableArea` prop)

```typescript
// src/components/charts/wrappers/LineChartWrapper.tsx
import { ResponsiveLine, type Serie } from '@nivo/line';
import type { PartialTheme } from '@nivo/theming';
import { ChartTooltip } from '../ChartTooltip';
import { formatNumber } from '@/lib/charts/formatters';

interface LineChartWrapperProps {
  theme: PartialTheme;
  data: Serie[];
  colors?: string[];
  enableArea?: boolean;
  stacked?: boolean;
  height?: number;
  compact?: boolean;
  enableSlices?: 'x' | 'y' | false;
  gradientDefs?: any[];
  fillRules?: any[];
}

export function LineChartWrapper({
  theme,
  data,
  colors,
  enableArea = false,
  stacked = false,
  height = 300,
  compact,
  enableSlices = 'x',
  gradientDefs,
  fillRules,
}: LineChartWrapperProps) {
  return (
    <div style={{ height: compact ? 200 : height }}>
      <ResponsiveLine
        data={data}
        theme={theme}
        colors={colors}
        margin={{ top: 12, right: 16, bottom: 28, left: 48 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', stacked }}
        curve="monotoneX"
        enableArea={enableArea}
        areaOpacity={0.15}
        enablePoints={false}
        enableGridX={false}
        enableGridY
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4 }}
        enableSlices={enableSlices || undefined}
        motionConfig="gentle"
        defs={gradientDefs}
        fill={fillRules}
        sliceTooltip={({ slice }) => (
          <ChartTooltip
            title={String(slice.points[0]?.data.xFormatted ?? '')}
            items={slice.points.map(p => ({
              label: String(p.serieId),
              value: formatNumber(Number(p.data.yFormatted)),
              color: p.serieColor,
            }))}
          />
        )}
      />
    </div>
  );
}
```

**Step 3: PieChartWrapper** (handles pie and donut via `innerRadius`)

```typescript
// src/components/charts/wrappers/PieChartWrapper.tsx
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
```

**Step 4: Create remaining 7 wrappers** following the same pattern:

- `HeatmapChartWrapper.tsx` — uses `ResponsiveHeatMap`, data shape `{ id: string; data: { x: string; y: number | null }[] }[]`
- `RadarChartWrapper.tsx` — uses `ResponsiveRadar`, props `keys`, `indexBy`
- `TreemapChartWrapper.tsx` — uses `ResponsiveTreeMap`, hierarchical data with `children`, props `identity`, `value`. Requires `npm install @nivo/treemap`
- `SunburstChartWrapper.tsx` — uses `ResponsiveSunburst`, same hierarchical data. **No built-in legend** — renders `ChartLegend` externally. Requires `npm install @nivo/sunburst`
- `BumpChartWrapper.tsx` — uses `ResponsiveBump`, data `{ id, data: { x, y }[] }[]`. **Must normalize data** so all series have identical x-values (Nivo crashes otherwise per GitHub issue #601)
- `FunnelChartWrapper.tsx` — uses `ResponsiveFunnel`, data `{ id, value, label }[]`
- `ScatterChartWrapper.tsx` — uses `ResponsiveScatterPlot`, optional bubble mode via `nodeSize`. Requires `npm install @nivo/scatterplot`

**Step 5: Install new Nivo packages**

Run: `npm install @nivo/treemap@^0.99.0 @nivo/sunburst@^0.99.0 @nivo/scatterplot@^0.99.0`

If ESM/CJS errors appear in dev, add to `vite.config.ts`:
```typescript
optimizeDeps: {
  include: ['@nivo/treemap', '@nivo/sunburst', '@nivo/scatterplot']
}
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 7: Commit**

```bash
git add src/components/charts/wrappers/ package.json package-lock.json
git commit -m "feat(charts): add 10 typed Nivo chart wrappers"
```

---

## Task 5: Chart Registry & ChartWidget Dispatcher

**Files:**
- Create: `src/lib/charts/registry.ts`
- Create: `src/components/charts/ChartWidget.tsx`
- Modify: `src/lib/charts/index.ts` (add registry exports)

**Step 1: Create the registry**

```typescript
// src/lib/charts/registry.ts
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
```

**Step 2: Create ChartWidget dispatcher**

```typescript
// src/components/charts/ChartWidget.tsx
import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createChartTheme } from '@/lib/charts/theme';
import { getChart } from '@/lib/charts/registry';
import { ChartCard } from './ChartCard';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLegend } from './ChartLegend';
import type { ChartWidgetProps } from '@/lib/charts/types';

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
  legendItems?: { id: string; label: string; color: string; value?: string | number }[];
  legendPosition?: 'top' | 'bottom' | 'right';
}) {
  // Theme reacts to app theme changes (dark mode, variant switches)
  const { currentTheme } = useTheme();
  const theme = useMemo(() => createChartTheme(preset), [preset, currentTheme]);
  const presetObj = useMemo(() => {
    const { getChartPreset } = require('@/lib/charts/theme');
    return getChartPreset(preset);
  }, [preset]);

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

  // For donut, inject default innerRadius; for area, inject enableArea
  const typeDefaults: Record<string, any> = {
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
```

**Step 3: Update barrel exports**

Add to `src/lib/charts/index.ts`:
```typescript
export { registerChart, getChart, listCharts } from './registry';
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/lib/charts/registry.ts src/components/charts/ChartWidget.tsx src/lib/charts/index.ts
git commit -m "feat(charts): add chart registry and ChartWidget dispatcher"
```

---

## Task 6: Sample Data & Showcase Page

**Files:**
- Create: `src/lib/charts/sample-data.ts`
- Modify: `src/pages/NivoShowcase.tsx` (replace existing content — route already exists at `/nivo-showcase` in `src/App.tsx:83`)

**Step 1: Create sample data for all 12 chart types**

```typescript
// src/lib/charts/sample-data.ts
// Typed sample data matching Nivo's expected shapes for each chart type.
// Values are realistic social media analytics numbers.

export const sampleBarData = [
  { country: 'United States', '2010': 310, '2020': 331 },
  { country: 'Russia', '2010': 143, '2020': 146 },
  { country: 'Ukraine', '2010': 45, '2020': 44 },
  { country: 'India', '2010': 1210, '2020': 1380 },
];

export const sampleLineData = [
  { id: 'Views', data: [
    { x: 'Jan', y: 4200 }, { x: 'Feb', y: 5800 }, { x: 'Mar', y: 5100 },
    { x: 'Apr', y: 7400 }, { x: 'May', y: 6800 }, { x: 'Jun', y: 9200 },
  ]},
  { id: 'Engagement', data: [
    { x: 'Jan', y: 1800 }, { x: 'Feb', y: 2400 }, { x: 'Mar', y: 2100 },
    { x: 'Apr', y: 3200 }, { x: 'May', y: 2900 }, { x: 'Jun', y: 4100 },
  ]},
];

export const samplePieData = [
  { id: 'LinkedIn', value: 45, label: 'LinkedIn' },
  { id: 'Twitter', value: 30, label: 'Twitter' },
  { id: 'Instagram', value: 15, label: 'Instagram' },
  { id: 'TikTok', value: 10, label: 'TikTok' },
];

export const sampleHeatmapData = [
  { id: 'Mon', data: [{ x: '6am', y: 12 }, { x: '9am', y: 45 }, { x: '12pm', y: 78 }, { x: '3pm', y: 56 }, { x: '6pm', y: 89 }, { x: '9pm', y: 34 }] },
  { id: 'Tue', data: [{ x: '6am', y: 8 }, { x: '9am', y: 52 }, { x: '12pm', y: 65 }, { x: '3pm', y: 71 }, { x: '6pm', y: 92 }, { x: '9pm', y: 28 }] },
  { id: 'Wed', data: [{ x: '6am', y: 15 }, { x: '9am', y: 38 }, { x: '12pm', y: 82 }, { x: '3pm', y: 49 }, { x: '6pm', y: 76 }, { x: '9pm', y: 41 }] },
  { id: 'Thu', data: [{ x: '6am', y: 11 }, { x: '9am', y: 61 }, { x: '12pm', y: 73 }, { x: '3pm', y: 58 }, { x: '6pm', y: 85 }, { x: '9pm', y: 37 }] },
  { id: 'Fri', data: [{ x: '6am', y: 9 }, { x: '9am', y: 42 }, { x: '12pm', y: 68 }, { x: '3pm', y: 45 }, { x: '6pm', y: 71 }, { x: '9pm', y: 52 }] },
];

export const sampleRadarData = [
  { metric: 'Engagement', LinkedIn: 85, Twitter: 72, Instagram: 91 },
  { metric: 'Reach', LinkedIn: 68, Twitter: 89, Instagram: 76 },
  { metric: 'Growth', LinkedIn: 45, Twitter: 62, Instagram: 83 },
  { metric: 'Consistency', LinkedIn: 92, Twitter: 55, Instagram: 71 },
  { metric: 'Virality', LinkedIn: 38, Twitter: 81, Instagram: 94 },
];

export const sampleTreemapData = {
  name: 'content',
  children: [
    { name: 'Articles', children: [
      { name: 'How-to', value: 450 }, { name: 'News', value: 320 }, { name: 'Opinion', value: 180 },
    ]},
    { name: 'Videos', children: [
      { name: 'Short-form', value: 380 }, { name: 'Long-form', value: 220 },
    ]},
    { name: 'Images', children: [
      { name: 'Infographics', value: 290 }, { name: 'Photos', value: 160 },
    ]},
  ],
};

export const sampleSunburstData = sampleTreemapData; // Same hierarchical shape

export const sampleBumpData = [
  { id: 'LinkedIn', data: [{ x: 'Jan', y: 1 }, { x: 'Feb', y: 2 }, { x: 'Mar', y: 1 }, { x: 'Apr', y: 1 }, { x: 'May', y: 2 }, { x: 'Jun', y: 1 }] },
  { id: 'Twitter', data: [{ x: 'Jan', y: 2 }, { x: 'Feb', y: 1 }, { x: 'Mar', y: 3 }, { x: 'Apr', y: 2 }, { x: 'May', y: 1 }, { x: 'Jun', y: 3 }] },
  { id: 'Instagram', data: [{ x: 'Jan', y: 3 }, { x: 'Feb', y: 3 }, { x: 'Mar', y: 2 }, { x: 'Apr', y: 3 }, { x: 'May', y: 3 }, { x: 'Jun', y: 2 }] },
];

export const sampleFunnelData = [
  { id: 'Impressions', value: 15000, label: 'Impressions' },
  { id: 'Clicks', value: 4200, label: 'Clicks' },
  { id: 'Signups', value: 1100, label: 'Signups' },
  { id: 'Conversions', value: 320, label: 'Conversions' },
];

export const sampleScatterData = [
  { id: 'Posts', data: [
    { x: 120, y: 4.2 }, { x: 340, y: 6.1 }, { x: 560, y: 3.8 },
    { x: 780, y: 8.2 }, { x: 210, y: 5.1 }, { x: 450, y: 7.4 },
    { x: 680, y: 2.9 }, { x: 890, y: 9.1 }, { x: 150, y: 3.5 },
    { x: 520, y: 6.8 },
  ]},
];
```

**Step 2: Rewrite NivoShowcase page using ChartWidget**

Replace the contents of `src/pages/NivoShowcase.tsx` with a showcase that:
- Renders every registered chart type in a responsive grid
- Has a toggle between `brand` and `figma-kit` presets at the top
- Each chart is wrapped in `ChartWidget` with sample data
- Only accessible in dev mode (`import.meta.env.DEV`)

**Step 3: Verify the page renders**

Run: `npm run dev`
Navigate to: `http://localhost:8080/nivo-showcase`
Expected: Grid of all 12 chart types rendered with sample data, preset toggle works.

**Step 4: Commit**

```bash
git add src/lib/charts/sample-data.ts src/pages/NivoShowcase.tsx
git commit -m "feat(charts): add sample data and rewrite showcase page with ChartWidget"
```

---

## Task 7: Vite Config & Dependency Verification

**Files:**
- Modify: `vite.config.ts` (add `optimizeDeps.include` if needed)

**Step 1: Install new packages and test dev server**

Run: `npm run dev`

If the dev server throws ESM/CJS errors related to Nivo or D3 packages, add to `vite.config.ts`:

```typescript
optimizeDeps: {
  include: ['@nivo/treemap', '@nivo/sunburst', '@nivo/scatterplot']
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit if config changed**

```bash
git add vite.config.ts
git commit -m "fix: add nivo packages to vite optimizeDeps"
```

---

## Future Tasks (not in this plan — deferred)

- **Migrate existing 18 charts** to use `ChartWidget` + shared components (Phase 3 from design doc)
- **Wire real data hooks** into registry definitions (Phase 4)
- **Fix theme reactivity** in existing V2 widgets (add `currentTheme` to `useMemo` deps)
- **Remove duplicated `formatNumber`** from individual chart files after migration
- **Add D3 escape hatch** for exotic chart types (Sankey, candlestick, Gantt, gauge)
- **Remove unused packages:** `@nivo/bump` and `@nivo/funnel` are now used; `recharts` is still unused
