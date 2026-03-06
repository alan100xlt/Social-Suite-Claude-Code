# Dashboard Hero Widget Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 4 dashboard hero KPI widgets so metrics, sparklines, and trends are consistent and respect the date range picker.

**Architecture:** Fix 3 existing hooks (`useDashboardStats`, `useDashboardTrends`, `useAccountGrowth`) and rewire `Index.tsx` sparkline/trend plumbing. No new files, no migrations. The `StatSparklineWidget` already has `secondaryLabel`/`secondaryValue` props we can use for the follower net-change display.

**Tech Stack:** React, TanStack Query, Supabase RPCs, Nivo charts

---

### Task 1: Fix `useAccountGrowth` to accept `startDate`/`endDate`

**Files:**
- Modify: `src/hooks/useAccountGrowth.ts`

**Step 1: Update the interface and hook signature**

Change `AccountGrowthParams` to accept optional `startDate`/`endDate` strings alongside `days`. When `startDate`/`endDate` are provided, use them directly instead of computing from `days`.

```typescript
interface AccountGrowthParams {
  accountId?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}

export function useAccountGrowth(params: AccountGrowthParams = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const days = params.days || 30;

  // Use explicit dates if provided, else compute from days
  const resolvedStart = params.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();
  const resolvedEnd = params.endDate || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['account-growth', companyId, params.accountId, resolvedStart, resolvedEnd],
    queryFn: async (): Promise<AccountGrowthSummary> => {
      if (!companyId) {
        return { dataPoints: [], totalFollowers: 0, followerChange: 0, changePercent: 0 };
      }

      // Fetch time-series within the date range
      let rangeQuery = supabase
        .from('account_analytics_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gte('snapshot_date', resolvedStart)
        .lte('snapshot_date', resolvedEnd)
        .order('snapshot_date', { ascending: true });

      if (params.accountId) {
        rangeQuery = rangeQuery.eq('account_id', params.accountId);
      }

      // Latest snapshot per account (all time) for current total
      let latestQuery = supabase
        .from('account_analytics_snapshots')
        .select('account_id, platform, followers, snapshot_date')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('snapshot_date', { ascending: false });

      if (params.accountId) {
        latestQuery = latestQuery.eq('account_id', params.accountId);
      }

      const [rangeResult, latestResult] = await Promise.all([rangeQuery, latestQuery]);

      if (rangeResult.error) throw new Error('Failed to fetch account growth');

      const dataPoints: GrowthDataPoint[] = (rangeResult.data || []).map(row => ({
        date: row.snapshot_date,
        followers: row.followers,
        following: row.following,
        platform: row.platform,
        accountId: row.account_id,
      }));

      const latestByAccount = new Map<string, number>();
      for (const row of latestResult.data || []) {
        if (!latestByAccount.has(row.account_id)) {
          latestByAccount.set(row.account_id, row.followers);
        }
      }
      const totalFollowers = Array.from(latestByAccount.values()).reduce((a, b) => a + b, 0);

      // Change: earliest in range vs latest in range
      const earliestByAccount = new Map<string, number>();
      const latestInRangeByAccount = new Map<string, number>();
      for (const point of dataPoints) {
        if (!earliestByAccount.has(point.accountId)) {
          earliestByAccount.set(point.accountId, point.followers);
        }
        latestInRangeByAccount.set(point.accountId, point.followers);
      }

      const latestInRangeTotal = Array.from(latestInRangeByAccount.values()).reduce((a, b) => a + b, 0);
      const earliestTotal = Array.from(earliestByAccount.values()).reduce((a, b) => a + b, 0);
      const followerChange = latestInRangeTotal - earliestTotal;
      const changePercent = earliestTotal > 0 ? (followerChange / earliestTotal) * 100 : 0;

      return { dataPoints, totalFollowers, followerChange, changePercent };
    },
    enabled: !!companyId,
  });
}
```

