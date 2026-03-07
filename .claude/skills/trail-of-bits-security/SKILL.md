---
name: trail-of-bits-security
description: |
  Security review checklist based on Trail of Bits semgrep rules and Testing Handbook.
  Covers insecure defaults, sharp edges, auth anti-patterns, input validation, dependency
  security, and secrets management for web apps. Use when: (1) reviewing code for security
  issues, (2) auditing a PR or feature for vulnerabilities, (3) checking for insecure
  defaults in React/Supabase/Deno edge functions, (4) the user asks about XSS, CSRF,
  SSRF, injection, prototype pollution, timing attacks, or supply chain security.
---

# Trail of Bits Security Checklist

Security review skill for React + Supabase + Deno edge function stacks. Based on Trail of Bits' public semgrep rules (`p/trailofbits`) and the Testing Handbook (appsec.guide).

## Quick Review Workflow

1. Identify what changed (new endpoint, new input, new dependency, auth change)
2. Run the relevant checklist section below
3. For deep dives, see [references/detailed-checklist.md](references/detailed-checklist.md)

## 1. Insecure Defaults

Things that are insecure out of the box and require explicit opt-in to secure.

**Node.js / Deno:**
- `NODE_TLS_REJECT_UNAUTHORIZED=0` disables ALL TLS validation. Never set this.
- `fetch()` in Deno follows redirects by default -- attacker-controlled URLs can redirect to internal services (SSRF).
- `JSON.parse()` does not sanitize -- parsed objects can contain `__proto__` keys.

**Supabase:**
- Supabase client with `anon` key bypasses RLS if policies are missing. Every table MUST have RLS enabled + policies.
- `supabase.auth.getSession()` reads from local storage (spoofable). Use `supabase.auth.getUser()` for server-side auth checks.
- Edge functions: `Deno.serve()` has no CORS by default. Add explicit `Access-Control-Allow-Origin` headers (never `*` in production).
- Service role key bypasses RLS entirely. Never expose it to the client. Never log it.

**React:**
- `dangerouslySetInnerHTML` is the #1 XSS vector. Audit every usage.
- `href={userInput}` allows `javascript:` URLs. Validate with URL constructor + allowlist schemes (`https:`, `http:`).
- `<iframe src={userInput}>` without `sandbox` attribute is an XSS vector.
- React does NOT sanitize `style` props -- CSS injection is possible via user-controlled style objects.

**CORS:**
- `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is a browser-rejected but commonly attempted misconfiguration.
- Reflecting the `Origin` header as `Access-Control-Allow-Origin` is equivalent to `*` but worse (allows credentialed requests).
- Regex-based origin validation is error-prone. Dot (`.`) must be escaped. Pattern must end with `$`. The origin `null` must be rejected.

**PostgreSQL (Supabase):**
- Connection strings with `sslmode=disable`, `sslmode=allow`, or `sslmode=prefer` are insecure. Use `sslmode=verify-full`.
- `ssl=false` and `requiressl=0` disable encryption entirely.

## 2. Sharp Edges (Footguns)

Code that looks safe but is not.

**Timing attacks:**
- String comparison (`===`) on secrets leaks length via timing. Use constant-time comparison:
  ```typescript
  // BAD
  if (token === storedToken) { ... }

  // GOOD (Deno edge function)
  import { timingSafeEqual } from "node:crypto";
  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(storedToken);
  if (a.byteLength === b.byteLength && timingSafeEqual(a, b)) { ... }
  ```

**Prototype pollution:**
- `Object.assign({}, userInput)` copies `__proto__` properties. Use `Object.create(null)` as target or sanitize keys.
- Lodash `_.merge()`, `_.defaultsDeep()` are historically vulnerable. Prefer spread operator or `structuredClone()`.
- `JSON.parse(untrustedString)` can produce objects with `__proto__`. Strip it:
  ```typescript
  JSON.parse(str, (key, value) => key === '__proto__' ? undefined : value);
  ```

**ReDoS (Regular Expression Denial of Service):**
- Nested quantifiers like `(a+)+`, `(a|a)*`, `(a{1,10}){1,10}` cause exponential backtracking.
- User-controlled regex input is always dangerous. Never pass user input to `new RegExp()` without escaping.
- Use `re2` or built-in timeout mechanisms for server-side regex on untrusted input.

**Integer/type coercion:**
- `parseInt("08")` returns `0` in old engines (octal). Always pass radix: `parseInt(x, 10)`.
- `Number("")` returns `0`, not `NaN`. Validate empty strings before conversion.
- `Array.isArray()` returns `false` for typed arrays. Check what you actually need.

## 3. Authentication & Authorization

**Anti-patterns to catch:**
- Checking `session` existence without verifying the JWT. Supabase `getSession()` is client-side only. Edge functions must use `getUser()`.
- Missing RLS policies = public data. Check `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for every table.
- JWT expiry not checked. Supabase handles this, but custom JWT verification must check `exp`.
- Role checks in frontend only. Always enforce roles in RLS policies or edge function middleware.
- Using `company_id` from the request body instead of extracting it from the JWT/session.

