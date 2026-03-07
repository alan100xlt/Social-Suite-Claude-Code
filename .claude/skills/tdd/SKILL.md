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
| Edge function | L1 contract (if external API) + L2 integration + L3 smoke auth |
| Migration | L2 RLS isolation + L3 function existence |
| Cron/dispatcher | L2 pipeline health + L3 vault/secret check |
| Frontend feature | L4 unit + L3 smoke imports |
| External API integration | L1 contract FIRST, then L4 unit |

Before deploying, verify all required layers pass. If a layer is missing, write the test BEFORE deploying.

## Anti-Patterns (from real failures)

| Anti-Pattern | What Happened | Rule |
|---|---|---|
| Mocked tests pass therefore it works | GetLate field names wrong in mocks; 100% unit pass, 0% production | Contract tests FIRST for external APIs |
| I'll test after deploying | Cron rebuilt 4x, each silent-failed in prod | Write health-log assertion BEFORE deploying |
| The watchdog will catch it | If function never starts, no health logs to watch | Test vault secret presence and URL construction |
| Works when I trigger manually | Manual trigger uses different auth path than pg_cron | Integration test must invoke via the cron path |
| Trust the docs | GetLate docs said wrong endpoint paths | Contract test is the source of truth |

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