Key changes from current code:
- Added `startDate`/`endDate` optional params
- Query key uses resolved dates instead of `days`
- Range query uses `resolvedStart`/`resolvedEnd` and adds `.lte('snapshot_date', resolvedEnd)` (was missing — only had `gte`)
- Existing `days`-only callers continue to work (backward compatible)

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/hooks/useAccountGrowth.ts
git commit -m "fix: useAccountGrowth accepts startDate/endDate for accurate date filtering"
```

---

### Task 2: Fix `useDashboardTrends` to use actual date range

**Files:**
- Modify: `src/hooks/useDashboardTrends.ts`

**Step 1: Change signature from `{ days }` to `{ startDate, endDate }`**

```typescript
export function useDashboardTrends({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}): DashboardTrends {
  const { data: company } = useCompany();
  const companyId = company?.id;

  const { data: followerGrowth } = useAccountGrowth({ startDate, endDate });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-trends", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return null;

      // Previous period = same length window immediately before startDate
      const rangeMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const prevEnd = startDate; // previous period ends where current starts
      const prevStart = new Date(new Date(startDate).getTime() - rangeMs)
        .toISOString().split("T")[0];

      const fmt = (d: string) => d; // already formatted

      const [currentRes, previousRes] = await Promise.all([
        supabase.rpc("get_post_analytics_totals", {
          _company_id: companyId,
          _start_date: startDate,
          _end_date: endDate,
        }),
        supabase.rpc("get_post_analytics_totals", {
          _company_id: companyId,
          _start_date: prevStart,
          _end_date: prevEnd,
        }),
      ]);

      if (currentRes.error) throw currentRes.error;
      if (previousRes.error) throw previousRes.error;

      const cur = currentRes.data?.[0];
      const prev = previousRes.data?.[0];

      return {
        engagementRate: computeTrend(
          Number(cur?.avg_engagement_rate || 0),
          Number(prev?.avg_engagement_rate || 0)
        ),
        reach: computeTrend(
          Number(cur?.total_reach || 0) || Number(cur?.total_views || 0) || Number(cur?.total_impressions || 0),
          Number(prev?.total_reach || 0) || Number(prev?.total_views || 0) || Number(prev?.total_impressions || 0)
        ),
        posts: computeTrend(
          Number(cur?.total_posts || 0),
          Number(prev?.total_posts || 0)
        ),
      };
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const followersCurrent = followerGrowth?.totalFollowers || 0;
  const followersChange = followerGrowth?.followerChange || 0;
  const followersPrevious = followersCurrent - followersChange;

  return {
    followers: computeTrend(followersCurrent, followersPrevious),
    engagementRate: data?.engagementRate || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    reach: data?.reach || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    posts: data?.posts || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    isLoading,
  };
}
```

Key changes:
- Accepts `startDate`/`endDate` strings instead of `days` number
- Current period = `[startDate, endDate]` (the selected range)
- Previous period = same-length window immediately before: `[startDate - N, startDate]`
- Passes `startDate`/`endDate` to `useAccountGrowth` (Task 1)
- Remove unused import of `differenceInDays` or date utils if no longer needed

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Error in `Index.tsx` because it still passes `{ days }` — that's expected and fixed in Task 4.

**Step 3: Commit**

```bash
git add src/hooks/useDashboardTrends.ts
git commit -m "fix: useDashboardTrends uses actual startDate/endDate instead of trailing days"
```

---

### Task 3: Fix `useDashboardStats` — use post-level reach

**Files:**
- Modify: `src/hooks/useDashboardStats.ts`

**Step 1: Change reach to always use post-level data**

In the return object, replace the account-level reach with post-level reach:

```typescript
// BEFORE (line 72):
totalReach: totalReach || postReach || postImpressions,

