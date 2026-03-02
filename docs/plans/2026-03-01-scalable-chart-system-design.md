# Scalable Chart System — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Nivo-only, ~15 chart types, themeable presets, dispatcher registry

## Problem

The current analytics system has 18 chart components across two generations (V1 and V2) with significant duplication:
- `formatNumber` copy-pasted 8+ times
- Custom tooltip re-implemented in every chart
- Empty states unshared
- Card shell pattern duplicated independently
- V1 charts use a static theme that doesn't respond to dark mode
- No way to add new chart types without writing a full component from scratch
- No theming flexibility for reuse across multiple apps

## Goals

1. **Scalable:** Adding a new standard chart type is a registry entry + thin wrapper, not a full component
2. **Themeable:** Chart visual style (colors, fonts, shadows) controlled by presets switchable at runtime
3. **Deduplicated:** Shared tooltip, legend, card shell, empty state, and formatters
4. **Incremental:** Existing charts continue working; migration is opt-in, one chart at a time
5. **Type-safe:** Each chart type retains its own TypeScript generics; no `any` escapes

## Non-Goals

- Exotic chart types (Sankey, candlestick, Gantt, gauge) — deferred to future D3 escape hatch
- Replacing the existing metrics registry — we extend it, not replace it
- Lazy loading charts — deferred (the bundle is already ~2.6MB; this is a separate optimization)

## Architecture

### File Structure

```
src/lib/charts/
  types.ts              — ChartType, ChartDefinition, ChartThemePreset, ChartConfig
  theme.ts              — createChartTheme(preset?) reads CSS vars + applies preset overrides
  registry.ts           — chartRegistry map + register/lookup + list functions
  presets/
    brand.ts            — Current navy/orange palette, Inter + Space Grotesk
    figma-kit.ts        — Setproduct purple #855CF8, IBM Plex Sans
  sample-data.ts        — Typed mock data for every chart type
  formatters.ts         — formatNumber, formatPercent, formatCompact (extracted from 8+ copies)

src/components/charts/
  ChartCard.tsx          — Card shell: header (title, subtitle, action), body slot, footer slot
  ChartTooltip.tsx       — Unified Nivo tooltip component
  ChartLegend.tsx        — Configurable legend (position, items, dot style)
  ChartEmptyState.tsx    — Empty / loading / error states
  ChartWidget.tsx        — Dispatcher: looks up registry → renders correct wrapper
  wrappers/
    BarChartWrapper.tsx        — @nivo/bar (vertical, horizontal, stacked, grouped)
    LineChartWrapper.tsx       — @nivo/line (line + area via enableArea)
    PieChartWrapper.tsx        — @nivo/pie (pie + donut via innerRadius)
    HeatmapChartWrapper.tsx    — @nivo/heatmap
    RadarChartWrapper.tsx      — @nivo/radar
    TreemapChartWrapper.tsx    — @nivo/treemap
    SunburstChartWrapper.tsx   — @nivo/sunburst (external legend — no built-in support)
    BumpChartWrapper.tsx       — @nivo/bump (gap-fill normalization for consistent x-values)
    FunnelChartWrapper.tsx     — @nivo/funnel
    ScatterChartWrapper.tsx    — @nivo/scatterplot
```

### 1. Theme System (`src/lib/charts/theme.ts`)

Replaces the current split of `nivoTheme` (static) + `buildNivoThemeV2()` (dynamic) with a single unified function.

```typescript
type ChartThemePreset = 'brand' | 'figma-kit' | string;

function createChartTheme(preset?: ChartThemePreset): PartialTheme
```

**How it works:**
1. Reads CSS custom properties from `:root` (`--foreground`, `--muted-foreground`, `--border`, `--card`) — this is how dark mode and all 6 theme variants are automatically supported
2. Overlays preset-specific values (colors, fonts, shadows) on top of the CSS-derived base
3. Returns a `PartialTheme` compatible with all Nivo components

**Presets:**
- `brand` — produces identical output to current `buildNivoThemeV2()`. Inter + Space Grotesk, navy/orange `chartColors`
- `figma-kit` — IBM Plex Sans, purple `#855CF8` palette, Setproduct card shadows

