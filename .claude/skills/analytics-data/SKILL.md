name: analytics-data
description: Use when writing, reviewing, or debugging any code that touches analytics data — RPCs, hooks, widgets, charts, or the analytics-sync pipeline. Enforces date column rules and data pipeline conventions.
---

# Analytics Data Pipeline Skill

## The Cardinal Rule

**NEVER filter `post_analytics_snapshots` by `snapshot_date` for date-range queries.**

- `snapshot_date` = when the analytics sync ran (all posts land on the same 1-2 dates)
- `published_at` = when the post was actually published (spread across real dates)

Using `snapshot_date` makes ALL date-range filtering useless — 7D, 30D, 90D all return the same data.

### Correct patterns

```sql
-- SQL RPC: filter by published_at::date
WHERE p.published_at IS NOT NULL
  AND p.published_at::date >= _start_date
  AND p.published_at::date <= _end_date
GROUP BY p.published_at::date
```

```typescript
// Frontend hook: filter by published_at
supabase
  .from('post_analytics_snapshots')
  .not('published_at', 'is', null)
  .gte('published_at', startDate)
  .lte('published_at', endDate)
  .order('published_at', { ascending: false })
```

### Exception: account_analytics_snapshots

`account_analytics_snapshots` CORRECTLY uses `snapshot_date` because it tracks account-level growth over time (followers, following). There is no `published_at` on accounts. This is the one table where `snapshot_date` is the right filter.

## Data Model

### post_analytics_snapshots
| Column | Type | Purpose |
|--------|------|---------|
| `snapshot_date` | DATE | When sync ran — DO NOT use for date filtering |
| `published_at` | TIMESTAMPTZ | When post was published — USE THIS |
| `company_id` | UUID | Multi-tenant filter (always required) |
| `post_id` | TEXT | External post ID |
| `platform` | TEXT | facebook, youtube, etc. |
| `account_id` | TEXT | For inactive account filtering |
| Metrics | INTEGER | impressions, reach, views, likes, comments, shares, clicks, saves |
| `engagement_rate` | DECIMAL(5,2) | Pre-calculated |

### account_analytics_snapshots
| Column | Type | Purpose |
|--------|------|---------|
| `snapshot_date` | DATE | When snapshot was taken — CORRECT to filter on |
| `company_id` | UUID | Multi-tenant filter |
| `account_id` | TEXT | External account ID |
| `is_active` | BOOLEAN | Filter inactive accounts |
| Metrics | INTEGER | followers, following, posts_count |

## RPC Functions

### Correct (use published_at)
- `get_post_analytics_totals` — hero KPI numbers (fixed 2026-03-08)
- `get_post_analytics_by_date` — sparkline/timeline charts (fixed 2026-03-08)
- `get_post_analytics_by_platform` — platform breakdown (fixed 2026-03-08)
- `get_post_analytics_by_date_platform` — date+platform combo (fixed 2026-03-08)
- `get_post_analytics_by_publish_date` — original correct implementation

### Correct (snapshot_date is right for accounts)
- `get_followers_by_date_platform` — account growth over time

## Hook Patterns

### When querying post_analytics_snapshots directly:
```typescript
// WRONG
.gte('snapshot_date', startDate)

// RIGHT
.not('published_at', 'is', null)
.gte('published_at', startDate)
.lte('published_at', endDate)
.order('published_at', { ascending: false })
```

### When calling RPCs:
The RPCs now handle date filtering internally using `published_at`. Just pass `_start_date` and `_end_date` — the RPC does the right thing.

### Inactive account filtering
Always exclude posts from inactive accounts:
```sql
AND (p.account_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM account_analytics_snapshots a
  WHERE a.account_id = p.account_id
    AND a.company_id = _company_id
    AND a.is_active = false
))
```

## Analytics Sync Pipeline

The `analytics-sync` edge function populates `post_analytics_snapshots` with:
- `snapshot_date = today` (when sync ran)
- `published_at = post.publishedAt` (from GetLate API)

Both columns MUST be populated. If `published_at` is NULL, the post won't appear in any date-filtered query.

## Checklist for New Analytics Code

- [ ] Does NOT filter `post_analytics_snapshots` by `snapshot_date`
- [ ] Uses `published_at` with `IS NOT NULL` guard
- [ ] Includes `company_id` filter (RLS)
- [ ] Excludes inactive accounts
- [ ] Has demo data in DemoDataProvider if it's a new hook
- [ ] Date range picker actually changes the displayed data
