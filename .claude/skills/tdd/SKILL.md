---
name: tdd
description: Use when writing tests, adding test coverage, deploying code, or implementing features that touch Supabase edge functions, cron pipelines, external APIs, or migrations. Defines the project test pyramid, what to test per component type, and deployment gates.
---

# TDD — Project Test Strategy

Supplements the `test-driven-development` superpower (Red-Green-Refactor discipline) with project-specific guidance on WHAT to test and WHEN.

## Test Pyramid (contract tests first)

| Layer | What | Runner | When |
|-------|------|--------|------|
| L1 Contract | Real API request/response shape verification | `node scripts/*-contract-tests.cjs` | FIRST for any external API integration |
| L2 Integration | Real Supabase DB — data flows, RLS, upserts | `npm run test:integration` | Every DB-touching feature |
| L3 Smoke | Quick health probes — connectivity, functions exist | `npm run test:smoke` | Every deployable artifact |
| L4 Unit | Pure logic — parsing, formatting, HMAC, routing | `npm run test` or `deno test` | Pure functions ONLY |
| L5 E2E | Browser user journeys — role access, page loads | `npm run test:e2e` | Critical user-facing paths |

## What to Test Per Component

**Edge functions:** auth acceptance (anon vs service_role), timeout compliance (<45s), DB writes succeed, error paths return correct status codes.

**Cron dispatchers:** job registration exists in `cron.job`, fan-out fires for all companies, health log lifecycle (running → completed/failed), no orphaned "running" entries.

**External APIs (GetLate, etc.):** L1 contract test FIRST against real API. Verify field names, ID types, endpoint paths. THEN write L4 unit tests using the verified field names from the contract test output.

**React hooks:** L3 smoke test imports work, L4 unit test query keys and `enabled` guards, L5 E2E for role-gated access.

**Migrations:** L2 RLS isolation test (two users, two companies, cross-read blocked), function/trigger existence assertion, constraint violation tests.

## Never-Deploy-Without Gates

| Change Type | Required Tests |
|-------------|---------------|
| Edge function | L2 invocation probe (auth + health) + L1 contract (if external API) + L3 smoke auth |
| Migration | L2 RLS isolation + L3 function existence |
| Cron/dispatcher | L2 pipeline health + L3 vault/secret check |
| Frontend feature | L4 unit + L3 smoke imports |
| External API integration | L1 contract FIRST, then L4 unit |
| New hook (supabase.functions.invoke) | L4 mock-invoke test (correct action + body) + L0 structural |

Before deploying, verify all required layers pass. If a layer is missing, write the test BEFORE deploying.

## Hard Rules

### No Duplicated Logic Rule
Tests MUST import production functions from source — never redefine, copy, or reimplement production logic in test files. If a test contains a function that also exists in `src/lib/` or `src/hooks/`, the test is **invalid** — it tests a frozen copy, not the real code.

**Wrong:**
```typescript
// test file
function computeThrottle(config, scheduledFor, posts) { /* reimplemented */ }
it('works', () => expect(computeThrottle(...)).toBe(...));
```

**Right:**
```typescript
import { computeThrottle } from '@/lib/throttle';
it('works', () => expect(computeThrottle(...)).toBe(...));
```

### Extract-Before-Test Gate
If a React hook contains pure computation that you need to test, **extract the pure function into `src/lib/`** before writing any test. The hook becomes a thin wrapper that calls the extracted function. Both the hook and tests import from the same source.

Pattern: `src/hooks/useX.ts` → extract pure logic → `src/lib/x.ts` → test imports from `src/lib/x.ts`

### Content Assertions Over Existence Checks
`fs.existsSync()` and `expect(file).toBeDefined()` prove nothing about correctness. Tests MUST verify file **content** — DDL keywords in migrations, import chains in hooks, table references in edge functions, required fields in demo data.

**Wrong:**
```typescript
it('migration exists', () => expect(fs.existsSync(path)).toBe(true));
```

**Right:**
```typescript
const sql = fs.readFileSync(path, 'utf8');
expect(sql).toContain('CREATE TABLE evergreen_queue');
expect(sql).toContain('ROW LEVEL SECURITY');
```

### Schema Changes Require Integration Tests
Any migration that adds tables or columns MUST have an L2 integration test that:
1. Inserts a row with the new columns
2. Reads it back and verifies the values
3. Tests RLS isolation (two companies, cross-read blocked)

Unit tests asserting DDL strings are necessary but not sufficient.

## Source-Level vs Runtime Tests

Source-level tests (`fs.readFileSync` + `toContain`) are **structural checks (L0)**, not functional tests. They catch file deletions and missing exports but miss runtime bugs, type errors, and logic errors.

