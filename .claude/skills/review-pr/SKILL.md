---
name: review-pr
description: Review a pull request — summarize changes, run security review, check for known issues, and post findings to Slack
tools: Read, Grep, Glob, Bash, Agent
user-invocable: true
---

Review pull request: $ARGUMENTS

## Resolve PR

If `$ARGUMENTS` is a PR number (e.g. `123`), use that directly.
If `$ARGUMENTS` is a URL, extract the PR number from it.
If `$ARGUMENTS` is empty, use the current branch's open PR (`gh pr view --json number -q .number`).

## Steps

1. **Fetch PR metadata**
   ```bash
   gh pr view <number> --json title,body,baseRefName,headRefName,files,additions,deletions,changedFiles
   ```

2. **Get the full diff**
   ```bash
   gh pr diff <number>
   ```

3. **Summarize changes** — group by area:
   - UI / components
   - Data fetching / hooks
   - Supabase / migrations / RLS
   - Config / build / deps
   - Other

4. **Run security-reviewer agent** on all changed files using the `security-reviewer` subagent.

5. **Check project-specific issues** (from CLAUDE.md known issues):
   - `process.env` usage (must be `import.meta.env.VITE_*`)
   - Server-only imports (`ioredis`, `child_process`, `fs`) in `src/`
   - CSS `@import` order in `index.css`
   - Missing `company_id` filters in Supabase queries
   - Missing `enabled: !!companyId` guard in TanStack Query hooks

6. **Check code quality**:
   - Run `npm run lint` if not already passing
   - Run `npx tsc --noEmit` for type errors

7. **Post findings to Slack**
   ```bash
   node scripts/slack-agent/notify.js --event ask --context "<formatted review summary>"
   ```

## Output Format

```
## PR Review: #<number> — <title>

### Summary
<2-3 sentences: what this PR does and why>

### Changed Files (<count>)
| Area | Files | +/- |
|------|-------|-----|
| ... | ... | ... |

### Security Review
<Output from security-reviewer agent, or "No issues found">

### Project-Specific Checks
- [ ] No `process.env` usage
- [ ] No server-only imports in client code
- [ ] CSS import order correct
- [ ] Supabase queries have company_id filters
- [x] or [!] for each check with details if failing

### Code Quality
- ESLint: Pass/Fail (details if fail)
- TypeScript: Pass/Fail (details if fail)

### Recommendation
APPROVE / REQUEST CHANGES / COMMENT
<Brief justification>
```
