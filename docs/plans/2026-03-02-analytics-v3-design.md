# AnalyticsV3 — Design Document

**Date:** 2026-03-02
**Status:** Approved
**Route:** `/app/analytics-v3`

---

## Goal

Build `AnalyticsV3` — a new analytics page at `/app/analytics-v3` that renders all charts through the new `ChartWidget` + registry system built in the scalable-chart-system plan. Also applies the Figma polish fixes identified during the review of the Figma Charts UI Kit.

`AnalyticsV2` is left intact at `/app/analytics-v2` for side-by-side comparison.

---

## Architecture

### Data Layer
Reuse all existing hooks from `AnalyticsV2` — no new Supabase queries:
- `useHistoricalAnalytics` — daily metrics
- `useAnalyticsByPublishDate` — sparkline + area trend data
- `useAccountGrowth` — follower total + change %
- `usePlatformBreakdown` — donut data
- `useFollowersByPlatform` — follower counts per platform
- `useAnalyticsByPlatform` — bar, radar, bump, funnel data
- `useCompany` — for OptimalPostingWidget

### New Component: `SparklineKpiCard`

**Not** in the registry — sparklines are a UI pattern, not a swappable chart type.

Location: `src/components/charts/SparklineKpiCard.tsx`

Props:
```typescript
interface SparklineKpiCardProps {
  title: string;
  value: number;
  change?: number;        // % change, positive = green, negative = red
  sparklineData: { x: string; y: number }[];
  color: string;
  icon?: ReactNode;
  preset?: ChartPresetId;
}
```

Internals:
- Uses `createChartTheme(preset)` for the Nivo theme
- Renders `ResponsiveLine` with `enableArea=true`, no axes, no grid, no points, no crosshair — pure visual trend at ~64px height
- Number formatted via `formatNumber(value)`
- Change badge: green `▲ X%` or red `▼ X%`
- Card shell: `ChartCard` with no title/subtitle (title sits above the sparkline inside the card body)

### Registry Additions

Two new entries added to `registry.ts`:
- `'sparkline'` → `SparklineWrapper` — minimal line with area, no axes, ~64px tall. Used internally by `SparklineKpiCard`.
- `'bar-horizontal'` → `BarChartWrapper` with `layout="horizontal"` defaulted

### Polish Fixes (applied to shared components)

These fix the gaps identified vs. the Figma Charts UI Kit:

1. **`ChartCard` preset-aware padding** — accept optional `preset` prop, apply `preset.card.padding` to `CardContent` instead of Shadcn default
2. **Legend inside card** — move `ChartLegend` footer inside `CardContent` bottom, not below it
3. **`...` action slot** — add `MoreHorizontal` icon button to `ChartCard` `action` prop in showcase
4. **Horizontal bar in showcase** — add one `bar-horizontal` example to `NivoShowcase`
5. **IBM Plex Sans font** — add `@import` for IBM Plex Sans to `src/index.css` (already has Inter + Space Grotesk)

---

## Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Insights V3          [Brand|Figma Kit]  [DateFilter] │
├──────────┬──────────┬──────────┬───────────────────-─┤
│ Views KPI│Followers │  Clicks  │    Engagement        │
│ sparkline│ sparkline│ sparkline│    sparkline         │
├──────────┴──────────┴──────────┴────────────────────-┤
│              Area Trend (full width)                  │
│              Views + Engagement over time             │
├─────────────────────────┬───────────────────────────-┤
│   Follower Distribution │   Platform Comparison       │
│   Donut                 │   Grouped/Stacked Bar       │
├─────────────────────────┬───────────────────────────-┤
│   Platform Reach        │   Conversion Funnel         │
│   Horizontal Bar        │   Impressions→Clicks→Eng    │
├─────────────────────────┬───────────────────────────-┤
│   Engagement Heatmap    │   Platform Strength Radar   │
│   (day × week)          │                             │
├─────────────────────────┴───────────────────────────-┤
│              Platform Ranking (Bump chart, full width)│
├─────────────────────────────────────────────────────-┤
│              Optimal Posting Widget (reused)          │
└─────────────────────────────────────────────────────-┘
```

---

## Data Transforms

### Funnel data (new)
Derived from `byPlatform` totals:
```typescript
const funnelData = [
  { id: 'Impressions', value: totalImpressions, label: 'Impressions' },
  { id: 'Views',       value: totalViews,       label: 'Views' },
  { id: 'Clicks',      value: totalClicks,      label: 'Clicks' },
  { id: 'Engagement',  value: totalEngagement,  label: 'Engagement' },
];
```

### Bump data (new)
Derived from `byPlatform` — rank platforms by views per period. Since we only have aggregate data (not time-sliced), use `publishDateMetrics` grouped into weekly buckets, rank platforms by total engagement per week.

### Horizontal bar data (new)
`byPlatform` sorted descending by `views`, displayed as horizontal bars — one bar per platform.

---

## File Changes

| File | Action |
|------|--------|
| `src/components/charts/SparklineKpiCard.tsx` | Create |
| `src/components/charts/wrappers/SparklineWrapper.tsx` | Create |
| `src/lib/charts/registry.ts` | Modify — add `sparkline`, `bar-horizontal` |
| `src/components/charts/ChartCard.tsx` | Modify — preset-aware padding, legend inside |
| `src/lib/charts/sample-data.ts` | Modify — add sparkline sample data |
| `src/pages/NivoShowcase.tsx` | Modify — add horizontal bar + `...` action |
| `src/index.css` | Modify — add IBM Plex Sans @import |
| `src/pages/AnalyticsV3.tsx` | Create |
| `src/App.tsx` | Modify — add `/app/analytics-v3` route |

---

## Out of Scope

- Migrating existing V1/V2 charts to ChartWidget (deferred per plan)
- Real-time data (polling, subscriptions)
- Export/download functionality
- Mobile-specific layouts
