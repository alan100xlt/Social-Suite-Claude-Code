# Trail of Bits Security -- Detailed Checklist

## Table of Contents
- [React Component Security](#react-component-security)
- [Supabase RLS Audit](#supabase-rls-audit)
- [Deno Edge Function Hardening](#deno-edge-function-hardening)
- [CORS Configuration](#cors-configuration)
- [Cryptographic Pitfalls](#cryptographic-pitfalls)
- [URL and Redirect Validation](#url-and-redirect-validation)
- [File Upload Security](#file-upload-security)
- [HTTP Header Security](#http-header-security)
- [Error Handling and Information Leakage](#error-handling-and-information-leakage)
- [Third-Party Integration Security](#third-party-integration-security)

## React Component Security

### XSS Vectors in JSX

React auto-escapes string interpolation in JSX, but these bypass that protection:

```tsx
// DANGEROUS -- all of these can execute arbitrary JS
<div dangerouslySetInnerHTML={{ __html: userInput }} />
<a href={userInput}>Link</a>           // javascript: protocol
<iframe src={userInput} />              // javascript: protocol
<img src={userInput} onerror="alert(1)"/> // React strips event handlers, but...
<div style={userControlledStyleObj} />  // CSS injection (data exfiltration)
<script>{userInput}</script>            // Never used in React, but catches
```

### Safe Patterns

```tsx
// Safe: URL validation
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Safe: Sanitize HTML before dangerouslySetInnerHTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />

// Safe: Escape user input in attributes
<div title={String(userInput).slice(0, 200)} />
```

### State Management Security

- Never store secrets (tokens, keys) in React state, Context, or Redux. Use httpOnly cookies or Supabase session.
- `localStorage` and `sessionStorage` are accessible to any JS on the page (XSS = game over).
- Supabase stores the session in `localStorage` by default. This is acceptable for the auth token but nothing else sensitive.

## Supabase RLS Audit

### Checklist for Every Table

```sql
-- 1. RLS must be enabled
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 2. SELECT policy must filter by company_id or user_id
CREATE POLICY "Users see own company data"
  ON my_table FOR SELECT
  USING (company_id = (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- 3. INSERT policy must set company_id from session, not from request
CREATE POLICY "Users insert to own company"
  ON my_table FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- 4. UPDATE/DELETE policies must also filter
CREATE POLICY "Users update own company data"
  ON my_table FOR UPDATE
  USING (company_id = (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- 5. No policies = no access (with RLS enabled). Verify this is intentional.
```

### Common RLS Mistakes

- Policy uses `auth.uid()` but the table relates to companies via a join table. The policy must traverse the join.
- `FOR ALL` policies are tempting but make auditing harder. Use explicit `SELECT/INSERT/UPDATE/DELETE`.
- Forgetting to add policies for new tables. Every migration that creates a table must include RLS.
- Using `SECURITY DEFINER` functions that bypass RLS without re-checking permissions inside the function.

## Deno Edge Function Hardening

### Request Validation Template

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://yourdomain.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // 2. Method check
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 3. Auth verification (NEVER trust getSession alone)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 4. Input validation
  let body: unknown;
  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 1_000_000) { // 1MB limit
      return new Response("Payload too large", { status: 413 });
    }
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // 5. Type-check the body (use zod, superstruct, or manual checks)
  // ...

  // 6. Business logic with user-scoped supabase client (respects RLS)
  // ...

  // 7. Response with security headers
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://yourdomain.com",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
```

### Edge Function Anti-Patterns

- Using `service_role` client for user-initiated operations (bypasses RLS).
- Not validating `Content-Type` header before calling `req.json()`.
- Catching errors and returning `error.message` to the client (leaks internals).
- No request size limit (memory exhaustion attack).
- Trusting `req.headers.get("x-forwarded-for")` for security decisions (spoofable).

## CORS Configuration

### Trail of Bits CORS Rules (from semgrep rules)

Bad CORS patterns detected by Trail of Bits semgrep rules:

1. **Reflecting origin**: Setting `Access-Control-Allow-Origin` to whatever the request sends in `Origin`.
2. **Wildcard with credentials**: `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true`.
3. **Unescaped dots in regex**: `/example.com/` matches `exampleXcom` (`.` is any char in regex).
4. **Missing `$` anchor**: `/^https:\/\/example\.com/` matches `https://example.com.evil.com`.
5. **Allowing `null` origin**: Sandboxed iframes and redirects send `Origin: null`.

### Safe CORS Pattern

```typescript
const ALLOWED_ORIGINS = new Set([
  "https://app.yourdomain.com",
  "https://yourdomain.com",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
  };
}
```

## Cryptographic Pitfalls

### Timing-Safe Comparison

```typescript
// Node.js / Deno
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return timingSafeEqual(bufA, bufB);
}
```

### Weak Randomness

- `Math.random()` is NOT cryptographically secure. Never use for tokens, IDs, or nonces.
- Use `crypto.randomUUID()` (available in Deno and modern browsers).
- For tokens: `crypto.getRandomValues(new Uint8Array(32))` + base64 encode.

### Hashing

- Never use MD5 or SHA-1 for security purposes (passwords, integrity checks).
- Password hashing: Supabase Auth handles this. If you roll your own, use bcrypt/scrypt/argon2.
- HMAC for webhook signature verification: use `crypto.subtle.importKey` + `crypto.subtle.sign` in Deno.

## URL and Redirect Validation

### SSRF Prevention

```typescript
function isPublicUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);

    // Protocol check
    if (!['https:', 'http:'].includes(url.protocol)) return false;

    // Block private/reserved IPs
    const hostname = url.hostname.toLowerCase();
    const blocked = [
      'localhost', '127.0.0.1', '[::1]', '0.0.0.0',
      '169.254.169.254', // AWS metadata
      'metadata.google.internal', // GCP metadata
    ];
    if (blocked.includes(hostname)) return false;

    // Block private IP ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

### Open Redirect Prevention

- Never redirect to a URL from user input without validation.
- Always validate the redirect target is on your own domain.
- Use relative paths for redirects when possible.

```typescript
function isSafeRedirect(url: string, allowedHost: string): boolean {
  try {
    const parsed = new URL(url, `https://${allowedHost}`);
    return parsed.hostname === allowedHost;
  } catch {
    return false;
  }
}
```

## File Upload Security

- Validate MIME type on server (not just file extension). `Content-Type` header is spoofable.
- Use magic bytes (file signature) to verify actual file type.
- Store uploaded files outside the web root or in object storage (Supabase Storage).
- Set `Content-Disposition: attachment` for downloads to prevent inline rendering.
- SVG files can contain `<script>` -- serve as `Content-Type: application/octet-stream` or sanitize.
- Limit file size at the edge function level (check `Content-Length` before reading body).
- Generate random filenames (never use user-provided filenames for storage keys).

## HTTP Header Security

Headers to set on every response from edge functions:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

For Vercel/frontend, these go in `vercel.json` headers config.

## Error Handling and Information Leakage

- Never return raw error objects to clients: `return new Response(error.message)` leaks internals.
- Log full errors server-side, return generic messages to clients.
- Remove stack traces in production responses.
- Do not include SQL error messages in API responses (leaks schema info).

```typescript
// BAD
catch (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
}

// GOOD
catch (error) {
  console.error("Operation failed:", error); // Server-side log
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
}
```

## Third-Party Integration Security

### Webhook Verification

Always verify webhook signatures. Never trust the payload without cryptographic verification:

```typescript
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // Use timing-safe comparison for the final check
  return safeCompare(expected, signature);
}
```

### OAuth State Parameter

- Always include a `state` parameter in OAuth flows to prevent CSRF.
- The `state` must be cryptographically random and bound to the user's session.
- Verify `state` matches before processing the OAuth callback.

### API Key Scoping

- Use the least-privileged API key for each integration.
- Supabase: `anon` key for client, `service_role` only in edge functions.
- External APIs: read-only keys where possible.
- Never share API keys between environments (dev/staging/prod).