// AFTER:
totalReach: postReach || postImpressions,
```

The `totalReach` variable from account snapshots (line 49) can be removed entirely, along with the `totalViews` line (50), since they are unused after this change. Keep the account snapshot query because it still provides `totalFollowers`.

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean (or only the pre-existing Index.tsx error from Task 2)

**Step 3: Commit**

```bash
git add src/hooks/useDashboardStats.ts
git commit -m "fix: dashboard reach uses date-filtered post analytics instead of unfiltered account snapshots"
```

---

### Task 4: Rewire `Index.tsx` — sparkline, trends, follower subtitle

**Files:**
- Modify: `src/pages/Index.tsx`

**Step 1: Import `useAggregatedFollowers` and `useAccountGrowth`**

Add to imports:
```typescript
import { useAccountGrowth, useAggregatedFollowers } from "@/hooks/useAccountGrowth";
```

**Step 2: Call the follower hooks and fix trends call**

After the existing hook calls, add:
```typescript
const stats = useDashboardStats({ startDate, endDate });
const trends = useDashboardTrends({ startDate, endDate }); // was { days }
const { data: sparklines, isLoading: sparkLoading } = useSparklineData(startDate, endDate);
const { data: followerGrowth } = useAccountGrowth({ startDate, endDate });
const { data: aggregatedFollowers } = useAggregatedFollowers(days);
```

**Step 3: Build follower sparkline from account data**

Replace the `followersSpark` derivation:
```typescript
// BEFORE:
const followersSpark = sparklines?.followersSpark || [];

// AFTER:
const followersSpark = (aggregatedFollowers || []).map(d => ({ x: d.date, y: d.followers }));
```

**Step 4: Add follower net-change to the Followers widget using existing `secondaryLabel`/`secondaryValue` props**

```typescript
// Compute follower change display
const followerChange = followerGrowth?.followerChange || 0;
const followerChangeLabel = followerChange > 0 ? `+${followerChange.toLocaleString()}` : followerChange.toLocaleString();
```

Update the Followers `StatSparklineWidget`:
```tsx
<StatSparklineWidget
  title="Followers"
  value={stats.isLoading ? "—" : stats.totalFollowers}
  change={trends.isLoading ? undefined : trends.followers.changePercent}
  sparklineData={sparkLoading ? [] : followersSpark}
  color={series[0]}
  icon={<Users className="w-4 h-4" />}
  timeframeLabel={timeframeLabel}
  secondaryValue={followerChange !== 0 ? followerChangeLabel : undefined}
  secondaryLabel={followerChange !== 0 ? "net change" : undefined}
/>
```

**Step 5: Remove the unused `days` variable** if no other widget uses it (check `TopPostsSpotlight`). If `TopPostsSpotlight` still needs `days`, keep it.

Looking at line 186: `<TopPostsSpotlight days={days} ...>` — keep the `days` variable.

**Step 6: Clean up the `useSparklineData` function**

Remove the `followersSpark` mapping since it's no longer used:
```typescript
return {
  reachSpark: rows.map((r) => pt(r, Number(r.reach) || Number(r.views) || Number(r.impressions) || 0)),
  engagementSpark: rows.map((r) => pt(r, Number(r.avg_engagement_rate) || 0)),
  postsSpark: rows.map((r) => pt(r, Number(r.post_count) || 0)),
};
```

**Step 7: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

**Step 8: Verify dev server loads without errors**

Open: `http://localhost:8082/app`
Expected: Dashboard loads, 4 hero widgets visible, no console errors

**Step 9: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "fix: dashboard hero widgets use correct data sources and respect date range"
```

---

### Task 5: Manual QA — verify all 4 widgets respond to date range

**Step 1: Open dashboard at `http://localhost:8082/app`**

**Step 2: Check default state (14 days)**
- Followers: shows current total + net change subtitle + sparkline of actual follower data
- Reach: shows date-filtered reach from post analytics
- Engagement: shows date-filtered avg engagement rate
- Posts: shows date-filtered post count
- All trend badges show period-over-period change

**Step 3: Change to 7 days**
- All 4 headline numbers should update (except Followers total, which stays the same)
- All 4 sparklines should shorten to 7 data points
- All 4 trend badges should recalculate
- Followers net change subtitle should update

**Step 4: Change to 30 days**
- Same checks — values should differ from 7-day view

**Step 5: Verify no console errors**
- Open DevTools → Console, confirm no React errors or failed queries
