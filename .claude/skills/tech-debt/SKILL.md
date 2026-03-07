name: tech-debt
description: Scan the codebase for known tech debt patterns and output a prioritized report. Use when planning optimization work, before sprints, or when the user asks about code health.

---

# Tech Debt Scanner Skill

Scan the Social Suite codebase for known debt patterns. Output a prioritized report with effort estimates and business impact.

## Scan Categories

### 1. Bundle Size

Grep for heavy imports that could be tree-shaken:
```bash
# Full lodash (should use lodash-es or individual imports)
grep -r "from 'lodash'" src/ --include="*.ts" --include="*.tsx"

# Full moment (should use date-fns or dayjs)
grep -r "from 'moment'" src/ --include="*.ts" --include="*.tsx"

# Full icon library imports
grep -rn "from 'lucide-react'" src/ --include="*.tsx" | grep -v "import {"

# Non-selective nivo imports
grep -r "from '@nivo/" src/ --include="*.tsx"
```

Check `src/App.tsx` for eager imports that should be `React.lazy()`:
- Admin routes → lazy load (low traffic)
- Analytics routes → already lazy (verify)
- Settings routes → lazy load candidate

### 2. Dead Code

```bash
# Unused exports
# Check for files that export but are never imported
grep -rn "export " src/ --include="*.ts" --include="*.tsx" -l

# TODO/FIXME/HACK comments
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND" src/ --include="*.ts" --include="*.tsx"

# Commented-out code blocks (3+ consecutive commented lines)
# Manual inspection needed
```

### 3. Query Key Consistency

Compare TanStack Query keys in hooks vs DemoDataProvider:
```bash
# Extract query keys from hooks
grep -rn "queryKey:" src/hooks/ --include="*.ts"

# Extract setQueryData keys from demo provider
grep -rn "setQueryData" src/lib/demo/DemoDataProvider.tsx
```

Flag mismatches: keys in hooks but not in demo provider (demo will show stale/missing data).

### 4. Type Safety

```bash
# 'any' type usage
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".d.ts"

# @ts-ignore / @ts-expect-error
grep -rn "@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx"

# Non-null assertions (!)
grep -rn "!\." src/ --include="*.ts" --include="*.tsx" | head -20
```

### 5. Security Debt

```bash
# process.env (should be import.meta.env)
grep -rn "process\.env" src/ --include="*.ts" --include="*.tsx"

# Hardcoded URLs or tokens
grep -rn "http://\|https://.*api\|Bearer " src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Missing company_id in Supabase queries
# Check hooks for .from() calls without .eq('company_id', ...)
```

### 6. Performance Debt

```bash
# Missing useMemo/useCallback on expensive operations
# Look for inline object/array creation in JSX props
grep -rn "className={cn(" src/ --include="*.tsx" | head -10

# Unnecessary re-renders: context providers without memoization
grep -rn "createContext" src/contexts/ --include="*.tsx"

# Missing error boundaries
grep -rn "ErrorBoundary" src/ --include="*.tsx"
```

## Output Format

```markdown
# Tech Debt Report — [Date]

## Summary
- Total findings: X
- Critical: X | High: X | Medium: X | Low: X
- Estimated total effort: X hours

## Priority Matrix

| # | Finding | Category | Severity | Effort | Impact |
|---|---------|----------|----------|--------|--------|
| 1 | Description | Bundle/Dead/Types/Security/Perf | C/H/M/L | S/M/L | S/M/L |

## Top 5 Recommendations

1. **[Finding]** — Why it matters + specific fix + effort estimate
2. ...

## Deferred (Low Priority)
Items that are real debt but not worth fixing now.
```

## Prioritization Rules

- **Fix NOW**: Security debt (any severity), missing company_id filters
- **Fix this sprint**: Bundle size > 100KB impact, dead code confusing developers
- **Fix when touching**: Type safety issues in files being modified anyway
- **Track only**: Cosmetic issues, minor naming inconsistencies
