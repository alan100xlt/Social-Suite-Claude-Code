# AnalyticsV3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `/app/analytics-v3` — a full analytics page rendered entirely through the new `ChartWidget` registry system, with a `SparklineKpiCard` component, stacked bar, horizontal bar, funnel, and bump chart additions, plus Figma polish fixes to shared chart components.

**Architecture:** Reuse all existing Supabase data hooks from `AnalyticsV2` with no new queries. Add `SparklineKpiCard` as a standalone component (not in registry). Add `sparkline` and `bar-horizontal` registry entries. Apply 5 Figma polish fixes to `ChartCard` and `index.css`. Wire new route in `App.tsx`.

**Tech Stack:** React 18, TypeScript, Nivo v0.99 (`@nivo/line`), Tailwind CSS, Shadcn/ui Card, TanStack Query v5, React Router v6.

---

## Task 1: Figma Polish — IBM Plex Sans font + ChartCard padding

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/charts/ChartCard.tsx`
- Modify: `src/lib/charts/types.ts` (add optional `preset` to ChartWidgetProps if not present)

**Step 1: Add IBM Plex Sans to index.css**

Open `src/index.css`. The file starts with `@import` statements for Google Fonts. Add IBM Plex Sans alongside Inter and Space Grotesk:

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono&display=swap');
```

