---
name: linear-sync
description: Create Linear issues from code TODOs, bugs found during review, or a list of tasks
tools: Read, Grep, Bash
user-invocable: true
---

Sync tasks to Linear: $ARGUMENTS

If no arguments given, scan the codebase for:
- `// TODO:` comments
- `// FIXME:` comments
- `// HACK:` comments
- Known issues from CLAUDE.md

For each item:
1. Determine priority: P0 (bug/crash) → Urgent, P1 (feature gap) → High, P2 (improvement) → Medium, P3 (polish) → Low
2. Write a clear title and description
3. Add appropriate labels (bug, feature, tech-debt, performance)
4. Create the Linear issue using the Linear MCP tool
5. Report back a summary of what was created

If arguments are provided, treat them as a list of tasks to create directly.

Team context: This is the Social Suite / Longtale.ai project.
