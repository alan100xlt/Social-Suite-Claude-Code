# Analytics Pipeline

## Overview

Analytics data flows from social platforms through the GetLate API into Supabase snapshot tables, then to the frontend via RPCs and direct queries. An hourly cron job syncs metrics; the frontend transforms snapshot data into charts using Nivo and Recharts widgets.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| analytics-sync | `supabase/functions/analytics-sync/index.ts` | Cron-triggered sync: fetches post + account metrics from GetLate, Facebook Graph API; upserts snapshots |
| useAnalyticsByPublishDate | `src/hooks/useAnalyticsByPublishDate.ts` | Calls `get_post_analytics_by_publish_date` RPC; returns time-series metrics grouped by publish date |
| useAccountGrowth | `src/hooks/useAccountGrowth.ts` | Follower growth tracking from account snapshots |
| usePlatformBreakdown | `src/hooks/usePlatformBreakdown.ts` | Per-platform metric aggregation |
| useBestTimeToPost | `src/hooks/useBestTimeToPost.ts` | Optimal posting time analysis |
| useContentDecay | `src/hooks/useContentDecay.ts` | Content engagement decay over time |
| useTopPerformingPosts | `src/hooks/useTopPerformingPosts.ts` | Best-performing posts by engagement |
| Analytics page | `src/pages/Analytics.tsx` | Dashboard with 6 tabs: Overview, Platforms, Engagement, Audience, All Posts, Outlets |
| Transform functions | `src/lib/analytics/transforms.ts` | Converts raw data into chart-ready formats (sparklines, area trends, donut, heatmap, funnel, etc.) |

## Data Flow

```
Social Platforms (Twitter, Facebook, Instagram, LinkedIn, ...)
        |
        v
    GetLate API (/analytics?profileId=...&page=...&fromDate=...&toDate=...)
        |
        v
    analytics-sync edge function (hourly via cron-dispatcher)
        |
        +---> post_analytics_snapshots (per-post metrics)
        |     [company_id, post_id, snapshot_date, published_at, impressions, views, ...]
        |
        +---> account_analytics_snapshots (per-account follower counts, aggregate metrics)
        |     [company_id, account_id, snapshot_date, followers, engagement_rate, ...]
        |
        +---> content_decay_cache (pre-computed decay buckets)
        |
        v
    Facebook Graph API (direct, for thumbnails + FB-specific discovery)
        |
        v
    RPC functions (get_post_analytics_by_publish_date, etc.)
        |
        v
    React hooks (useAnalyticsByPublishDate, useAccountGrowth, ...)
        |
        v
    Transform functions (buildKpiSparklines, buildAreaTrend, ...)
        |
        v
    Nivo / Recharts widgets (StatSparklineWidget, AreaTrendWidget, ...)
```

## Sync Process (analytics-sync)

The `analytics-sync` edge function runs hourly via `cron-dispatcher` (fan-out per company):

1. **Authenticate**: Accepts service role token (cron) or user JWT (manual sync)
2. **Fetch accounts**: GET `/accounts?profileId={profileId}` from GetLate
3. **Discover Facebook posts**: Calls Facebook Graph API directly for post thumbnails (up to 5 pages, 100 posts each)
4. **Fetch analytics**: Paginates through GET `/analytics?profileId={profileId}&page={n}&fromDate=...&toDate=...` (default last 90 days)
5. **Upsert post snapshots**: Batch upsert (50 at a time) into `post_analytics_snapshots` with conflict on `(company_id, post_id, snapshot_date)`
6. **Upsert account snapshots**: Aggregates post metrics per platform + adds follower counts; upserts into `account_analytics_snapshots`
7. **Mark orphaned accounts**: Sets `is_active = false` for accounts no longer returned by GetLate
8. **Cache content decay**: Fetches `/analytics/get-content-decay` and stores in `content_decay_cache`

All steps are guarded by a `pastDeadline()` check (50s limit) to leave time for the response.

## Snapshot Tables

### post_analytics_snapshots

One row per post per snapshot date. Updated daily (or on manual sync).