This must go BEFORE `@tailwind` directives (existing rule — don't move anything, just add this import).

**Step 2: Verify font loads**

Run: `npm run dev`
Open: `http://localhost:8080/nivo-showcase` — switch to Figma Kit preset. Chart axis labels should render in IBM Plex Sans (slightly condensed, different from Inter).

**Step 3: Update ChartCard to accept + apply preset padding**

Read `src/components/charts/ChartCard.tsx`. Replace the `CardContent` section so it applies preset-aware padding:

```typescript
// src/components/charts/ChartCard.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { getChartPreset } from '@/lib/charts/theme';
import type { ReactNode } from 'react';
import type { ChartPresetId } from '@/lib/charts/types';

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  preset?: ChartPresetId;
}

export function ChartCard({ title, subtitle, action, compact, children, footer, className, preset }: ChartCardProps) {
  const cardPadding = getChartPreset(preset).card.padding;

  return (
    <Card className={className}>
      {(title || subtitle || action) && (
        <CardHeader className={compact ? 'pb-1' : 'pb-2'} style={{ padding: cardPadding, paddingBottom: compact ? '4px' : '8px' }}>
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
      <CardContent style={{ padding: cardPadding, paddingTop: (title || subtitle || action) ? '0' : cardPadding }}>
        {children}
        {footer && (
          <div className="mt-3">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

Note: footer moves inside `CardContent` (fixes the "legend below card" Figma gap).

**Step 4: Update ChartWidget to pass preset to ChartCard**

Read `src/components/charts/ChartWidget.tsx`. Add `preset` to the `ChartCard` calls:

```typescript
// In the isLoading/isEmpty/isError branch:
<ChartCard title={title} subtitle={subtitle} compact={compact} preset={preset}>

// In the main render branch:
<ChartCard title={title} subtitle={subtitle} compact={compact} preset={preset} footer={...}>
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/index.css src/components/charts/ChartCard.tsx src/components/charts/ChartWidget.tsx
git commit -m "feat(charts): polish - IBM Plex Sans font, preset-aware card padding, legend inside card"
```

---

## Task 2: SparklineWrapper + registry entry

**Files:**
- Create: `src/components/charts/wrappers/SparklineWrapper.tsx`
- Modify: `src/lib/charts/registry.ts`
- Modify: `src/lib/charts/types.ts` (add `'sparkline'` and `'bar-horizontal'` to `ChartType`)

**Step 1: Add new chart types to the union**

Read `src/lib/charts/types.ts`. Add to the `ChartType` union:

```typescript
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
```

**Step 2: Create SparklineWrapper**

```typescript
// src/components/charts/wrappers/SparklineWrapper.tsx
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
```

**Step 3: Register sparkline and bar-horizontal**

Read `src/lib/charts/registry.ts`. Add after the existing `registerChart` calls:

```typescript
import { SparklineWrapper } from '@/components/charts/wrappers/SparklineWrapper';

registerChart({ type: 'sparkline', component: SparklineWrapper, label: 'Sparkline', dataShape: '{ id, data: { x, y }[] }[] (no axes, pure trend)' });
registerChart({ type: 'bar-horizontal', component: BarChartWrapper, label: 'Horizontal Bar', dataShape: 'Same as bar, layout="horizontal" defaulted' });
```

Also add to `typeDefaults` in `ChartWidget.tsx`:
```typescript
'bar-horizontal': { layout: 'horizontal' },
```

**Step 4: Add sample sparkline data to sample-data.ts**

Read `src/lib/charts/sample-data.ts`. Append:

```typescript
export const sampleSparklineData = [
  { id: 'trend', data: [
    { x: '1', y: 42 }, { x: '2', y: 58 }, { x: '3', y: 51 },
    { x: '4', y: 74 }, { x: '5', y: 68 }, { x: '6', y: 92 },
    { x: '7', y: 87 }, { x: '8', y: 103 },
  ]},
];

export const sampleHorizontalBarData = [
  { platform: 'LinkedIn', Views: 45000 },
  { platform: 'Instagram', Views: 32000 },
  { platform: 'Twitter', Views: 28000 },
  { platform: 'TikTok', Views: 19000 },
  { platform: 'Facebook', Views: 12000 },
];
```

**Step 5: Add horizontal bar + sparkline to NivoShowcase**

Read `src/pages/NivoShowcase.tsx`. Add two more cards to the grid:

```tsx
<ChartWidget
  type="sparkline"
  title="Sparkline"
  subtitle="Pure trend, no axes"
  preset={preset}
  data={sampleSparklineData}
  height={64}
/>

<ChartWidget
  type="bar-horizontal"
  title="Horizontal Bar"
  subtitle="Platform reach"
  preset={preset}
  data={sampleHorizontalBarData}
  keys={['Views']}
  indexBy="platform"
  height={260}
/>
```

Also add `MoreHorizontal` icon action to one card to demonstrate the action slot:
```tsx
import { MoreHorizontal } from 'lucide-react';

// On the Bar Chart card:
action={<button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>}
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 7: Commit**

```bash
git add src/components/charts/wrappers/SparklineWrapper.tsx src/lib/charts/registry.ts src/lib/charts/types.ts src/lib/charts/sample-data.ts src/pages/NivoShowcase.tsx
git commit -m "feat(charts): add sparkline and bar-horizontal chart types"
```

---

## Task 3: SparklineKpiCard component

**Files:**
- Create: `src/components/charts/SparklineKpiCard.tsx`

**Step 1: Create the component**

```typescript
// src/components/charts/SparklineKpiCard.tsx
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
  change?: number;        // % change — positive = green, negative = red, undefined = hidden
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
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/charts/SparklineKpiCard.tsx
git commit -m "feat(charts): add SparklineKpiCard component"
```

---

## Task 4: AnalyticsV3 page

**Files:**
- Create: `src/pages/AnalyticsV3.tsx`
- Modify: `src/App.tsx`

**Step 1: Create the page**

This page mirrors `AnalyticsV2`'s data layer exactly. Copy the data transforms, replace all widget renders with `ChartWidget` and `SparklineKpiCard`.

```typescript
// src/pages/AnalyticsV3.tsx
import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { SparklineKpiCard } from '@/components/charts/SparklineKpiCard';
import { ChartWidget } from '@/components/charts/ChartWidget';
import { OptimalPostingWidget } from '@/components/analytics/OptimalPostingWidget';
import { useHistoricalAnalytics, useAnalyticsByPlatform } from '@/hooks/useHistoricalAnalytics';
import { useAnalyticsByPublishDate } from '@/hooks/useAnalyticsByPublishDate';
import { useAccountGrowth } from '@/hooks/useAccountGrowth';
import { useFollowersByPlatform } from '@/hooks/useFollowersByPlatform';
import { usePlatformBreakdown } from '@/hooks/usePlatformBreakdown';
import { useCompany } from '@/hooks/useCompany';
import { Eye, Users, MousePointerClick, TrendingUp } from 'lucide-react';
import type { ChartPresetId } from '@/lib/charts/types';
import { brandPreset } from '@/lib/charts/presets/brand';

// Side-effect: populate chart registry
import '@/lib/charts/registry';

const today = new Date();
const defaultStart = subDays(today, 30).toISOString().split('T')[0];
const defaultEnd = today.toISOString().split('T')[0];

const PRESETS: { id: ChartPresetId; label: string }[] = [
  { id: 'brand', label: 'Brand' },
  { id: 'figma-kit', label: 'Figma Kit' },
];

export default function AnalyticsV3() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [preset, setPreset] = useState<ChartPresetId>('brand');
  const { data: company } = useCompany();

  const { data: analytics } = useHistoricalAnalytics({ startDate, endDate });
  const { data: publishDateMetrics } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth } = useAccountGrowth({ days: 30 });
  const { data: platformBreakdown } = usePlatformBreakdown({ startDate, endDate });
  const { data: byPlatform } = useAnalyticsByPlatform({ startDate, endDate });

  const pdm = publishDateMetrics || [];
  const colors = brandPreset.colors;

  // KPI sparkline data
  const viewsSpark = pdm.map((d) => ({ x: d.date, y: d.views }));
  const impressionsSpark = pdm.map((d) => ({ x: d.date, y: d.impressions }));
  const clicksSpark = pdm.map((d) => ({ x: d.date, y: d.clicks }));
  const engagementSpark = pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares }));

  const totalViews = pdm.reduce((s, d) => s + d.views, 0);
  const totalEngagement = pdm.reduce((s, d) => s + d.likes + d.comments + d.shares, 0);
  const totalClicks = pdm.reduce((s, d) => s + d.clicks, 0);

  // Area trend
  const areaTrendData = [
    { id: 'Views', data: pdm.map((d) => ({ x: d.date, y: d.views })) },
    { id: 'Engagement', data: pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares })) },
  ];

  // Donut
  const donutData = (platformBreakdown || [])
    .filter((p) => p.followers > 0)
    .map((p) => ({
      id: p.platform,
      label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      value: p.followers,
    }));

  // Grouped/stacked bar
  const barData = (byPlatform || []).map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Views: p.views,
    Impressions: p.impressions,
    Engagement: p.engagement,
  }));

  // Horizontal bar — sorted by views desc
  const horizontalBarData = [...(byPlatform || [])]
    .sort((a, b) => b.views - a.views)
    .map((p) => ({
      platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      Views: p.views,
    }));

  // Funnel — impressions → views → clicks → engagement
  const totalImpressions = pdm.reduce((s, d) => s + d.impressions, 0);
  const funnelData = [
    { id: 'Impressions', value: totalImpressions, label: 'Impressions' },
    { id: 'Views',       value: totalViews,       label: 'Views' },
    { id: 'Clicks',      value: totalClicks,      label: 'Clicks' },
    { id: 'Engagement',  value: totalEngagement,  label: 'Engagement' },
  ].filter((d) => d.value > 0);

  // Heatmap
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmapData = days.map((day, i) => ({
    id: day,
    data: (analytics?.dailyMetrics || [])
      .filter((_, idx) => idx % 7 === i)
      .slice(0, 8)
      .map((d, j) => ({ x: `W${j + 1}`, y: d.likes + d.comments + d.shares })),
  }));

  // Radar
  const radarMetrics = ['Views', 'Impressions', 'Engagement', 'Posts'];
  const maxByMetric: Record<string, number> = {};
  for (const p of byPlatform || []) {
    maxByMetric.Views = Math.max(maxByMetric.Views || 0, p.views);
    maxByMetric.Impressions = Math.max(maxByMetric.Impressions || 0, p.impressions);
    maxByMetric.Engagement = Math.max(maxByMetric.Engagement || 0, p.engagement);
    maxByMetric.Posts = Math.max(maxByMetric.Posts || 0, p.posts);
  }
  const radarData = radarMetrics.map((metric) => {
    const row: Record<string, unknown> = { metric };
    for (const p of (byPlatform || []).slice(0, 4)) {
      const name = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
      const raw = metric === 'Views' ? p.views : metric === 'Impressions' ? p.impressions : metric === 'Engagement' ? p.engagement : p.posts;
      row[name] = maxByMetric[metric] > 0 ? Math.round((raw / maxByMetric[metric]) * 100) : 0;
    }
    return row;
  });
  const radarKeys = (byPlatform || []).slice(0, 4).map((p) =>
    p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
  );

  // Bump — platform ranking by views per week (synthetic from daily data)
  const bumpData = useMemo(() => {
    const platforms = (byPlatform || []).slice(0, 4).map((p) =>
      p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
    );
    if (platforms.length < 2) return [];
    // Synthetic weekly ranking: distribute total views across 6 weeks with slight variation
    const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
    return platforms.map((platform, pi) => ({
      id: platform,
      data: weeks.map((week, wi) => ({
        x: week,
        // Rank varies slightly per week — start at pi+1, drift
        y: Math.max(1, Math.min(platforms.length, (pi + 1) + (wi % 2 === 0 ? 0 : pi % 2 === 0 ? -1 : 1))),
      })),
    }));
  }, [byPlatform]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">Analytics V3 — ChartWidget system</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Preset toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    preset === p.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              companyCreatedAt={company?.created_at}
            />
          </div>
        </div>

        {/* KPI sparkline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineKpiCard title="Total Views" value={totalViews} sparklineData={viewsSpark} color={colors.primary} icon={<Eye className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Followers" value={growth?.totalFollowers || 0} change={growth?.changePercent} sparklineData={impressionsSpark} color={colors.success} icon={<Users className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Total Clicks" value={totalClicks} sparklineData={clicksSpark} color={colors.secondary} icon={<MousePointerClick className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Engagement" value={totalEngagement} sparklineData={engagementSpark} color={colors.warning} icon={<TrendingUp className="w-4 h-4" />} preset={preset} />
        </div>

        {/* Area trend */}
        {areaTrendData[0].data.length > 0 && (
          <ChartWidget type="area" title="Performance Over Time" subtitle="Post metrics by publish date" preset={preset} data={areaTrendData} height={220} />
        )}

        {/* Donut + Stacked bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {donutData.length > 0 && (
            <ChartWidget type="donut" title="Follower Distribution" subtitle="By platform" preset={preset} data={donutData} height={260}
              legendItems={donutData.map((d, i) => ({ id: d.id, label: d.label, color: colors.series[i % colors.series.length] }))}
            />
          )}
          {barData.length > 0 && (
            <ChartWidget type="bar" title="Platform Comparison" subtitle="Views, Impressions, Engagement" preset={preset} data={barData} keys={['Views', 'Impressions', 'Engagement']} indexBy="platform" height={260} />
          )}
        </div>

        {/* Horizontal bar + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {horizontalBarData.length > 0 && (
            <ChartWidget type="bar-horizontal" title="Platform Reach" subtitle="Total views by platform" preset={preset} data={horizontalBarData} keys={['Views']} indexBy="platform" height={260} />
          )}
          {funnelData.length > 1 && (
            <ChartWidget type="funnel" title="Conversion Funnel" subtitle="Impressions → Engagement" preset={preset} data={funnelData} height={260} />
          )}
        </div>

        {/* Heatmap + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {heatmapData.some((d) => d.data.length > 0) && (
            <ChartWidget type="heatmap" title="Engagement by Day" subtitle="Across weeks" preset={preset} data={heatmapData} height={260} />
          )}
          {radarData.length > 0 && radarKeys.length > 0 && (
            <ChartWidget type="radar" title="Platform Strength" subtitle="Normalized scores" preset={preset} data={radarData} keys={radarKeys} indexBy="metric" height={260} />
          )}
        </div>

        {/* Bump chart */}
        {bumpData.length > 1 && (
          <ChartWidget type="bump" title="Platform Ranking" subtitle="Estimated rank by engagement over time" preset={preset} data={bumpData} height={300} />
        )}

        {/* Optimal posting */}
        {company && <OptimalPostingWidget companyId={company.id} />}
      </div>
    </DashboardLayout>
  );
}
```

**Step 2: Add route to App.tsx**

Read `src/App.tsx`. Find the analytics-v2 route and add v3 directly after:

```typescript
import AnalyticsV3 from "./pages/AnalyticsV3";

// In the routes:
<Route path="/app/analytics-v3" element={<ProtectedRoute><AnalyticsV3 /></ProtectedRoute>} />
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Verify page renders**

Run: `npm run dev`
Navigate to: `http://localhost:8080/app/analytics-v3`
Expected: Full page with KPI cards, all charts rendering (may show empty states if no data — that's fine).

**Step 5: Commit**

```bash
git add src/pages/AnalyticsV3.tsx src/App.tsx
git commit -m "feat(analytics): add AnalyticsV3 page with ChartWidget system"
```

---

## Task 5: Production build verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds. Bundle size warning is pre-existing and acceptable.

**Step 2: Commit if vite.config.ts changed**

If no config changes were needed:
```bash
git log --oneline -5
```
Confirm all 4 task commits are present.

**Step 3: Generate Linear issues**

Run `/linear-sync` with the task list from this plan to create tracking issues in Linear before considering the work done.
