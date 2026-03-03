# Analytics

## Data Source

Analytics data synced from GetLate API via `analytics-sync` cron job (hourly).

## Tables

- `post_analytics_snapshots`: per-post metrics (likes, shares, views, comments, etc.)
- `account_analytics_snapshots`: per-account metrics (followers, engagement rate)

## Dashboard RPCs

The analytics dashboard uses these RPC functions:
- `get_post_analytics_totals` — aggregate metrics for a company
- `get_post_analytics_by_date` — time-series data
- `get_top_posts_by_engagement` — best-performing posts

These RPCs all use `user_belongs_to_company()` for authorization, which now delegates to `user_is_member()` (fixed in platform restoration).

## RLS

- Analytics data scoped by `user_is_member(auth.uid(), company_id)`
- Service role has full access for the sync edge function

## Two UI Versions

- `/app/analytics` — Recharts-based (primary)
- `/app/analytics-v2` — Nivo-based widget system (secondary)
