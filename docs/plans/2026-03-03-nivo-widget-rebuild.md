# Nivo Widget Library Rebuild — Design Analysis & Approach

**Date:** 2026-03-03
**Status:** Planning
**Effort:** ~12–16 hours across 5–6 sessions
**Approach:** New `widgets-v2/` directory — original widgets preserved
**Figma Source:** [Charts & Infographics UI Kit](https://www.figma.com/design/xaNqSWFRrRlEDyqfVALayS/Figma-Charts---Infographics-UI-kit--Community---Copy-?node-id=1204-273884)

## Goal

Rebuild the analytics-v2 Nivo widget library to match premium Figma chart visualization designs from a Setproduct-style Charts & Infographics UI kit.

## Current Widgets (src/components/analytics-v2/widgets/)

| Widget | Nivo Component | Height | Purpose |
|--------|---|---|---|
| StatSparklineWidget | ResponsiveLine/Bar | 64px | KPI card + sparkline |
| AreaTrendWidget | ResponsiveLine | 380px | Time-series trends |
| BarComparisonWidget | ResponsiveBar | 200px | Category comparison |
| DonutKpiWidget | ResponsivePie | 220px | Distribution donut |
| HeatmapWidget | ResponsiveHeatMap | 280px | Pattern detection |
| RadarStrengthWidget | ResponsiveRadar | 280px | Multi-dimensional |

## Design Principles to Match

1. Rich multi-stop gradient fills (not flat colors)
2. Glassmorphism card wrappers (backdrop-filter blur, semi-transparent bg)
3. Deep vibrant color palettes (purples, teals, corals)
4. Multi-layered shadows for depth
5. Rounded geometry (bar corners, pill shapes, bezier curves)
6. Large bold KPI typography (28-48px) with thin labels
7. Custom inline legends (dot+label, not native)
8. Spring-based animated transitions
9. Subtle dashed/dotted grid lines at low opacity
10. Dark mode with luminous data colors on deep navy/charcoal

## Library Stack Decision

- **Primary:** Nivo (keep, 80% of charts)
- **Card/styling layer:** Custom CSS/Tailwind (glassmorphism, shadows, gradients)
- **Exotic charts:** Visx or ECharts if Nivo can't handle (sankey, treemap, bullet)
- **KPI cards:** Consider Tremor for inspiration but build custom

## Implementation Phases

### Phase 1: Design Foundation
- Premium color palette in nivo-theme.ts (dark + light)
- ChartCard glassmorphism wrapper component
- SVG gradient preset definitions
- Typography scale for KPIs

### Phase 2: Widget Rebuild (6 existing)
- Pull Figma nodes via REST API or MCP when available
- Rebuild each with premium styling, same prop interface
- Dark/light mode support

### Phase 3: New Chart Types
- Treemap (@nivo/treemap)
- Sankey (@nivo/sankey)
- Bullet (@nivo/bullet)
- Gauge/radial (@nivo/radial-bar)
- Funnel (@nivo/funnel)

### Phase 4: Polish
- Enter animations (Framer Motion or CSS)
- Tooltip blur backgrounds
- Hover states on chart elements

## Figma Access

MCP rate-limited. Use REST API:
```
GET https://api.figma.com/v1/files/{fileKey}/nodes?ids={nodeId}
GET https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=2
```
Token: VITE_FIGMA_ACCESS_TOKEN

## Key Files
- `src/lib/nivo-theme.ts` — theme, colors, gradients
- `src/components/analytics-v2/widgets/*.tsx` — all widgets
- `src/pages/AnalyticsV2.tsx` — integration page
