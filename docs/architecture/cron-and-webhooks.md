# Cron and Webhooks

## Overview

Social Suite uses pg_cron for scheduled tasks and a centralized dispatcher pattern to invoke Supabase edge functions. All cron jobs route through a single `cron-dispatcher` edge function that handles fan-out (one invocation per company) for multi-tenant scaling. Webhooks from GetLate provide real-time event ingestion alongside the polling cron.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| cron-dispatcher | `supabase/functions/cron-dispatcher/index.ts` | Central dispatch: receives function name, queries companies, fires per-company HTTP requests |
| CronMonitor | `supabase/functions/_shared/cron-monitor.ts` | Health tracking: logs start/success/error to `cron_health_logs`, sends Slack alerts on failure |
| cron_job_settings | `supabase/migrations/20260303110000_cron_job_settings.sql` | User-editable cron config table with RPCs for update/trigger |
| cron_health_logs | `supabase/migrations/20260303100500_create_cron_health_logs.sql` | Execution log table with auto-cleanup |
| Unified dispatch | `supabase/migrations/20260307180000_unify_cron_dispatcher.sql` | Routes ALL edge function crons through cron-dispatcher |
| Fan-out dispatch | `supabase/migrations/20260306030000_fan_out_cron_dispatch.sql` | Per-company fan-out for inbox-sync and analytics-sync |
| webhook_registrations | `supabase/migrations/20260307140000_webhook_infrastructure.sql` | Webhook secret storage, consecutive failure tracking |
| getlate-webhook | `supabase/functions/getlate-webhook/index.ts` | Webhook receiver with HMAC verification and idempotency |

## Data Flow: Cron Execution

```
pg_cron (schedule fires)
    |
    v
net.http_post() to cron-dispatcher
    |
    v
cron-dispatcher edge function
    |
    +-- Fan-out functions (inbox-sync, analytics-sync):
    |     Query companies with getlate_profile_id
    |     Fire one HTTP request per company (concurrent via Promise.allSettled)
    |     Each request includes { companyId } in body
    |
    +-- Single-invocation functions (rss-poll, changelog-monitor, cron-escalation):
          Fire one HTTP request to the target function
```

## pg_cron Setup

All cron jobs are registered via SQL migrations. The current schedule (from unified dispatcher migration):

| Job Name | Schedule | Target Function | Type |
|----------|----------|----------------|------|
| `inbox-sync-every-15-min` | `*/15 * * * *` | `inbox-sync` | Fan-out (per company) |
| `analytics-sync-hourly` | `0 * * * *` | `analytics-sync` | Fan-out (per company) |
| `rss-poll-every-5-min` | `*/5 * * * *` | `rss-poll` | Single invocation |
| `getlate-changelog-monitor` | `0 9 * * *` | `getlate-changelog-monitor` | Single invocation |
| `cron-escalation-every-30-min` | `*/30 * * * *` | `cron-escalation` | Single invocation |
| `cron-health-logs-cleanup` | `0 3 * * *` | (SQL) | Direct SQL: deletes logs > 30 days |
| `webhook-log-cleanup` | `0 3 * * *` | (SQL) | Direct SQL: deletes webhook logs > 7 days |

### How pg_cron calls cron-dispatcher

Each cron job executes SQL that calls `net.http_post()`:

```sql
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
         || '/functions/v1/cron-dispatcher',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := '{"function":"inbox-sync"}'::jsonb
);
```

Key details:
- The Supabase URL comes from **vault** (not hardcoded)
- No `Authorization` header is needed -- `cron-dispatcher` has `verify_jwt=false` and is only reachable from internal Supabase network
- The dispatcher reads `SUPABASE_SERVICE_ROLE_KEY` from its own environment to authenticate downstream calls

## The Dispatcher Pattern

### Why a dispatcher?

Before the dispatcher, each cron job had its own SQL that included an `Authorization` header with the service role key from vault. This meant:
- Every migration that added a cron job needed vault access to the service role key
- Updating auth patterns required modifying every cron job's SQL
- Fan-out logic was duplicated in SQL functions

The dispatcher centralizes this:
1. pg_cron calls one endpoint with `{ "function": "target-name" }`
2. The dispatcher validates the function name against a whitelist
3. For fan-out functions, it queries companies and fires concurrent requests
4. For single-invocation functions, it fires one request
5. All downstream calls use the dispatcher's own `SUPABASE_SERVICE_ROLE_KEY`

### Allowed functions (whitelist)

The dispatcher only accepts these function names (defined in `cron-dispatcher/index.ts`):

```
inbox-sync, analytics-sync, rss-poll, getlate-changelog-monitor,
cron-escalation, evergreen-recycler, performance-alerts
```

### Fan-out vs single invocation

| Type | Functions | Behavior |
|------|-----------|----------|
| Fan-out | `inbox-sync`, `analytics-sync` | Queries companies with `getlate_profile_id`, fires one request per company with `{ companyId }` |
| Single | `rss-poll`, `getlate-changelog-monitor`, `cron-escalation`, `evergreen-recycler`, `performance-alerts` | Fires one request with `{}` body |

## CronMonitor Health Tracking

Every edge function that runs as a cron job creates a `CronMonitor` instance:

```typescript
const monitor = new CronMonitor('job-name', supabase);
await monitor.start();  // Inserts row with status='running'

// ... do work ...

await monitor.success({ itemsProcessed: 42 });  // Updates to status='success'
// or
await monitor.error(new Error('...'), { context: '...' });  // Updates to status='error'
```

### cron_health_logs table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| job_name | text | e.g., `inbox-sync:cc2bd6ce` (includes company ID prefix for fan-out) |
| status | text | `running`, `success`, `error` |
| started_at | timestamptz | When the job started |
| completed_at | timestamptz | When it finished |
| duration_ms | integer | Execution time |
| error_message | text | Error details (on failure) |
| details | jsonb | Arbitrary metadata (items processed, errors, etc.) |

### Slack alerts

On error, `CronMonitor` sends a Slack notification via the Slack Bot API (`SLACK_BOT_TOKEN` env var). The message includes job name, duration, error message, and details. If `SLACK_BOT_TOKEN` is not set, the alert is silently skipped.

## Admin Dashboard

The cron health admin page (`/app/admin/cron-health`, component `src/pages/CronHealth.tsx`) provides:

1. **Job list**: Reads from `cron_job_settings` table, shows schedule, enabled state, description
2. **Execution history**: Reads from `cron_health_logs`, shows recent runs with status/duration/errors
3. **Manual trigger**: Calls `trigger_cron_job()` RPC which routes through the dispatcher
4. **Schedule editing**: Calls `update_cron_job()` RPC which updates both `cron_job_settings` and `pg_cron`

### RPCs for cron management

| RPC | What it does |
|-----|-------------|
| `trigger_cron_job(job_name)` | Manually fires the job. SQL jobs run directly; edge functions go through the dispatcher |
| `update_cron_job(job_name, schedule, enabled, description)` | Updates settings table + re-registers/unschedules in pg_cron |
| `get_cron_jobs()` | Returns job list with settings (used by admin page) |

Both RPCs are `SECURITY DEFINER` and restricted to `service_role` and `postgres` (no direct user access).

## Webhook System

### Registration

Webhooks are registered in the `webhook_registrations` table:

| Column | Type | Notes |
|--------|------|-------|
| company_id | uuid | One webhook per company per provider |
| provider | text | Currently only `'getlate'` |
| secret | text | HMAC-SHA256 shared secret |
| events | text[] | Subscribed event types |
| is_active | boolean | Active flag |
| consecutive_failures | int | Incremented on HMAC failure, reset on success |
| last_success_at | timestamptz | Last successful event |
| last_failure_at | timestamptz | Last failed event |

### HMAC Verification

1. Webhook receiver reads raw body before JSON parsing
2. Finds the signature header (checks multiple possible header names)
3. Looks up the secret from `webhook_registrations` for the resolved company
4. Verifies HMAC-SHA256 signature
5. If signature is invalid and a signature header was present, returns 401 and increments `consecutive_failures`
6. If no signature header exists (discovery phase), processes with a warning log

### Idempotency

1. Each event has an `event_id` (extracted during payload normalization)
2. Before processing, checks `webhook_event_log` for existing `(provider, event_id)` pair
3. If found, returns `{ ignored: true, reason: 'duplicate_event' }`
4. After processing, logs the event to `webhook_event_log`

### Replay Protection

Events with timestamps older than a configured threshold are rejected as stale.

### Event Log

The `webhook_event_log` table stores all received events:

| Column | Type | Notes |
|--------|------|-------|
| provider | text | `'getlate'` |
| event_type | text | e.g., `message.received`, `comment.received` |
| event_id | text | Unique event identifier (for dedup) |
| payload | jsonb | Raw event payload |
| processing_status | text | `received`, `processed`, `skipped`, `failed` |
| error_message | text | Error details on failure |
| duration_ms | int | Processing time |

Auto-cleanup: events older than 7 days are deleted daily at 3 AM UTC.

## Gotchas

- **Vault secrets are required**: pg_cron SQL needs `supabase_url` in vault to construct the dispatcher URL. If this secret is missing, ALL cron jobs silently fail. Check `vault.decrypted_secrets` first when debugging.
- **cron-dispatcher has `verify_jwt=false`**: It relies on being unreachable from the public internet (internal Supabase network only). The function whitelist prevents abuse.
- **Fan-out timeout is 55s**: Each per-company dispatch has a 55-second timeout via `AbortSignal.timeout()`. The target function (inbox-sync, analytics-sync) has its own internal deadline guard (45-50s).
- **`consecutive_failures` tracking**: The webhook receiver tracks failures per registration. GetLate auto-disables webhooks after 10 consecutive failures, so the system always returns 200 (even on errors) to prevent this.
- **SQL cron jobs run directly**: `cron-health-logs-cleanup`, `webhook-log-cleanup`, and `inbox-resurface-snoozed` are pure SQL executed by pg_cron without going through the dispatcher.
- **Legacy `dispatch_company_sync()` SQL function**: This was the original fan-out mechanism (SQL function that called `net.http_post` per company). It was replaced by the `cron-dispatcher` edge function but may still exist in the database.
- **Schedule drift**: The `cron_job_settings` table is the source of truth for intended schedules. The actual pg_cron registration may differ if a migration failed partway through. The admin page shows the settings table, not the actual pg_cron state.
- **Inbox-sync frequency changed**: Originally 5 minutes, reduced to 15 minutes (per SOC-189). Multiple migrations touched this; the unified dispatcher migration (20260307180000) is the authoritative one.