**Critical fix — theme reactivity:**

Current V2 widgets call `useMemo(() => buildNivoThemeV2(), [])` with no dependencies. This means theme switching (e.g., professional → dark-pro) does NOT update chart colors. Nivo charts are internally `React.memo`'d and only re-render when props change.

All consumers must pass the app theme variant as a dependency:

```typescript
const { variant } = useTheme();
const chartTheme = useMemo(() => createChartTheme('brand'), [variant]);
```

The `ChartWidget` dispatcher handles this automatically — individual wrappers don't need to worry about it.

**Color palette structure per preset:**

```typescript
interface ChartPresetColors {
  primary: string;
  primaryLight: string;
  secondary: string;
  series: string[];        // 5-8 colors for multi-series charts
  success: string;
  warning: string;
  error: string;
  // Platform-specific (optional, falls back to series)
  platforms?: Record<string, string>;
}
```

### 2. Chart Registry (`src/lib/charts/registry.ts`)

A typed map from chart type + variant → wrapper component + default config.

```typescript
interface ChartDefinition {
  type: ChartType;                          // 'bar' | 'line' | 'area' | 'pie' | 'donut' | etc.
  component: React.ComponentType<any>;      // The wrapper component
  defaultConfig: Partial<ChartConfig>;      // Defaults for this chart type
  dataShape: string;                        // Documentation: expected data format
}

const chartRegistry = new Map<ChartType, ChartDefinition>();
```

**Why dispatcher, not mega-renderer:**

Each Nivo component has different `TDatum` generics and different `layers` prop types. A single component that switches on `type` would require complex conditional types or `any` escapes. Instead, `ChartWidget` is a thin dispatcher:

```typescript
function ChartWidget({ type, preset, ...chartProps }) {
  const { variant } = useTheme();
  const theme = useMemo(() => createChartTheme(preset), [preset, variant]);
  const definition = chartRegistry.get(type);
  const Component = definition.component;

  return (
    <ChartCard title={chartProps.title} subtitle={chartProps.subtitle}>
      <Component theme={theme} {...chartProps} />
    </ChartCard>
  );
}
```

Each wrapper handles its own Nivo-specific props with proper TypeScript generics.

### 3. Shared Components

**`ChartCard`** — replaces the Card + CardHeader + CardContent pattern duplicated across all 18 charts:
- Props: `title`, `subtitle`, `action` (menu/button slot), `compact` (boolean), `height`, `children`
- Renders: Shadcn `Card` with consistent padding, header layout, and body sizing

**`ChartTooltip`** — unified tooltip replacing 18 copies of the same pattern:
- Props: `items: { label, value, color }[]`, `title?`
- Styled: `bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm`
- Passed to Nivo charts via the `tooltip` prop

**`ChartLegend`** — configurable legend:
- Props: `items: { id, label, color }[]`, `position: 'top' | 'bottom' | 'right'`
- Renders colored dots + labels. Used for all charts, but especially for sunburst (no built-in legend)

**`ChartEmptyState`** — empty/loading/error states:
- Props: `isLoading`, `isEmpty`, `isError`, `message?`, `icon?`
- Renders appropriate state with consistent styling

**`formatters.ts`** — extracted from 8+ duplicates:
- `formatNumber(n)` — compact notation (1.1K, 1.1M)
- `formatPercent(n)` — percentage with 1 decimal
- `formatCompact(n)` — shorter compact notation

### 4. Chart Type Wrappers

Each wrapper is a thin component that:
1. Accepts typed props specific to that chart type
2. Applies the theme
3. Renders the Nivo Responsive component
4. Uses shared `ChartTooltip` and `ChartLegend`

**Per-type notes:**