| Column | Type | Notes |
|--------|------|-------|
| company_id | uuid | RLS filter |
| post_id | text | External post ID from GetLate |
| platform | text | twitter, facebook, instagram, linkedin, etc. |
| account_id | text | GetLate account ID |
| snapshot_date | date | When the sync ran |
| published_at | timestamptz | When the post was published on the platform |
| impressions, reach, views, likes, comments, shares, clicks, saves | integer | Metric values |
| engagement_rate | float | Computed by GetLate |
| content | text | Post text content |
| post_url | text | Platform permalink |
| thumbnail_url | text | Post image (from Facebook Graph API) |
| source | text | `'getlate'` or `'direct'` |

### account_analytics_snapshots

One row per account per snapshot date. Tracks follower growth over time.

| Column | Type | Notes |
|--------|------|-------|
| company_id | uuid | RLS filter |
| account_id | text | GetLate account ID |
| platform | text | Platform name |
| snapshot_date | date | When the sync ran |
| followers | integer | Current follower count |
| posts_count | integer | Number of posts in the sync window |
| impressions, reach, views, likes, comments, shares, clicks, saves | integer | Aggregate metrics |
| engagement_rate | float | Average engagement rate |
| is_active | boolean | False if account no longer in GetLate |

## CRITICAL: Date Filtering Rule

**NEVER filter `post_analytics_snapshots` by `snapshot_date` for time-series analytics.**

- `snapshot_date` is when the sync ran. If you sync once a day, ALL posts have the same `snapshot_date`.
- `published_at` is when the post was actually published. This is the column that spreads data across real dates.

The RPC `get_post_analytics_by_publish_date` correctly groups by `published_at`. The frontend hook `useAnalyticsByPublishDate` calls this RPC.

**Exception**: `account_analytics_snapshots` correctly uses `snapshot_date` because it tracks growth over time (each day's follower count is a distinct data point).

This bug has recurred 3+ times. The `analytics-reviewer` subagent automatically checks for it.

## Frontend Architecture

### Analytics Page Tabs

| Tab | Widgets | Data Sources |
|-----|---------|-------------|
| Overview | KPI sparklines, Area trend, Funnel | `useAnalyticsByPublishDate` |
| Platforms | Donut, Treemap, Gauge, PlatformMetricsMatrix | `usePlatformBreakdown`, `useAccounts` |
| Engagement | Content decay bars, Heatmap, Optimal posting | `useContentDecay`, `useBestTimeToPost` |
| Audience | Follower sparkline, Growth trend | `useAccountGrowth`, `useAggregatedFollowers` |
| All Posts | AG Grid table | `useAllPostsWithAnalytics`, `useTopPerformingPosts` |
| Outlets | Cross-outlet comparison | `CrossOutletAnalytics` component |

### Widget System

The analytics page uses Nivo-based widgets from `src/components/analytics-v2/widgets-v2/`:

- `StatSparklineWidget` -- KPI card with inline sparkline
- `AreaTrendWidget` -- Multi-series area chart
- `BarComparisonWidget` -- Grouped bar chart
- `DonutKpiWidget` -- Donut chart with center label
- `HeatmapWidget` -- Day/hour heatmap
- `TreemapWidget` -- Proportional area chart
- `FunnelWidget` -- Conversion funnel
- `GaugeWidget` -- Radial gauge

Transform functions in `src/lib/analytics/transforms.ts` convert raw hook data into the shapes these widgets expect.

### Manual Sync

Users can click "Sync Now" on the analytics page, which calls `useSyncAnalytics()`. This invokes the `analytics-sync` edge function with the user's JWT (not service role), triggering a full sync for their company.

## Gotchas

- **Deadline guard at 50s**: The sync function bails early if approaching the edge function timeout. Check `results.bailedEarly` in the response to know if the sync was incomplete.
- **Facebook Graph API direct access**: Unlike other platforms that go through GetLate, Facebook post discovery calls the Graph API directly using `pageAccessToken` from the account's metadata. This is for thumbnail URLs that GetLate doesn't provide.
- **Batch upsert size of 50**: Post snapshots are upserted in batches of 50 to avoid Supabase payload limits. Each batch gets its own error handling.
- **Content decay is cached**: The `/analytics/get-content-decay` endpoint is called once per sync and stored in `content_decay_cache` rather than computed on-the-fly.
- **Follower count resolution order**: The sync tries multiple sources for follower counts: analytics API response, Facebook page `fan_count`, account-level `followersCount`/`followerCount`, metadata `profileData.followersCount`.
- **Orphaned account detection**: If an account disappears from GetLate's response, its snapshots are marked `is_active = false`. This prevents stale accounts from polluting analytics.
