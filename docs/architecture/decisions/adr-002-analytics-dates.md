# ADR-002: Analytics Date Filtering (snapshot_date vs published_at)

**Status:** Accepted (CRITICAL -- this bug recurred 3+ times)
**Date:** 2026-02-XX (original discovery)
**Last Updated:** 2026-03-07

## The Bug

Filtering `post_analytics_snapshots` by `snapshot_date` returns misleading results. This bug recurred at least 3 times across different features and developers.

## Why It Happens

The `post_analytics_snapshots` table has two date columns:

| Column | What It Represents | Distribution |
|--------|-------------------|-------------|
| `snapshot_date` | The date the sync job ran and wrote the row | All rows from one sync run share the same date (today) |
| `published_at` | When the post was actually published on the social platform | Spread across real dates (days, weeks, months ago) |

The `analytics-sync` edge function (`supabase/functions/analytics-sync/index.ts`) upserts all post snapshots with `snapshot_date: today` (line 481):

```typescript
postSnapshots.push({
  // ...
  snapshot_date: today,          // <- when the sync ran
  published_at: post.publishedAt, // <- when the post was published
});
```

The upsert conflict key is `(company_id, post_id, snapshot_date)`. This means every sync overwrites the previous snapshot for today, but all posts share the same `snapshot_date`.

### What Goes Wrong

If you write a query like:

```typescript
// WRONG: filtering by snapshot_date
.gte('snapshot_date', startDate)
.lte('snapshot_date', endDate)
```

You get ALL posts that were synced during that date range, not posts that were published during that range. Since the sync runs hourly and captures all posts, a "last 7 days" filter returns posts from months ago.

### The Correct Pattern

```typescript
// CORRECT: filtering by published_at
.not('published_at', 'is', null)
.gte('published_at', startDate.toISOString())
.lte('published_at', endDate.toISOString())
```

## Exception: account_analytics_snapshots

The `account_analytics_snapshots` table correctly uses `snapshot_date` for filtering. This table tracks follower count growth over time -- each day's snapshot represents the account state on that date. The `snapshot_date` IS the meaningful date here.

```typescript
// CORRECT for account snapshots:
.gte('snapshot_date', startDate)
```

## Where The Bug Appeared

1. **`src/hooks/useAnalyticsStats.ts`** -- Used `snapshot_date` for ordering/filtering post snapshots. Currently queries `snapshot_date` (line 36-38) which works for "latest snapshot" use case but would break for date-range filtering.

2. **`src/hooks/useTopPerformingPosts.ts`** -- Correctly uses `published_at` for date filtering (line 64-66).

3. Various dashboard widgets and analytics components that were fixed during earlier sprints.

## Current State of Key Files

Files that reference `snapshot_date` on `post_analytics_snapshots` (verified 2026-03-07):

| File | Usage | Status |
|------|-------|--------|
| `src/hooks/useAnalyticsStats.ts` | `.order("snapshot_date", { ascending: true })` | Acceptable (ordering, not filtering) |
| `src/hooks/usePlatformMetricsMatrix.ts` | References in metric calculations | Needs audit |
| `src/hooks/usePlatformSparklines.ts` | References in sparkline calculations | Needs audit |
| `src/hooks/useAccountGrowth.ts` | Uses `snapshot_date` | Correct (this is account snapshots) |

## Prevention Measures

### 1. Analytics Reviewer Agent

The `analytics-reviewer` agent (`.claude/agents/analytics-reviewer.md`) automatically reviews any code that touches analytics for this specific bug. It checks:
- Is `snapshot_date` used for filtering/grouping `post_analytics_snapshots`?
- Is `published_at` used instead where appropriate?
- Are null `published_at` values handled?

### 2. CLAUDE.md Warning

The project instructions contain a prominent warning:

> **CRITICAL: NEVER filter `post_analytics_snapshots` by `snapshot_date`** -- use `published_at` instead.

### 3. Analytics Data Skill

The `/analytics-data` skill contains the full rules for date column usage, data pipeline conventions, and RPC patterns.

## Decision

1. Always use `published_at` when filtering or grouping `post_analytics_snapshots` by date.
2. Always use `snapshot_date` when filtering `account_analytics_snapshots` by date.
3. The `analytics-reviewer` agent MUST review any PR that touches analytics hooks or components.
4. When creating new analytics queries, start from `src/hooks/useTopPerformingPosts.ts` as the reference implementation (it does date filtering correctly).

## RPC Functions

The database RPCs also follow this pattern:
- `get_post_analytics_totals` -- uses `published_at` internally
- `get_post_analytics_by_date` -- groups by `published_at`, not `snapshot_date`
- `get_top_posts_by_engagement` -- filters by `published_at`

These are defined in Supabase migrations. If you add a new RPC for post analytics, filter by `published_at`.
