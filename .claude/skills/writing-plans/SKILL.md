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

**Design Reference:** [Path to mockup file, Figma URL, or "None — no visual design"]

---
```

## Design Checklist (MANDATORY when a mockup exists)

When the plan references a design mockup (HTML file, Figma URL, screenshot), you MUST extract a **Design Checklist** before writing any task. This is a Phase 0 prerequisite.

### Why This Exists

Prose descriptions of designs lose fidelity. "Build the 3-panel layout from the mockup" skips 20 details the mockup specifies. The engineer implements what sounds right, not what the mockup shows. Every skipped detail compounds into visible drift.

### How to Extract the Checklist

1. **Open the mockup file** and read every CSS class, HTML element, and JS interaction
2. **Enumerate every distinct UI element** — not "build the drawer" but every element inside it
3. **Note positioning, spacing, colors** — where is the AI panel relative to the thread? What padding do cards use? What's the selected state?
4. **Capture interactions** — hover states, toggles, conditional visibility, keyboard shortcuts

### Checklist Format

Add this section to the plan immediately after the header, before any tasks:

```markdown
## Design Checklist

**Source:** `path/to/mockup.html` (v8) | Figma URL | screenshot

### Layout
- [ ] Grid: `480px 1fr` default, `480px 1fr 340px` with drawer
- [ ] Topbar: 2 rows — title/count/sync | filters/drawer-toggle

### Conversation Cards
- [ ] Avatar: 44px, gradient background, platform icon overlay (16px, bottom-right)
- [ ] Preview: 2-line clamp, `min-height: 42px`, 13.5px font
- [ ] Chips row: category badge + sentiment chip + flag-for-reply button
- [ ] Bottom bar: 5px gradient, color-coded by sentiment
- [ ] Selected state: primary border + box-shadow ring
- [ ] 16px gap between cards

### Thread Panel
- [ ] AI panel positioned between thread and composer (not between header and thread)
- [ ] DM: outbound right-aligned, inbound left, bot dashed-violet
- [ ] Comments: Facebook-style bubbles with PAGE badge, Like/Reply actions
- [ ] Date separators: pill-style, centered

### Drawer
- [ ] Two tabs: Contact / Social Post
- [ ] Contact tab: avatar, name, platform badges, topic tags, details
- [ ] Social Post tab: embedded post preview, engagement stats

### Composer
- [ ] Public reply warning banner (yellow, comments only)
- [ ] Round send button with arrow icon
- [ ] Tool icons: attachment, emoji, AI sparkle, internal note

### Interactions
- [ ] Keyboard shortcuts shown on drawer quick-action buttons
- [ ] Flag-for-reply toggle on conversation cards
- [ ] Smart Sort toggle in topbar filter row
```

### Rules

1. **Every checkbox = one verifiable element.** Not "build the drawer" — that's a task. "Drawer has Contact tab with topic tags as violet-bordered chips" — that's a checklist item.
2. **Include measurements when the mockup specifies them.** Padding, font sizes, gap values, border radius, colors.
3. **Include conditional elements.** "Public reply warning shown only for comment conversations." "PAGE badge shown only for agent/bot messages."
4. **Include things that are NOT present.** "No flag button on cards" is wrong — if the mockup has it, list it. If you're intentionally deferring something, add `[DEFERRED: reason]` next to it.

### Visual QA Gate

Add this task as the LAST task of any phase that implements UI:

```markdown
### Task N: Visual QA Against Mockup

**This task is NOT optional. Do not skip. Do not mark the phase complete without this.**

**Step 1: Open mockup and running app side-by-side**
- Mockup: `path/to/mockup.html` (open in browser)
- App: `http://localhost:8080/app/[route]`

**Step 2: Walk through every Design Checklist item**
For each unchecked item, either:
- Check it off (matches mockup)
- Fix it (doesn't match — make the code change now)
- Mark `[DEFERRED: reason]` (intentional deviation with justification)

**Step 3: Take a screenshot of the running app**
Save to project root as `[phase-name]-visual-qa.png`

**Step 4: Document deviations**
If any items are deferred, add a `## Design Deviations` section to the plan with:
- What was deferred
- Why
- When it will be addressed

**Step 5: Commit**
`git commit -m "chore: visual QA pass for [phase name]"`
```

### When There Is No Mockup

If the plan has no design reference (backend-only, infrastructure, etc.), skip this section entirely. Add `**Design Reference:** None — no visual design` to the header.

If a mockup is created mid-plan (e.g., user provides a Figma link after Phase 0 is written), retroactively add the Design Checklist and Visual QA Gate before continuing.

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

## Session Boundaries

**Never batch design + backend in one session.** If a plan has both UI phases (Phase 0) and backend phases (Phase 1+), the plan should note:

```markdown
> **Session boundary:** Complete Phase 0 (UI) and run Visual QA before starting Phase 1 (backend) in a new session.
```

This prevents context bloat from compressing frontend fidelity. The engineer implementing the plan should ship and QA the UI, then start fresh for backend work.

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- **Design Checklist before any UI task** (when mockup exists)
- **Visual QA Gate as last task of every UI phase**
- **Session boundary between UI and backend phases**

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
