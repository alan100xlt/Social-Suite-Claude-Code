# Local Development Setup

## Prerequisites

- **Node.js** >= 18
- **npm** (comes with Node)
- **Supabase CLI** (`npm install -g supabase` or `brew install supabase/tap/supabase`)
- **Git**
- **Deno** (for edge function development/testing)

## Clone and Install

```bash
git clone <repo-url>
cd Social-Suite-Claude-Code
npm install
```

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GETLATE_API_KEY=<getlate-api-key>
```

### What goes where

| Secret | `.env.local` | Supabase Secrets | Notes |
|--------|:---:|:---:|-------|
| `VITE_SUPABASE_URL` | Yes | -- | Frontend env var |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | -- | Frontend env var (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Local tests + edge functions |
| `GETLATE_API_KEY` | Yes | Yes | Contract tests + edge functions |
| `GEMINI_API_KEY` | -- | Yes | Edge functions only |
| `RESEND_API_KEY` | -- | Yes | Edge functions only |
| `FIRECRAWL_API_KEY` | -- | Yes | Edge functions only |
| `COURIER_AUTH_TOKEN` | -- | Yes | Edge functions only |

Do NOT add production-only secrets to `.env.local`.

## Dev Server

```bash
npm run dev
```

Starts Vite on port 8080 (increments if busy). The app is available at `http://localhost:8080`. Network URL is printed for cross-device testing.

HMR overlay is enabled -- runtime errors appear as a red overlay in the browser, not a silent white screen.

## TypeScript Check

```bash
npx tsc --noEmit
```

Fast error check without building. Use this as a quick sanity check before committing.

## Linting

```bash
npm run lint
```

Runs ESLint with React hooks and refresh plugins.

## Running Tests

```bash
# Unit tests
npm run test              # single run
npm run test:watch        # watch mode

# Smoke tests (quick DB sanity checks)
npm run test:smoke

# Integration tests (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
npm run test:integration

# E2E tests (starts dev server if not running)
npm run test:e2e
npm run test:e2e:ui       # interactive UI
```

See `docs/architecture/testing-guide.md` for full details on each layer.

## Database

### Push Migrations

```bash
npm run db:migrate        # supabase db push
```

Pushes all migrations from `supabase/migrations/` to the remote Supabase project.

### Reset Local Database

```bash
npm run db:reset          # supabase db reset
```

Resets the local Supabase database (requires `supabase start` first).

### Local Supabase

```bash
npm run supabase:start    # starts local Supabase stack
npm run supabase:stop     # stops it
npm run supabase:status   # check running services
```

## Edge Function Development

### Serve Locally

```bash
supabase functions serve
```

Serves all edge functions locally. Requires secrets in `supabase/functions/.env` (create this manually for local dev).

### Deploy a Single Function

```bash
supabase functions deploy <function-name>
```

### Deploy All Functions

Handled by CI (`.github/workflows/supabase-deploy.yml`) on push to `main`.

### Test Edge Functions

```bash
# Deno unit tests for shared modules
deno test supabase/functions/_shared/

# Integration tests that hit deployed functions
npm run test:integration
```

## Build

```bash
npm run build             # production build
npm run build:dev         # development build (source maps, no minification)
```

Output goes to `dist/`.

## Common Troubleshooting

### White screen / blank page

1. Check browser console for errors
2. Look for `process.env` usage (should be `import.meta.env.VITE_*`)
3. Check for `ioredis` imports in client code (server-only module)
4. Run `npx tsc --noEmit` to find type errors
5. Use the `debug-build` skill: `/debug-build`

### CSS @import order

In `src/index.css`, Google Fonts `@import` statements MUST come BEFORE `@tailwind` directives. Vite/PostCSS will silently break otherwise.

### Missing VITE_ prefix

Environment variables accessed via `import.meta.env` must be prefixed with `VITE_`. Without the prefix, Vite won't expose them to the client.

### Integration tests failing with "Missing environment variable"

Ensure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`. The `vitest.integration.config.ts` reads this file manually.

### Edge functions returning 500

Check `supabase functions logs <function-name>` for errors. Common causes:
- Missing secret (`supabase secrets set KEY=VALUE`)
- Import URL version mismatch in Deno imports

### Bundle size warnings

The bundle is ~4MB (mostly Nivo charts). Analytics routes are lazy-loaded. To analyze:
```bash
npm run analyze:bundle
```

## Test Accounts

For testing with real data, log in with these credentials:

- **Superadmin:** `alan@100xlt.ai` / `pam12ela`
- **Test accounts** (password: `TestPass123`, company: DiarioJudio):
  - `test-owner@longtale.ai`
  - `test-admin@longtale.ai`
  - `test-member@longtale.ai`

## Key File Paths

| What | Path |
|------|------|
| Routes | `src/App.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Auto-generated types | `src/integrations/supabase/types.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Company context | `src/contexts/SelectedCompanyContext.tsx` |
| Hooks | `src/hooks/` |
| Edge functions | `supabase/functions/` |
| Migrations | `supabase/migrations/` |
| Test setup (unit) | `src/test/setup.ts` |
| Test setup (integration) | `src/tests/integration/setup.ts` |
