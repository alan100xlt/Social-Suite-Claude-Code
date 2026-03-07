# Code Review Philosophy

Directly adapted from Sentry's code review guidelines at develop.sentry.dev/code-review.
Contextualized for the Social Suite codebase.

## Table of Contents
- What Code Reviews Are For
- What Code Reviews Are NOT For
- Guidelines for Submitters
- Guidelines for Reviewers
- Social Suite-Specific Review Items

## What Code Reviews Are For

### Identifying Problematic Code

Above all, a review should try to identify potential bugs that could cause the
application to break now or in the future:

- Uncaught runtime exceptions (e.g. accessing `.length` on possibly undefined data)
- Obvious performance bottlenecks (e.g. O(n^2) where n is unbounded)
- Code that alters behavior elsewhere in an unanticipated way
- API changes that are not backward compatible
- Complex Supabase queries that may have unexpected performance
- Security vulnerabilities (XSS, missing RLS, exposed secrets)
- Missing or incorrect permission checks

### Improving Design

Consider if the interactions of the various pieces make sense together:

- Could any methods be promoted to shared hooks in `src/hooks/`?
- Are components receiving individual props when they should receive an object?
- Is there unnecessary coupling between components that should be independent?
- Does the abstraction level match the responsibility (page vs. component vs. hook)?

### Tests Included

Look for tests. There should be functional, integration, or E2E tests covering
the changes. If not, ask for them.

When reviewing tests:
- Do they cover the requirements, not just the implementation?
- Do they test error paths and permissions?
- Do they avoid branching and looping in test code?
- Are they using RTL best practices (getByRole, userEvent)?

### Assessing Long-Term Impact

If the PR makes significant architectural, schema, or build changes, escalate:

- Large refactors
- Database schema changes (new tables, column changes)
- API changes (edge function request/response shapes)
- Adopting new frameworks, libraries, or tools
- New behavior that may permanently alter performance

### Double-Checking Expected Behavior

Make a genuine attempt to verify that the PR achieves its stated goals.
This requires the submitter to write a good description of expected behavior and why.

### Reducing Code Complexity

Research shows LOC correlates with higher bug count. If you see an opportunity to
significantly reduce code volume, suggest it:

```tsx
// Before: manual loop
let found = undefined;
for (let i = 0; i < items.length; i++) {
  if (items[i].status === 'active') { found = items[i]; break; }
}

// After: one line
const found = items.find(item => item.status === 'active');
```

Be pragmatic — don't rewrite for the sake of minimalism. Readability beats cleverness.

## What Code Reviews Are NOT For

### Passing Responsibility to the Reviewer

It is NOT the reviewer's responsibility that your code is correct or bug-free.
Reviewers help, but the author owns correctness.

### Showing Off Programming Knowledge

Stick to objective improvements. Assume the submitter has done their homework.
No flex zones.

### Introducing Architecture Changes for the First Time

Code reviews are not the place to introduce large architectural changes.
Write a proposal first, discuss with the team, then implement.

### Getting It Perfect

Every change request delays the PR by ~24 hours. Ship in stages. Commit to
improving later. If something never needs coming back to, the changes probably
weren't necessary.

> Perfect is the enemy of the good.

Be pragmatic. Consider the cost of each incremental request for changes.

## Guidelines for Submitters

### Organize Work for Review

- Limit PRs to a single feature or behavior change
- This makes review faster and reduces risk

### Write a Good Description

- Explain WHAT the PR does in a few sentences
- Explain WHY we're making these changes
- Explain why alternative approaches were not chosen
- This prevents reviewers from going down rabbit holes you've already explored

### Be Your Own First Reviewer

- Walk through the code yourself on GitHub before assigning reviewers
- You'll often catch mistakes you missed while writing
- Leave comments on tricky parts to help reviewers

### Annotate Specific Lines

- Give context to lines that could use elaboration
- "This is intentionally N+1 because the max count is 3 and a join would be more complex"

### Keep Reviewer Count Small

- Assign 1-3 reviewers maximum
- If work spans multiple areas, consider splitting the PR

### Avoid Unnecessary Rebasing

- After a rebase, previous review comments become orphaned
- Rewriting history makes it harder for reviewers to see incremental changes

## Guidelines for Reviewers

### Be Polite and Empathetic

Avoid accusatory comments. "You should have done X" becomes
"What if we tried X here? I think it might be clearer because..."

### Provide Actionable Feedback

Instead of "This is bad," try:
"I feel this could be clearer. What if you renamed `data` to `accountMetrics`?"

### Distinguish Blockers from Nits

If the only requested changes are minor nits, approve the PR with comments.
Don't block the author in another async review cycle for cosmetic issues.

Mark nits explicitly: `nit: prefer const here` vs blocking feedback.

### Respond Promptly

Sentry considers code review a high-priority activity. Aim to respond within
a few hours during the workday. A blocked PR is wasted work.

## Social Suite-Specific Review Items

Beyond Sentry's general principles, always check these project-specific items:

1. **`import.meta.env`** — never `process.env`
2. **`company_id` in queries** — every Supabase query must filter by company for RLS
3. **`enabled: !!companyId`** — TanStack queries depending on company must guard
4. **No `ioredis` in client code** — server-only module in `src/services/security/`
5. **CSS `@import` order** — Google Fonts before `@tailwind` directives in `index.css`
6. **Analytics date columns** — NEVER filter `post_analytics_snapshots` by `snapshot_date`, use `published_at`
7. **Demo data** — new features must update `demo-data.ts` and `DemoDataProvider.tsx`
8. **Shadcn components** — `src/components/ui/` should not be modified directly
9. **AG Grid for tables** — use AG Grid Community, not Shadcn `<Table>` (except tiny static displays)
