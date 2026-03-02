---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

Each task follows this format:

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file`
- Modify: `exact/path/to/existing.file:line-range`

**Step 1: [Action]**
[Complete code or command — never "add validation", always show the actual code]

**Step 2: Verify**
Run: `command`
Expected: output

**Step 3: Commit**
`git commit -m "feat: description"`
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

---

## Execution Handoff (run immediately after saving plan — do not wait to be asked)

### Step 1: Create Linear issues
Run `/linear-sync` with the task list from the plan you just wrote.
This is mandatory. Do not skip. Do not wait for the user to ask.

### Step 2: Choose execution mode and explain the recommendation

**Use Parallel Session (default)** when:
- Plan has 4+ tasks
- Tasks are mostly independent (each doesn't require previous task's output to proceed)
- Any task involves deploys, builds, or long-running commands
- This session already has significant brainstorming/planning context loaded

**Use Subagent-Driven (this session)** when:
- Plan has 1-3 tasks
- Each task's output directly shapes the next task's approach (e.g., debugging: see error → fix → verify)
- Tasks are tightly coupled and sequential

Tell the user which you recommend and why in one sentence.

### Step 3: Output the execution prompt block

Always output this exact block:

---
**Ready to execute.**

Linear issues created: [list SOC-XX identifiers]

**Recommended: [Parallel Session / Subagent-Driven]** — [one sentence reason]

**Parallel Session** — open a fresh Claude Code terminal in this project directory and run:
```
Use superpowers:executing-plans to implement docs/plans/[filename].md
```

**Subagent-Driven** — say "run subagent-driven" and I'll dispatch tasks one by one here.
---
