---
name: linear-sync
description: Create Linear issues from code TODOs, bugs found during review, or a list of tasks
tools: Read, Grep, Bash
user-invocable: true
---

Sync tasks to Linear: $ARGUMENTS

## Context
- Team: Social Suite (`SOC`) — ID: `77c0f6ee-76ac-4864-9287-50ef360fc1eb`
- Project: Social Suite — ID: `735d7b90-d394-4687-9dc3-6ec3e6e8e733`
- Default status: Backlog

## Mode A — No arguments: scan codebase
Scan for `// TODO:`, `// FIXME:`, `// HACK:` comments and known issues from CLAUDE.md.
Create one issue per item using the metadata rules below.

## Mode B — Task list from plan
When given a list of tasks (from a writing-plans implementation plan):
1. Create one **parent issue** for the overall feature
2. Create one **child issue** per task using `parentId`
3. Link back to the plan file in each description

## Metadata Rules

### Priority
| Task type | Priority value |
|-----------|---------------|
| Bug / crash / security | 1 (Urgent) |
| New feature / new page | 2 (High) |
| Enhancement / improvement | 3 (Medium) |
| Polish / refactor / docs | 4 (Low) |

### Estimate (story points)
| Task type | Points |
|-----------|--------|
| Config / provision only | 1 |
| Single file change | 1 |
| New component / small feature | 2 |
| New edge function | 2 |
| New page | 3 |
| Full feature (page + backend) | 5 |

### Labels
- Bug → `Bug`
- New feature / page → `Feature`
- Improvement / refactor → `Improvement`

## Issue Description Format

### Parent issue
```
## Summary
[2-3 sentences: what this builds and why]

## Tasks
[List child issue identifiers once created]

## Plan
[Path to docs/plans/YYYY-MM-DD-feature.md]
```

### Child issues (one per plan task)
```
## What
[One sentence: what this task builds or changes]

## Why
[One sentence: why it's needed]

## Files
- Create: `path/to/file`
- Modify: `path/to/file`

## Done When
- [ ] [Acceptance criterion 1]
- [ ] [Acceptance criterion 2]

## Plan Reference
Task N of [Plan title] — `docs/plans/YYYY-MM-DD-feature.md`
```

## Required fields for every mcp__plugin_linear_linear__save_issue call
```
team: "77c0f6ee-76ac-4864-9287-50ef360fc1eb"
project: "735d7b90-d394-4687-9dc3-6ec3e6e8e733"
status: "Backlog"
priority: [1-4 per rules above]
estimate: [1-5 per rules above]
labels: [per rules above]
parentId: [parent issue ID for child tasks — omit on parent issue itself]
```

## Output
After creating all issues, print a summary table:
| Issue | Title | Priority | Estimate | Linear URL |
