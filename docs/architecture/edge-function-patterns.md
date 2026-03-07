# Edge Function Patterns

Engineering reference for Supabase Edge Functions in Social Suite. All edge functions live under `supabase/functions/<name>/index.ts` and run in Deno Deploy.

## Shared Modules

All shared code lives in `supabase/functions/_shared/`:

| Module | Purpose |
|--------|---------|
| `authorize.ts` | Central RBAC authorization + CORS headers |
| `cron-monitor.ts` | Health tracking for cron-triggered functions |
| `fetch-utils.ts` | Retry-aware fetch with deadline guards |
| `inbox-processing.ts` | Shared contact/conversation/message upsert logic |
| `classify.ts` | Gemini-powered conversation classification |
| `webhook_security_test.ts` | Unit tests for webhook HMAC verification |

## Authorization (`authorize.ts`)

**File:** `supabase/functions/_shared/authorize.ts`

Every edge function that handles user requests calls `authorize()`. It returns an `AuthResult` on success or **throws a Response** on failure. The caller catches the thrown Response and returns it directly:

```typescript
try {
  const auth = await authorize(req, { companyId, requiredRoles: ['owner', 'admin'] });
} catch (res) {
  if (res instanceof Response) return res;
  throw res;
}
```

### Authorization Modes

The `AuthorizeOptions` interface supports these modes:

| Option | Effect |
|--------|--------|
| `allowServiceRole: true` | Bypasses all checks if the Bearer token matches `SUPABASE_SERVICE_ROLE_KEY`. Used by cron/dispatcher-invoked functions. |
| `superadminOnly: true` | Requires the user to pass the `is_superadmin` RPC check. Used by admin functions like `webhook-admin`. |
| `companyId + requiredRoles` | Validates company membership via `company_memberships` table, then checks role. |
| `requiredPermission` | Calls `user_has_permission` DB function for fine-grained per-user permission overrides. |
| (no options) | Just validates the JWT is valid. |

Superadmins always bypass company/role checks.

### Service Role vs JWT

Two distinct authentication paths:

- **JWT path:** Frontend calls with the user's session token. `authorize()` calls `supabase.auth.getUser()` to validate, then checks membership/role.
- **Service role path:** Internal calls (cron dispatcher, function-to-function) pass `SUPABASE_SERVICE_ROLE_KEY` as the Bearer token. `authorize()` compares it directly and returns a synthetic `userId: "service_role"` result. No DB queries needed.

The service role key is auto-injected by Supabase into edge function environment variables. It is NOT stored in vault for auth purposes (this was a deliberate migration -- see ADR-004).

## CORS Headers

The shared `corsHeaders` object is exported from `authorize.ts` and used by every function:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, ...",
};
```

Every function handles `OPTIONS` preflight as its first check:

```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

## CronMonitor (`cron-monitor.ts`)

**File:** `supabase/functions/_shared/cron-monitor.ts`

Tracks execution of cron-triggered functions in the `cron_health_logs` table. Three lifecycle methods:

```typescript
const monitor = new CronMonitor('analytics-sync-hourly', supabase);
await monitor.start();    // INSERT status='running'
// ... do work ...
await monitor.success({ companiesSynced: 5 });  // UPDATE status='success', duration_ms, details
// or on failure:
await monitor.error(new Error('API down'));       // UPDATE status='error' + Slack alert
```

The `error()` method also sends a Slack notification via `SLACK_BOT_TOKEN` if configured. The Slack message includes job name, duration, error message, and details.

Per-company tracking: When invoked by the cron dispatcher for a specific company, the monitor name includes the company ID prefix (e.g., `inbox-sync:cc2bd6ce`).

## Deadline Guard Pattern

Edge functions have hard timeouts (~60s free, ~150s pro). Functions that process multiple companies or paginate through APIs use a deadline guard to bail early:

```typescript
const DEADLINE_MS = 50_000;
const startTime = Date.now();
const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

for (const company of companies) {
  if (pastDeadline()) {
    results.bailedEarly = true;
    break;
  }
  // ... process company ...
}
```

