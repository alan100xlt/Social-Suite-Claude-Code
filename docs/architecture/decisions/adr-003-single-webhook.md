# ADR-003: Single Account-Level Webhook

**Status:** Accepted
**Date:** 2026-03-07

## Context

GetLate sends real-time webhook events for messages, comments, post failures, and account disconnections. We need to receive these events and route them to the correct company's data.

Two approaches were considered:
1. **Per-company webhooks:** Register a separate webhook endpoint for each company. Each has its own HMAC secret.
2. **Single account-level webhook:** Register one webhook on the GetLate account. All events for all companies arrive at the same endpoint.

## Decision

We use a **hybrid approach**: webhooks are registered per-company (each company gets its own HMAC secret and registration in `webhook_registrations`), but they all point to the same edge function endpoint (`getlate-webhook`). Additionally, the `webhook-admin` function can register a single "catch-all" webhook named `longtale-all`.

The webhook receiver resolves which company an event belongs to using the event payload and HMAC verification.

## Implementation

### Webhook Registration

**Auto-registration** (`supabase/functions/getlate-connect/index.ts`, line 613-685):

When a company first connects a social account (via `ensure-profile` action), the `registerWebhooks()` function:
1. Generates a random 32-byte HMAC secret
2. Calls `POST /webhooks/settings` on GetLate with the secret and event list
3. Stores the registration in `webhook_registrations` table

**Admin registration** (`supabase/functions/webhook-admin/index.ts`, line 90-172):

Superadmins can register a single catch-all webhook via the admin UI. This uses an "anchor company" (first company with a `getlate_profile_id`) as the registration owner.

### Database Schema

**File:** `supabase/migrations/20260307140000_webhook_infrastructure.sql`

```sql
CREATE TABLE public.webhook_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'getlate',
  webhook_id text,              -- GetLate's webhook ID (for management)
  secret text NOT NULL,         -- HMAC-SHA256 secret
  events text[] NOT NULL,       -- subscribed event types
  is_active boolean NOT NULL DEFAULT true,
  consecutive_failures int NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  UNIQUE(company_id, provider)  -- one registration per company per provider
);
```

Plus `webhook_event_log` for idempotency and debugging (unique on `provider, event_id`).

### Company Resolution

**File:** `supabase/functions/getlate-webhook/index.ts`

The webhook receiver resolves the company through a two-step process:

**Step 1: Try profileId (fast path)**

The event payload contains a `profileId`. Look up the company by `companies.getlate_profile_id`:

```typescript
if (normalized.profileId) {
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('getlate_profile_id', normalized.profileId)
    .maybeSingle();
  if (company) companyId = company.id;
}
```

Then verify HMAC against that company's registered secret.

**Step 2: Fallback -- iterate all registrations**

If the profileId doesn't match a company, or HMAC verification fails with the matched company's secret, iterate ALL active registrations and try each secret:

```typescript
if (!hmacValid && signatureHeader) {
  const { data: regs } = await supabase
    .from('webhook_registrations')
    .select('company_id, secret')
    .eq('provider', 'getlate')
    .eq('is_active', true);

  for (const reg of regs || []) {
    if (await verifyHmacSignature(rawBody, signatureHeader, reg.secret)) {
      hmacValid = true;
      companyId = reg.company_id;
      break;
    }
  }
}
```

This fallback handles cases where GetLate doesn't include a `profileId` in the payload (it happens with some event types).

### HMAC Verification

**File:** `supabase/functions/getlate-webhook/webhook-utils.ts`

Uses Web Crypto API (not Node crypto):

```typescript
export async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encode(rawBody));
  const computed = hex(sig);
  const expected = signatureHeader.replace(/^sha256=/, '');
  // constant-time comparison
  return constantTimeEqual(computed, expected);
}
```

The receiver checks multiple header names for the signature: `x-webhook-signature`, `x-getlate-signature`, `x-hub-signature-256`, `x-signature`.

### Event Types

Subscribed events:
- `message.received` / `message.new` -- DMs
- `comment.received` / `comment.new` -- Post comments
- `post.failed` / `post.partial` -- Publishing failures
- `account.disconnected` -- Account deauth
- `webhook.test` -- Test ping

### Error Handling: Always Return 200

GetLate auto-disables webhooks after 10 consecutive non-200 responses. The receiver returns 200 even on internal errors:

```typescript
// Return 200 even on errors to prevent auto-disable
return jsonResponse({ success: false, event: eventType, error: errorMsg });
```

Only HMAC verification failures return 401.

### Failure Tracking

The `webhook_registrations` table tracks `consecutive_failures`. On successful event processing, the counter resets to 0. On HMAC failure, it increments. This lets the admin dashboard show webhook health.

### Idempotency

Each event has an `event_id`. Before processing, the receiver checks `webhook_event_log` for duplicates:

```typescript
const { data: existing } = await supabase
  .from('webhook_event_log')
  .select('id')
  .eq('provider', 'getlate')
  .eq('event_id', normalized.eventId)
  .maybeSingle();

if (existing) {
  return jsonResponse({ ignored: true, reason: 'duplicate_event' });
}
```

### Replay Protection

Events older than 5 minutes are rejected (configurable via `DEFAULT_MAX_AGE_MS` in `webhook-utils.ts`):

```typescript
export function isTimestampValid(timestamp: string | null, maxAgeMs = 5 * 60 * 1000): boolean {
  // ...
}
```

## Consequences

**Pros:**
- Simple setup -- one webhook URL for everything
- HMAC secrets are per-company, so compromising one company's secret doesn't affect others
- Fallback resolution handles edge cases in GetLate's payload format

**Cons:**
- The fallback iteration is O(n) where n = number of companies. Acceptable at current scale but would need indexing or caching if we reach hundreds of companies.
- No signature header means no verification (logged as warning, event still processed during "discovery phase")

## Related Files

- `supabase/functions/getlate-webhook/index.ts` -- webhook receiver
- `supabase/functions/getlate-webhook/webhook-utils.ts` -- HMAC, normalization, routing
- `supabase/functions/getlate-connect/index.ts` -- auto-registers webhooks on profile creation
- `supabase/functions/webhook-admin/index.ts` -- admin webhook management
- `supabase/migrations/20260307140000_webhook_infrastructure.sql` -- schema
- `supabase/functions/getlate-webhook/webhook-utils_test.ts` -- unit tests
- `supabase/functions/_shared/webhook_security_test.ts` -- security tests