**Supabase-specific:**
- `service_role` key usage must be limited to: edge functions, migrations, admin scripts. Never in client code.
- RLS policies should use `auth.uid()` not a passed-in user ID.
- `INSERT` policies must set `company_id` from session, not allow client to specify it.

## 4. Input Validation & Sanitization

**XSS:**
- React escapes JSX interpolation (`{variable}`) but NOT `dangerouslySetInnerHTML`, `href`, `src`, `srcDoc`, or event handlers.
- Markdown renderers (react-markdown, etc.) must disable `allowDangerousHtml`.
- SVG files can contain `<script>` tags. Never serve user-uploaded SVGs with `Content-Type: image/svg+xml` without sanitization.

**Injection:**
- Supabase `.rpc()` calls: ensure the underlying SQL function uses parameterized queries, not string concatenation.
- Template literals in SQL: `supabase.rpc('func', { param: userInput })` is safe. Building SQL strings is not.
- Edge functions: never interpolate user input into shell commands, SQL, or HTTP headers.

**SSRF:**
- Any feature that fetches a user-provided URL (RSS feeds, link previews, webhooks) is an SSRF vector.
- Validate URLs: reject `localhost`, `127.0.0.1`, `169.254.169.254` (AWS metadata), `10.*`, `172.16-31.*`, `192.168.*`, `[::1]`.
- Follow redirects cautiously -- a public URL can redirect to an internal IP.
- For RSS/feed fetching, use an allowlist of domains or a proxy service.

## 5. Dependency Security

**Supply chain attacks:**
- Pin exact versions in `package.json` (no `^` or `~` for security-critical deps).
- `package-lock.json` must be committed and reviewed in PRs. Lockfile attacks inject malicious resolved URLs.
- Audit regularly: `npm audit --production` (skip devDependencies noise).
- Verify no `install` scripts run malicious code: `npm install --ignore-scripts` + explicit build step.

**Dependency hygiene:**
- Check for known vulnerable packages: `npm audit`.
- Remove unused dependencies. Each dep is attack surface.
- Prefer dependencies with: active maintenance, security policy, no native/binary addons.
- Deno edge functions: pin exact versions in import URLs. `https://deno.land/std@0.200.0/` not `https://deno.land/std/`.

## 6. Secrets Management

**Rules:**
- Never log secrets, tokens, API keys, or passwords. Grep for `console.log` near secret variables.
- Never include secrets in error messages or HTTP responses.
- Environment variables: use `.env.local` for local dev, Supabase Secrets for production. Never commit `.env` files.
- Rotate secrets if they appear in git history (even in reverted commits). Git history is permanent.
- Frontend code (Vite `VITE_*` vars) is PUBLIC. Never put private keys in `VITE_*` variables.

**Detection patterns:**
```bash
# Find potential hardcoded secrets
grep -rn "password\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx"
grep -rn "api_key\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx"
grep -rn "secret\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx"
grep -rn "Bearer [A-Za-z0-9\-._~+/]+" src/ --include="*.ts" --include="*.tsx"

# Find console.log near sensitive variables
grep -rn "console\.log.*\(.*token\|.*key\|.*secret\|.*password" src/ --include="*.ts" --include="*.tsx"

# Find secrets in VITE_ env vars that shouldn't be public
grep -rn "VITE_.*SECRET\|VITE_.*PASSWORD\|VITE_.*PRIVATE" src/ .env*
```

## 7. Supabase Edge Function Security

Deno edge functions have unique security considerations:

- **Auth verification**: Always verify the JWT in the `Authorization` header. Use `supabase.auth.getUser()`, not `getSession()`.
- **CORS headers**: Set explicit `Access-Control-Allow-Origin` for your domain. Never `*` in production.
- **Rate limiting**: Edge functions have no built-in rate limiting. Implement via Supabase or upstream proxy.
- **Error responses**: Never leak stack traces or internal error messages to clients.
- **Request size**: Validate `Content-Length` before parsing large request bodies.
- **Permissions**: Use the `anon` key Supabase client for user-scoped operations, `service_role` only when explicitly needed.

## Running Trail of Bits Semgrep Rules

To scan the codebase with Trail of Bits' public rules:
```bash
# Install semgrep
pip install semgrep

# Run Trail of Bits rules (covers JS, generic patterns, CORS, CSRF, etc.)
semgrep --config "p/trailofbits" src/

# Run specific categories
semgrep --config "p/trailofbits" --include="*.ts" --include="*.tsx" src/
```

Key rules relevant to this stack:
- `node-disable-certificate-validation` -- catches `NODE_TLS_REJECT_UNAUTHORIZED=0`
- `postgres-insecure-sslmode` -- catches insecure PostgreSQL connection strings
- `v3-*-cors` / `v4-csrf-prevention` -- catches GraphQL CORS/CSRF issues (applicable pattern to REST too)

For the full detailed checklist with code examples, see [references/detailed-checklist.md](references/detailed-checklist.md).
