# Test Report Template

Append one block per test session to `docs/test-reports/YYYY-MM-DD.md`.

## Template

```markdown
## [HH:MM] - [Feature/Component Name]

**Trigger:** [what change prompted these tests — e.g., "new inbox-sync edge function", "RLS migration for inbox_labels"]

| Layer | File | Tests | Pass | Fail | Skip | Duration |
|-------|------|-------|------|------|------|----------|
| L1 Contract | `scripts/getlate-contract-tests.cjs` | 12 | 12 | 0 | 0 | 3.2s |
| L2 Integration | `src/tests/integration/webhook-ingestion.test.ts` | 13 | 13 | 0 | 0 | 1.8s |
| L3 Smoke | `src/tests/smoke/inbox.test.ts` | 5 | 5 | 0 | 0 | 0.4s |
| L4 Unit | `supabase/functions/_shared/classify_test.ts` | 8 | 8 | 0 | 0 | 0.6s |
| L5 E2E | — | — | — | — | — | — |

**Coverage gaps:** [list features/paths without tests, or "None"]

**Regressions:** [previously passing tests that now fail, or "None"]

**Deploy Readiness:**
- [ ] L1 Contract tests pass (if external API)
- [ ] L2 Integration tests pass (if DB-touching)
- [ ] L3 Smoke tests pass
- [ ] L4 Unit tests pass
- [ ] L5 E2E tests pass (if user-facing)
- [ ] Test manifest updated (`docs/test-manifest.json`)
```

## Rules

1. One block per test run, not per file
2. Include duration — helps spot timeout regressions
3. Always fill "Coverage gaps" — even if "None"
4. Always fill "Regressions" — catch breakage early
5. Deploy Readiness checklist must match the change type gates from SKILL.md
