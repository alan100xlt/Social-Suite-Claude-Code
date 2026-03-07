# ADR-004: Edge Function Cron Dispatcher

**Status:** Accepted
**Date:** 2026-03-07

## Context

Social Suite runs several periodic jobs: inbox sync, analytics sync, RSS polling, changelog monitoring, escalation checks, evergreen content recycling, and performance alerts. These need to run on a schedule and, for some jobs, fan out to process each company independently.

### The Problem with SQL-Level Dispatch

The original architecture used SQL functions called directly by `pg_cron`. These SQL functions needed the Supabase service role key to call edge functions via `net.http_post()`. The key was stored in Supabase Vault and retrieved at call time.

This created several issues:
1. **Vault as a secret store for auth keys.** The service role key was duplicated: once in Supabase's auto-injected env vars (for edge functions) and once in Vault (for SQL dispatch). Two sources of truth.
2. **SQL function complexity.** Fan-out logic (query companies, iterate, fire HTTP) is awkward in PL/pgSQL.
3. **Error handling.** SQL functions can't easily do retries, deadline guards, or structured error logging.
4. **Observability.** No `CronMonitor` integration -- job health was invisible.

## Decision

Replace SQL-level dispatch with an edge function dispatcher (`cron-dispatcher`). All cron jobs route through this single dispatcher, which has `verify_jwt=false` (callable by pg_cron without auth) and uses its own auto-injected `SUPABASE_SERVICE_ROLE_KEY`.

## Architecture

```
pg_cron
  |
  | net.http_post (no auth header needed)
  v
cron-dispatcher (verify_jwt=false)
  |
  | For fan-out: query companies, fire N requests
  | For single: fire 1 request
  v
target edge function (inbox-sync, analytics-sync, etc.)
  |
  | Authorization: Bearer <service_role_key>
  v
process data, log via CronMonitor
```

### pg_cron Registration

All cron jobs use the same pattern. From `supabase/migrations/20260307180000_unify_cron_dispatcher.sql`:

```sql
SELECT cron.schedule('inbox-sync-every-15-min', '*/15 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"inbox-sync"}'::jsonb
  )$$);
```

Note: The vault still stores `supabase_url` (the base URL), but NOT the service role key. The URL is not a secret -- it's just convenient storage for the cron command.

### Registered Cron Jobs (Current)

| Job Name | Schedule | Function | Fan-Out? |
|----------|----------|----------|----------|
| `inbox-sync-every-15-min` | `*/15 * * * *` | `inbox-sync` | Yes |
| `analytics-sync-hourly` | `0 * * * *` | `analytics-sync` | Yes |
| `rss-poll-every-5-min` | `*/5 * * * *` | `rss-poll` | No |
| `getlate-changelog-monitor` | `0 9 * * *` | `getlate-changelog-monitor` | No |
| `cron-escalation-every-30-min` | `*/30 * * * *` | `cron-escalation` | No |

## The Dispatcher (`cron-dispatcher/index.ts`)

**File:** `supabase/functions/cron-dispatcher/index.ts`

### Allowlist

Only approved function names can be dispatched:

```typescript
const ALLOWED_FUNCTIONS = [
  'inbox-sync', 'analytics-sync', 'rss-poll',
  'getlate-changelog-monitor', 'cron-escalation',
  'evergreen-recycler', 'performance-alerts',
];
```