| Wrapper | Nivo Component | Special Handling |
|---|---|---|
| `BarChartWrapper` | `ResponsiveBar` | `groupMode` + `layout` variants via props. Legend uses `dataFrom: 'keys'` for grouped. |
| `LineChartWrapper` | `ResponsiveLine` | `enableArea` prop for area charts. Gradient defs from theme preset. `enableSlices="x"` for slice tooltips. |
| `PieChartWrapper` | `ResponsivePie` | `innerRadius` prop distinguishes pie (0) from donut (0.55-0.72). Optional center text via custom SVG layer. |
| `HeatmapChartWrapper` | `ResponsiveHeatMap` | Row-based data: `{ id, data: { x, y }[] }[]`. Sequential color scheme from preset. |
| `RadarChartWrapper` | `ResponsiveRadar` | `keys` + `indexBy` props. Platform colors from preset. |
| `TreemapChartWrapper` | `ResponsiveTreeMap` | Hierarchical data with `children` array. `identity` + `value` field name props. |
| `SunburstChartWrapper` | `ResponsiveSunburst` | Same hierarchical data as treemap. **No built-in legend** — renders `ChartLegend` externally below chart. |
| `BumpChartWrapper` | `ResponsiveBump` | **Gap-fill normalization required**: all series must have identical x-values in same order (Nivo crashes otherwise). Wrapper normalizes data before passing to Nivo. |
| `FunnelChartWrapper` | `ResponsiveFunnel` | Sequential data — array order = funnel step order. |
| `ScatterChartWrapper` | `ResponsiveScatterPlot` | Optional bubble mode via dynamic `nodeSize` accessor. |

### 5. Sample Data & Showcase Page

**`src/lib/charts/sample-data.ts`** — typed mock data for every chart type, shaped to match existing hook return types. Realistic values based on social media analytics domain.

**`src/pages/ChartShowcase.tsx`** — route at `/app/chart-showcase`:
- Grid of all registered chart types with sample data
- Theme preset toggle (brand / figma-kit)
- Each chart rendered in a `ChartCard` showing its registry config
- Admin-only or dev-only (behind `import.meta.env.DEV` check)

### 6. New Dependencies

```
@nivo/treemap@^0.99.0
@nivo/sunburst@^0.99.0
@nivo/scatterplot@^0.99.0
```

Estimated bundle impact: ~300-400KB minified (shared `@nivo/core` already present). Check `vite.config.ts` `optimizeDeps.include` after install — Nivo's D3 sub-dependencies can cause ESM/CJS issues in Vite dev mode.

### 7. Migration Strategy

**No big-bang rewrite.** Phased approach:

1. **Phase 1:** Build infrastructure (theme, registry, shared components, wrappers)
2. **Phase 2:** Build showcase page with all 15 chart types using sample data
3. **Phase 3:** Gradually replace existing V1/V2 components with `ChartWidget` calls — one at a time, as pages are touched
4. **Phase 4:** Wire real data hooks into chart definitions

Old chart components coexist with `ChartWidget` indefinitely. No forced migration deadline.

**V1 → new system migration per chart:** Change `nivoTheme` import to `createChartTheme('brand')`, replace inline Card/tooltip/legend/empty-state with shared components. ~5 min per chart.

## Known Limitations

- **Sunburst:** No built-in Nivo legend — must render externally
- **Bump:** Crashes on inconsistent x-values — wrapper must normalize
- **Tree-shaking:** Nivo packages cannot tree-shake internal tooltip/color machinery even when unused
- **Exotic charts not covered:** Sankey, candlestick, Gantt, gauge, hexbin, cohort — would require D3 escape hatch (future work)
- **Theme reactivity:** Requires passing app theme variant as `useMemo` dependency — `ChartWidget` handles this, but any direct Nivo usage must do it manually

## Estimated Effort (Claude Code sessions)

| Phase | Time | What |
|---|---|---|
| Phase 1: Infrastructure | ~45-60 min | theme.ts, registry.ts, presets, shared components, wrappers |
| Phase 2: Showcase | ~30-45 min | sample data, showcase page, route wiring |
| Phase 3: Migration | ~60-90 min | Migrate 18 existing charts to use shared components |
| Phase 4: Real data | ~30 min | Wire hooks into registry definitions |
| **Total** | **~2.5-3.5 hours** | Across 1-2 sessions |
