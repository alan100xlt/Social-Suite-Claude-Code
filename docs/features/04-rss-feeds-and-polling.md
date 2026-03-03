# RSS Feeds & Polling

## Feed Discovery

- `discover-rss-feeds` edge function: takes a URL, returns array of found RSS feeds
- Called during Discovery flow on `/discover` page

## Manual Feed Creation

- Users can add feeds manually via the Content > Feeds tab

## Tables

- `rss_feeds`: `company_id`, `url`, `is_active`, `poll_interval_minutes`, `etag`, `last_modified`
- `rss_feed_items`: `feed_id`, `title`, `link`, `status` (pending/posted/failed/skipped)

## Polling

1. pg_cron job `rss-poll-every-5-min` runs every 5 minutes
2. Calls `net.http_post()` → `rss-poll` edge function
3. Edge function queries active feeds, checks `etag`/`last_modified` for conditional requests
4. New items saved with `status = 'pending'`

## RLS

- Feed access controlled by `user_is_member(auth.uid(), company_id)`
- Service role has full access for the polling edge function