This pattern appears in:
- `supabase/functions/analytics-sync/index.ts` (50s deadline)
- `supabase/functions/inbox-sync/index.ts` (45s deadline)

The `fetchWithRetry` utility in `supabase/functions/_shared/fetch-utils.ts` also accepts a `pastDeadline` callback and will throw before making a request if the deadline has passed.

## Fetch with Retry (`fetch-utils.ts`)

**File:** `supabase/functions/_shared/fetch-utils.ts`

Wraps `fetch()` with:
- 15-second per-request timeout (`AbortSignal.timeout`)
- Automatic retry on 429 and 5xx (exponential backoff: 1s, 2s)
- Deadline awareness (won't retry if function is running out of time)
- No retry on 4xx client errors (except 429)

```typescript
const resp = await fetchWithRetry(url, { headers }, pastDeadline, retries);
```

## Environment Variables

Edge functions access secrets via `Deno.env.get()`:

| Variable | Source | Usage |
|----------|--------|-------|
| `SUPABASE_URL` | Auto-injected | Base URL for function-to-function calls |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Service role auth for admin operations |
| `SUPABASE_ANON_KEY` | Auto-injected | Used when creating user-scoped Supabase clients |
| `GETLATE_API_KEY` | Supabase Secrets | GetLate API authentication |
| `GEMINI_API_KEY` | Supabase Secrets | AI classification, content generation |
| `RESEND_API_KEY` | Supabase Secrets | Transactional emails |
| `FIRECRAWL_API_KEY` | Supabase Secrets | Article scraping in RSS poll |
| `SLACK_BOT_TOKEN` | Supabase Secrets | CronMonitor error alerts |

Secrets are managed via `supabase secrets set KEY=VALUE`. They are NOT in `.env.local` (that is for local dev only).

## Deno-Specific Patterns

- **ESM imports from CDN:** `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- **NPM imports:** `import { ... } from 'npm:@imagemagick/magick-wasm@0.0.30'` (used in rss-poll for WebP conversion)
- **Server entry:** `Deno.serve(async (req) => { ... })` -- no Express, no middleware
- **Crypto:** `crypto.subtle` for HMAC verification (Web Crypto API, not Node crypto)
- **File I/O:** `Deno.readFile()` for WASM binaries
- **Timeouts:** `AbortSignal.timeout(ms)` for per-request timeouts

## Function-to-Function Calls (Self-Chaining)

Functions invoke other edge functions via HTTP using the service role key:

```typescript
await fetch(`${supabaseUrl}/functions/v1/og-image-generator`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'generate', feedItemId: item.id }),
});
```

Examples:
- `rss-poll` calls `og-image-generator` for each new RSS item (fire-and-forget)
- `rss-poll` calls `generate-social-post` for automation rules
- `getlate-connect` calls `inbox-historical-sync` after profile creation
- `cron-dispatcher` calls target functions per-company (see ADR-004)

## Common Response Pattern

```typescript
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

## Error Handling Convention

- Always return JSON error bodies with `{ error: "message" }` or `{ success: false, error: "message" }`.
- The webhook receiver (`getlate-webhook`) returns 200 even on internal errors to prevent GetLate's auto-disable mechanism (10 consecutive non-200 responses disables the webhook).
- CronMonitor logs errors to `cron_health_logs` and optionally alerts Slack.
- API call logs go to `api_call_logs` table for debugging (used by `getlate-accounts`, `inbox-sync`).

## Testing Edge Functions

Unit tests for shared modules use Deno's built-in test runner:
- `supabase/functions/_shared/webhook_security_test.ts`
- `supabase/functions/_shared/auto-respond_test.ts`
- `supabase/functions/_shared/classify_test.ts`
- `supabase/functions/getlate-webhook/webhook-utils_test.ts`

Run with: `deno test supabase/functions/_shared/`

Integration tests that hit deployed edge functions are in `src/tests/integration/` and use the service role key to authenticate.
