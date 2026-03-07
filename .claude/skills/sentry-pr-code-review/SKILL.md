---
name: sentry-pr-code-review
description: |
  PR code review checklist inspired by Sentry's engineering practices. Use when
  reviewing PRs, preparing code for review, or auditing code quality beyond lint.
  Covers: error handling, observability, performance monitoring, release hygiene,
  testing expectations, and code review discipline. Adapted for React 18,
  Supabase edge functions, Vite, and TanStack Query. Invoke when user says
  "sentry review", "deep review", "production readiness check", or when the
  review-pr skill needs a more thorough quality gate.
---

# Sentry-Inspired PR Code Review

Run this checklist against every PR. Each section has a PASS/FAIL verdict.
For deep-dive guidance on any section, read the linked reference file.

## Quick Review Checklist

### 1. Error Handling — [references/error-handling-checklist.md](references/error-handling-checklist.md)

- [ ] React error boundaries wrap route-level and widget-level components
- [ ] TanStack Query hooks define `onError` or render `error` state (not just `isLoading`)
- [ ] Async functions use try/catch with meaningful error context
- [ ] User-facing errors show actionable messages, not raw exceptions
- [ ] Supabase calls check `.error` before using `.data`
- [ ] Edge functions return structured error JSON with appropriate HTTP status codes
- [ ] No silent `catch {}` blocks that swallow errors

### 2. Observability — [references/observability-checklist.md](references/observability-checklist.md)

- [ ] Key user actions tracked via PostHog events (not just page views)
- [ ] Console logging is structured: `console.error(context, error)` not `console.log(error)`
- [ ] Navigation breadcrumbs maintained (React Router transitions tracked)
- [ ] Supabase RPC and query calls include timing context for debugging
- [ ] Edge functions log request ID, company ID, and operation name
- [ ] No credentials or PII in log output

### 3. Release Hygiene — [references/release-hygiene-checklist.md](references/release-hygiene-checklist.md)

- [ ] New features behind a feature gate (context flag, env var, or DB toggle)
- [ ] Database migrations are backward-compatible (old code works with new schema)
- [ ] No breaking API changes without versioning or migration path
- [ ] Rollback plan documented if change touches data or external integrations
- [ ] Vercel preview deployment tested before merge

### 4. Performance — [references/performance-checklist.md](references/performance-checklist.md)

- [ ] No new eager imports of heavy libraries (use `React.lazy()` for routes)
- [ ] TanStack Query keys are stable (no object references that change every render)
- [ ] `enabled` guard present on queries that depend on async data (`enabled: !!companyId`)
- [ ] No N+1 query patterns (fetching in a loop instead of batch)
- [ ] Images/assets optimized or lazy-loaded
- [ ] Supabase queries use indexes (filter on indexed columns, avoid full scans)
- [ ] No unnecessary re-renders (memo, useMemo, useCallback where measurable)

### 5. Testing — [references/testing-expectations.md](references/testing-expectations.md)

- [ ] Functional tests cover the user-facing behavior, not implementation details
- [ ] Tests use RTL queries by role/label, not test IDs (unless no alternative)
- [ ] Error and empty states tested, not just happy path
- [ ] Permission/access control logic has test coverage
- [ ] Supabase hooks tested with mock responses for success AND failure
- [ ] No branching or looping in test code
- [ ] Demo data updated if new feature uses TanStack Query

### 6. Code Review Discipline — [references/code-review-philosophy.md](references/code-review-philosophy.md)

- [ ] PR is scoped to a single feature or behavior change
- [ ] PR description explains WHAT and WHY, not just what files changed
- [ ] Variable/function names are clear and consistent with existing codebase
- [ ] No dead code, commented-out blocks, or TODO without a Linear issue
- [ ] Complex logic has inline comments explaining WHY (not WHAT)
- [ ] No accidental `process.env` (must be `import.meta.env.VITE_*`)
- [ ] No server-only imports (`ioredis`, `fs`, `child_process`) in client code

## Review Verdict Decision

```
IF any item in Error Handling or Testing FAILS → REQUEST CHANGES
IF 3+ items across other sections FAIL → REQUEST CHANGES
IF 1-2 minor items FAIL and are acknowledged → APPROVE with comments
IF all items PASS → APPROVE
```

## Output Format

```
## Sentry-Style Review: #<number> — <title>

### Error Handling: PASS | FAIL
<details per item>

### Observability: PASS | FAIL
<details per item>

### Release Hygiene: PASS | FAIL
<details per item>

### Performance: PASS | FAIL
<details per item>

### Testing: PASS | FAIL
<details per item>

### Code Discipline: PASS | FAIL
<details per item>

### Verdict: APPROVE | REQUEST CHANGES | COMMENT
<justification — 1-2 sentences>
```

## Integration with review-pr Skill

This skill complements the `review-pr` skill. Use both together:

1. Run `review-pr` for structural analysis (diff summary, security review, lint/type checks)
2. Run `sentry-pr-code-review` for quality discipline (this checklist)
3. Combine both outputs into a single review comment

## When to Read Reference Files

- **Failing a checklist item and need the fix pattern?** Read the relevant reference.
- **Onboarding a new reviewer?** Read `code-review-philosophy.md` first.
- **Unsure about testing expectations for a specific change type?** Read `testing-expectations.md`.
- **Adding observability to new code?** Read `observability-checklist.md` for patterns.
