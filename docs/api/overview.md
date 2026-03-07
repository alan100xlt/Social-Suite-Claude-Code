# API Overview

Social Suite exposes backend functionality through **Supabase Edge Functions** (Deno-based serverless functions). All edge functions follow the same authentication, CORS, and error handling patterns described below.

## Base URL

```
https://<SUPABASE_PROJECT_ID>.supabase.co/functions/v1/<function-name>
```

The project ID is derived from `VITE_SUPABASE_URL`. For example, if the Supabase URL is `https://abcdefghij.supabase.co`, the edge function base URL is:

```
https://abcdefghij.supabase.co/functions/v1/
```

## Authentication Model

All edge functions use the shared `authorize()` helper from `supabase/functions/_shared/authorize.ts`. There are three authentication modes:

### 1. JWT (User Authentication)

The standard mode. Pass the user's Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt>
```

The function validates the token via `supabase.auth.getUser()`, then optionally checks:
- **Superadmin status** via the `is_superadmin` RPC
- **Company membership** via the `company_memberships` table
- **Role requirements** (owner, admin, manager, collaborator, community_manager, member)
- **Granular permissions** via the `user_has_permission` DB function

Superadmins bypass all company/role checks.

### 2. Service Role (Machine-to-Machine)

For cron jobs and internal function-to-function calls. Pass the `SUPABASE_SERVICE_ROLE_KEY` as a Bearer token:

```
Authorization: Bearer <service-role-key>
```

The function must opt in via `{ allowServiceRole: true }`. When matched, the request proceeds as `userId: "service_role"` with no company context.

### 3. Anonymous (Rare)

A few endpoints (e.g., `generate-social-post` for onboarding samples, `discover-rss-feeds`) allow anonymous access or gracefully degrade when no valid token is present.

## Roles

The RBAC system defines these roles in order of decreasing privilege:

| Role | Description |
|------|-------------|
| `owner` | Full access, billing, can delete company |
| `admin` | Full access except billing/deletion |
| `manager` | Content management, team oversight |
| `collaborator` | Create and edit own content |
| `community_manager` | Inbox and engagement features |
| `member` | Read-only access |

## CORS

All edge functions return these CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type,
  x-supabase-client-platform, x-supabase-client-platform-version,
  x-supabase-client-runtime, x-supabase-client-runtime-version
```

Every function handles `OPTIONS` preflight requests by returning `204` with CORS headers.

## Common Error Format

All edge functions return JSON error responses with this shape:

```json
{
  "error": "Human-readable error message"
}
```

Or, for action-based functions (getlate-posts, getlate-accounts, etc.):

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success (some functions wrap upstream errors in 200 with `success: false`) |
| `400` | Bad request (missing required fields, invalid action) |
| `401` | Missing or invalid auth token |
| `403` | Insufficient role/permission or not a company member |
| `500` | Server error (missing env vars, upstream API failure) |

### Auth Error Responses

```json
// 401 - Missing auth header
{ "error": "Unauthorized: missing auth header" }

// 401 - Invalid token
{ "error": "Unauthorized: invalid token" }

// 403 - Not a company member
{ "error": "Forbidden: not a member of this company" }

// 403 - Insufficient role
{ "error": "Forbidden: requires one of [owner, admin], you have [member]" }

// 403 - Missing permission
{ "error": "Forbidden: missing permission [manage_automations]" }

// 403 - Superadmin required
{ "error": "Forbidden: superadmin access required" }
```

## Calling Edge Functions from the Client

Using the Supabase JS client (recommended):

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('function-name', {
  body: { action: 'list', companyId: '...' },
});
```

Using `fetch` directly:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/function-name`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: 'list' }),
  }
);
```

## Rate Limiting

Edge functions do not implement their own rate limiting. However, upstream APIs (GetLate, Facebook Graph API, Gemini) may return `429` responses. When this happens, functions return:

```json
{
  "success": false,
  "error": "Rate limited. Please try again in 60 seconds.",
  "errorType": "rate_limit",
  "retryAfter": 60
}
```

The `Retry-After` value comes from the upstream API's response header.

## API Call Logging

Most edge functions log every request to the `api_call_logs` table with:
- `function_name`, `action`, `status_code`, `success`
- `duration_ms`, `error_message`
- `company_id`, `user_id`, `profile_id`, `account_ids`, `platform`
- `request_body`, `response_body` (sanitized summaries)

These logs power the Admin API Logs viewer at `/app/admin/api-logs`.

## Cron Monitoring

Functions invoked by cron schedules (e.g., `rss-poll`, `analytics-sync`) use the `CronMonitor` class from `_shared/cron-monitor.ts` to track execution status, duration, and errors in the `cron_health` table. View cron health at `/app/admin/cron-health`.