| Category | What it catches | What it misses |
|----------|----------------|----------------|
| Structural (L0) | Deleted code, missing exports, missing query keys | Runtime bugs, type errors, wrong values, broken imports |
| Unit (L4) | Pure function I/O | Integration issues, network failures |
| Integration (L2) | Real data flows, RLS, edge function behavior | UI rendering, user experience |

**Rules:**
- Structural tests do NOT count as "feature is tested" — they're a supplement, not a substitute
- Every hook that calls `supabase.functions.invoke` needs at minimum a mock-invoke test verifying correct action name and body shape
- Every new edge function needs an L2 invocation test (HTTP call to deployed function) within the same session it's deployed

## Edge Function Deployment Gate

After deploying ANY edge function, you MUST invoke it before marking the story as done:

1. **Auth probe**: Call with anon key — expect 401 or 403 (confirms auth middleware runs)
2. **Health probe**: Call with service_role key + minimal valid body — expect 200 or known error shape (confirms function boots)
3. **Record the result** in the integration test file

The integration test file `src/tests/integration/edge-function-health.test.ts` contains probes for all deployed functions. When adding a new edge function, add its probe to this file.

If the function returns 500 or BOOT_ERROR, the deploy is **failed** — do not proceed.

## Contract Test CI Integration

Contract tests (`scripts/*-contract-tests.cjs`) MUST run:
- Before any release that changes API client methods in `src/lib/api/`
- On a weekly schedule to catch upstream API changes
- With `--dry-run` in CI (skip write operations, validate reads)

Contract test output (`getlate-contracts.json`) is the source of truth for API shapes — not documentation, not guesses.

## Post-Deploy Verification Checklist

After every edge function deploy:
- [ ] Function appears in `supabase functions list` as ACTIVE
- [ ] Auth probe returns 401 (anon) or 403 (wrong role)
- [ ] Health probe returns 200 or expected error shape
- [ ] If function has cron trigger: check `cron_health_logs` within 1 cycle for a new entry
- [ ] If function writes to DB: query the target table to confirm a row was written/updated
- [ ] If function calls external API: verify contract test for that endpoint still passes

## Anti-Patterns (from real failures)

| Anti-Pattern | What Happened | Rule |
|---|---|---|
| Source-level test as safety net | Test checked `toContain('cursor')` in source — passed even when cursor was undefined at runtime | Source-level = structural only, add runtime test |
| Deploy without invocation | 5 edge functions deployed as ACTIVE but never called — could 500 on first real request | Always probe after deploy |
| Duplicated logic in tests | Tests passed but production function had a different bug — test had its own copy of the logic | Import from source, never redefine |
| File existence tests | 42 tests checked `fs.existsSync()` — all passed even when file content was wrong | Assert file content, not existence |
| Mocked tests pass therefore it works | GetLate field names wrong in mocks; 100% unit pass, 0% production | Contract tests FIRST for external APIs |
| I'll test after deploying | Cron rebuilt 4x, each silent-failed in prod | Write health-log assertion BEFORE deploying |
| The watchdog will catch it | If function never starts, no health logs to watch | Test vault secret presence and URL construction |
| Works when I trigger manually | Manual trigger uses different auth path than pg_cron | Integration test must invoke via the cron path |
| Trust the docs | GetLate docs said wrong endpoint paths | Contract test is the source of truth |
| Green tests = feature works | 273/273 unit tests passed but zero edge functions were invoked at runtime | Pyramid must be heavier at L2/L3 for integration-heavy projects |
| Silent skip in tests | `cron-health.test.ts` returned early with `console.warn` on RPC failure — test counted as passed | Tests must fail loudly or be removed |

## File Placement

| Test Type | Location | Config |
|---|---|---|
| Unit (jsdom) | `src/test/*.test.ts` | `vitest.config.ts` |
| Unit (Deno) | `supabase/functions/**/*_test.ts` | `deno test` |
| Integration | `src/tests/integration/*.test.ts` | `vitest.integration.config.ts` |
| Smoke | `src/tests/smoke/*.test.ts` | `vitest.smoke.config.ts` |
| E2E | `src/tests/end-to-end/*.test.ts` | `playwright.config.ts` |
| Contract | `scripts/*-contract-tests.cjs` | `node scripts/...` |

## Test Reports

After each test session, append a report block to `docs/test-reports/YYYY-MM-DD.md` using the template in `test-report-template.md`. Reports accumulate for benchmarking test health over time.

## Test Manifest

`docs/test-manifest.json` maps every feature to its test files across all 5 layers. When adding tests, update the manifest. Empty arrays = visible coverage gaps. See `test-manifest-schema.json` for the schema.
