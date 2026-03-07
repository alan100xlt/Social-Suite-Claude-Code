# Release Hygiene Checklist

Inspired by Sentry's feature flag system, canary deploys, and graduation process.
Adapted for Vite + Vercel + Supabase migrations.

## Table of Contents
- Feature Gating
- Migration Safety
- Backward Compatibility
- Rollback Planning
- Vercel Deploy Strategy
- Feature Graduation

## Feature Gating

Every new user-facing feature should be gatable. This allows:
- Incremental rollout to specific companies
- Kill switch if something breaks in production
- A/B testing without separate branches

**Pattern 1 — React Context flag (simplest):**
```tsx
// In a feature flags context or company settings
const FEATURE_FLAGS = {
  'analytics-v4': false,
  'ai-content-gen': true,
} as const;

// Usage in component
function AnalyticsPage() {
  const flags = useFeatureFlags();
  if (!flags['analytics-v4']) return <AnalyticsV3 />;
  return <AnalyticsV4 />;
}
```

**Pattern 2 — Database-backed toggle (per-company):**
```sql
-- company_settings table
ALTER TABLE company_settings ADD COLUMN feature_flags jsonb DEFAULT '{}';

-- Check in hook
const { data } = useQuery({
  queryKey: ['feature-flags', companyId],
  queryFn: async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('feature_flags')
      .eq('company_id', companyId)
      .single();
    return data?.feature_flags ?? {};
  },
});
```

**Pattern 3 — Environment variable (deploy-level):**
```typescript
const isNewFeatureEnabled = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';
```

**Review check:** Does the PR add a visible new feature? Is it behind a gate?

## Migration Safety

Database migrations must be backward-compatible. The deploy sequence is:
1. Migration runs (schema changes)
2. New code deploys (may take minutes)
3. Old code is still serving during the deploy window

**Safe migration patterns:**
- ADD column with DEFAULT — old code ignores new columns
- ADD table — old code doesn't query it
- ADD index CONCURRENTLY — no table lock

**Unsafe migration patterns (require two-phase deploy):**
- DROP column — old code will break querying it
- RENAME column — old code references old name
- ALTER column type — may break existing queries
- DROP table — old code will break

**Two-phase approach for breaking changes:**
1. Phase 1: Add new column/table, deploy code that writes to both old and new
2. Phase 2: Migrate data, deploy code that reads from new only
3. Phase 3: Drop old column/table

**Review check:** Does the migration drop, rename, or alter columns? If yes, is it a two-phase deploy?

## Backward Compatibility

**API changes:**
- Adding new fields to a response: SAFE (clients ignore unknown fields)
- Removing fields from a response: BREAKING (clients may depend on them)
- Adding optional parameters to a request: SAFE
- Making a parameter required: BREAKING
- Changing a field's type: BREAKING

**Edge function changes:**
- New edge function: SAFE (nothing calls it yet)
- Changing request/response shape: BREAKING (frontend already calls it)
- Fix: version the endpoint or deploy frontend + function atomically

**Review check:** Does the PR change any edge function request/response shapes? Is the frontend
updated in the same PR?

## Rollback Planning

For every PR that touches data or external integrations, document the rollback plan.

**Rollback categories:**

| Change Type | Rollback Strategy |
|---|---|
| Frontend-only | Revert commit, Vercel auto-deploys previous |
| Edge function | Revert commit, re-deploy via `supabase functions deploy` |
| Migration (additive) | No rollback needed — new columns are ignored by old code |
| Migration (destructive) | Write a reverse migration BEFORE deploying forward |
| External API integration | Feature flag to disable, fallback to previous behavior |
| Cron job change | Disable cron in Supabase dashboard, revert code |

**Review check:** For high-risk PRs (migrations, external integrations, cron changes),
is the rollback plan documented in the PR description?

## Vercel Deploy Strategy

**Preview deploys:**
- Every PR gets a Vercel preview URL automatically
- Test the preview before requesting review
- Share preview URL in PR description for reviewers

**Production deploys:**
- Merge to `main` triggers production deploy
- Monitor Vercel dashboard for build errors after merge
- Check PostHog for error rate spikes in the first 30 minutes

**Canary approach (manual):**
Since we don't have formal canary infra, use feature flags as a canary:
1. Deploy with feature flag OFF
2. Enable for internal company first (`demo-longtale`)
3. Enable for one real customer company
4. Enable for all

**Review check:** Has the PR been tested on a Vercel preview? Is the preview URL in the PR?

## Feature Graduation

Inspired by Sentry's "after launch" process. When a feature flag is no longer needed:

1. **Confirm stability** — feature has been enabled for all companies for 2+ weeks with no issues
2. **Remove the flag check** — delete the conditional, keep only the enabled path
3. **Remove the flag definition** — clean up from context/DB/env
4. **Update demo data** — ensure demo mode reflects the graduated feature

**Review check:** Are there feature flags in the codebase that have been enabled for all
companies for 2+ weeks? Those are candidates for graduation (tech debt).
