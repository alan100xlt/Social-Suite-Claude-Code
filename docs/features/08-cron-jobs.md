# Cron Jobs

## Architecture

All crons use: **pg_cron** + **pg_net** (`net.http_post()`) + **vault secrets**

Vault secrets used:
- `supabase_url` — base URL for edge function invocation
- `supabase_service_role_key` — auth token for service role access

## Registered Jobs

| Job Name | Schedule | Edge Function | Purpose |
|----------|----------|--------------|---------|
| `analytics-sync-hourly` | `0 * * * *` (hourly) | `analytics-sync` | Sync analytics from GetLate API |
| `rss-poll-every-5-min` | `*/5 * * * *` (every 5 min) | `rss-poll` | Poll active RSS feeds for new items |
| `getlate-changelog-monitor` | `0 9 * * *` (daily 9am) | `getlate-changelog-monitor` | Check GetLate API for changes |

## Monitoring

- `cron.job` — registered jobs
- `cron.job_run_details` — execution history with status, start/end time, error messages
- `cron_health_logs` — custom health tracking table

## History

Previously, `analytics-sync-hourly` used `extensions.http()` (http extension not installed) and `getlate-changelog-monitor` used `current_setting('app.settings...')` (not configured). Both were failing every run. Fixed in platform restoration to use `net.http_post()` + vault.
