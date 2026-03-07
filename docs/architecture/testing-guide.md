# Testing Guide

Social Suite uses a 5-layer test pyramid. Each layer has its own config, runner, and purpose.

## Layer Overview

```
         /  E2E (Playwright)  \       <- slowest, browser-level user journeys
        / Smoke (Vitest, node) \      <- quick sanity checks on real DB
       / Integration (Vitest)   \     <- Supabase hooks, RLS, cross-component
      / Unit (Vitest, jsdom)     \    <- component logic, hooks, utils
     / Contract (Node scripts)    \   <- real API shape verification
```

## Running Tests

```bash
# Unit tests (default)
npm run test              # vitest run
npm run test:watch        # vitest (watch mode)
npm run test:coverage     # vitest run --coverage

# Smoke tests
npm run test:smoke        # vitest run --config vitest.smoke.config.ts

# Integration tests
npm run test:integration  # vitest run --config vitest.integration.config.ts

# E2E tests (requires dev server running or auto-starts)
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui (interactive)
npm run test:e2e:debug    # playwright test --debug

# Edge function unit tests (Deno)
deno test supabase/functions/_shared/
```

## Layer 1: Contract Tests

**Location:** `scripts/getlate-contract-tests.cjs`
**Runner:** Node.js (direct execution)
**Purpose:** Verify that real external APIs return the expected response shapes.

Contract tests hit the live GetLate API with a real API key. They validate field names, types, and response structure. Run these BEFORE writing mocked unit tests to ensure your mocks match reality.

```bash
node scripts/getlate-contract-tests.cjs
```

Requires `GETLATE_API_KEY` in `.env.local`.

Key learning: GetLate uses `message` (not `text`) for content, `profileId` is org-level (not per-social-account), and `_id` vs `id` varies by endpoint.

## Layer 2: Integration Tests

**Location:** `src/tests/integration/`
**Config:** `vitest.integration.config.ts`
**Environment:** `node` (not jsdom)
**Timeout:** 30 seconds

Integration tests connect to the real Supabase project. They test RLS policies, data flows, and edge function behavior.

### Setup (`src/tests/integration/setup.ts`)

Creates two Supabase clients:
- `adminClient` -- uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS. For setup/cleanup.
- `anonClient` -- uses anon key, respects RLS. For testing user-facing queries.

Provides test utilities:
- `createTestUser(label)` -- creates a user with `integration-test-{label}-{timestamp}@test.longtale.ai`
- `deleteTestUser(userId)` -- cleans up memberships, profile, and auth user
- `createTestCompany(name, userId)` -- inserts a company
- `addMembership(userId, companyId, role)` -- adds company membership
- `signInAsUser(email)` -- returns an authenticated client for a specific user

### Environment Variables

Loaded from `.env.local` by the config file:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Example tests

- `src/tests/integration/cron-health.test.ts` -- verifies cron health logs table
- `src/tests/integration/webhook-ingestion.test.ts` -- tests webhook event processing
- `src/tests/integration/analytics-local-reads.test.ts` -- verifies analytics queries
- `src/tests/integration/cross-tenant-isolation.test.ts` -- RLS isolation between companies

## Layer 3: Smoke Tests

**Location:** `src/tests/smoke/`
**Config:** `vitest.smoke.config.ts`
**Environment:** `node`
**Timeout:** 15 seconds

Quick sanity checks that critical database tables exist and basic queries work. Run these as a fast gate before slower integration or E2E tests.

Files:
- `src/tests/smoke/database-health.test.ts` -- checks core tables are queryable
- `src/tests/smoke/analytics-local-reads.test.ts` -- basic analytics query check
- `src/tests/smoke/inbox.test.ts` -- inbox tables exist and basic queries work
- `src/tests/smoke/platform-metrics-matrix.test.ts` -- platform metrics logic

## Layer 4: Unit Tests

**Location:** `src/test/` (files matching `src/**/*.{test,spec}.{ts,tsx}`)
**Config:** `vitest.config.ts`
**Environment:** `jsdom`
**Setup:** `src/test/setup.ts`

The setup file imports `@testing-library/jest-dom` and polyfills `window.matchMedia`.

Unit tests cover:
- Hook logic (query key construction, data transformation)
- Component rendering
- Utility functions
- State machine transitions

These are excluded from integration, smoke, and E2E directories via the vitest config `exclude` array.

Example files:
- `src/test/auth-routing.test.ts`
- `src/test/inbox-hooks.test.ts`
- `src/test/content-workflow.test.ts`
- `src/test/platform-metrics.test.ts`

### Path Aliases

All test configs resolve `@/` to `src/`:
```typescript
resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
```

## Layer 5: E2E Tests (Playwright)

**Location:** `src/tests/end-to-end/`
**Config:** `playwright.config.ts`

### Configuration

- **Browser:** Chromium only (Desktop Chrome, 1920x1080 viewport)
- **Base URL:** `http://localhost:8080`
- **Timeouts:** 60s test, 10s action, 30s navigation
- **Retries:** 0 locally, 2 in CI
- **Workers:** 1 (sequential, not parallel)
- **Artifacts:** Screenshots on failure, video retained on failure, trace on first retry

### Auth Setup

Uses Playwright's `setup` project pattern. An `auth.setup.ts` file runs first to authenticate test users and save their session state. Subsequent tests depend on this setup:

```typescript
projects: [
  { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['auth-setup'] },
]
```

### Web Server

Playwright auto-starts the dev server if not already running:
```typescript
webServer: {
  command: 'npm run dev',
  port: 8080,
  reuseExistingServer: true,
  timeout: 120000,
}
```

## Test Manifest

**File:** `docs/test-manifest.json`

Maps every feature to its test files across all 5 layers. Useful for coverage analysis and knowing where to add new tests.

Structure:
```json
{
  "features": {
    "inbox": {
      "description": "Inbox sync, conversations, messages, AI classification",
      "L1_contract": ["scripts/getlate-contract-tests.cjs"],
      "L2_integration": ["src/tests/integration/webhook-ingestion.test.ts"],
      "L3_smoke": ["src/tests/smoke/inbox.test.ts"],
      "L4_unit": ["src/test/inbox-hooks.test.ts", "..."],
      "L5_e2e": []
    }
  }
}
```

## Contract-First Methodology

The project follows a strict rule: **write contract tests before mocked unit tests** for any external API integration. The flow:

1. Write a contract test that hits the real API
2. Record the actual response shapes
3. Write unit tests with mocks that match the recorded shapes
4. If the contract test fails in CI, your mocks are stale

This was established after discovering that GetLate's actual API response shapes differ from their documentation (e.g., `_id` vs `id`, `message` vs `text`).

## Edge Function Tests

Shared module tests use Deno's built-in test runner (not Vitest):

- `supabase/functions/_shared/auto-respond_test.ts`
- `supabase/functions/_shared/classify_test.ts`
- `supabase/functions/_shared/webhook_security_test.ts`
- `supabase/functions/getlate-webhook/webhook-utils_test.ts`

These test pure functions (HMAC verification, payload normalization, event routing) without DB dependencies.

## CI/CD

- `.github/workflows/supabase-deploy.yml` deploys migrations and edge functions on push to `main`
- Test commands are in `package.json` scripts section
- `prepush` hook runs `npm run test && npm run test:e2e`