This prevents abuse -- even though `verify_jwt=false`, an attacker would need to guess the Supabase URL AND be on the internal network (pg_cron runs within Supabase's infrastructure).

### Fan-Out Pattern

For `inbox-sync` and `analytics-sync`, the dispatcher queries all companies with a `getlate_profile_id` and fires one HTTP request per company:

```typescript
const fanOutFunctions = ['inbox-sync', 'analytics-sync'];

if (fanOutFunctions.includes(functionName)) {
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .not('getlate_profile_id', 'is', null);

  const dispatches = (companies || []).map((company) =>
    fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({ companyId: company.id }),
    }).catch((err) => {
      console.error(`Dispatch failed for ${company.id}:`, err);
      return null;
    })
  );

  const results = await Promise.allSettled(dispatches);
}
```

All requests run concurrently via `Promise.allSettled`. Each has a 55-second timeout. The dispatcher reports how many succeeded and failed.

### Single-Invocation Pattern

For `rss-poll`, `getlate-changelog-monitor`, and `cron-escalation`, the dispatcher fires a single request with an empty body:

```typescript
const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
  },
  signal: AbortSignal.timeout(55_000),
  body: JSON.stringify({}),
});
```

### Target Function Integration

Target functions accept an optional `companyId` in the request body:

```typescript
// In inbox-sync/index.ts:
let targetCompanyId: string | null = null;
try {
  const body = await req.json();
  targetCompanyId = body.companyId || null;
} catch {
  // No body -- legacy single-invocation mode
}
```

If `companyId` is present (dispatcher mode), the function processes only that company. If absent (legacy mode or manual trigger), it processes all companies or picks the least-recently-synced one.

## Health Monitoring

Each target function uses `CronMonitor` (from `supabase/functions/_shared/cron-monitor.ts`) with per-company monitor names:

```typescript
const monitorName = targetCompanyId
  ? `inbox-sync:${targetCompanyId.slice(0, 8)}`
  : 'inbox-sync-every-5-min';
const monitor = new CronMonitor(monitorName, supabase);
await monitor.start();
```

This produces fine-grained health data in `cron_health_logs`:
- `inbox-sync:cc2bd6ce` -- inbox sync for company cc2bd6ce
- `analytics-sync:cc2bd6ce` -- analytics sync for company cc2bd6ce
- `rss-poll-every-5-min` -- single-invocation RSS poll

The admin dashboard at `/app/admin/cron-health` visualizes these logs.

## Manual Triggering

The `trigger_cron_job()` SQL function (updated in migration 20260307180000) routes all edge function jobs through the dispatcher:

```sql
-- ALL edge function jobs go through the dispatcher
PERFORM net.http_post(
  url := _base_url || '/functions/v1/cron-dispatcher',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := jsonb_build_object('function', _settings.edge_function)
);
```

SQL-type jobs (watchdog, cleanup, snooze resurface) still run directly as SQL.

## Migration History

1. **`20260306030000_fan_out_cron_dispatch.sql`** -- Initial fan-out via SQL function `dispatch_company_sync()`
2. **`20260307170000_cron_dispatcher_edge_function.sql`** -- Migrated inbox-sync and analytics-sync to the edge function dispatcher
3. **`20260307180000_unify_cron_dispatcher.sql`** -- Migrated ALL remaining cron jobs (rss-poll, changelog-monitor, cron-escalation) through the dispatcher. Fixed inbox-sync frequency from 5min back to 15min.

## Consequences

**Pros:**
- Single source of truth for service role key (auto-injected by Supabase)
- Proper error handling, retries, and deadline guards in TypeScript
- Per-company health monitoring via CronMonitor
- Function allowlist prevents abuse of the no-auth endpoint
- Concurrent fan-out via Promise.allSettled

**Cons:**
- Extra HTTP hop (pg_cron -> dispatcher -> target function)
- `verify_jwt=false` on the dispatcher is a mild security trade-off (mitigated by allowlist and internal network)
- Vault still needed for `supabase_url` in cron commands (but not for the service role key)

## Related Files

- `supabase/functions/cron-dispatcher/index.ts` -- the dispatcher
- `supabase/functions/_shared/cron-monitor.ts` -- health monitoring class
- `supabase/migrations/20260307180000_unify_cron_dispatcher.sql` -- final migration
- `supabase/config.toml` -- may contain function config
- `docs/features/08-cron-jobs.md` -- feature documentation
- `src/tests/integration/cron-health.test.ts` -- integration tests
- `src/tests/end-to-end/cron-health.test.ts` -- E2E tests
