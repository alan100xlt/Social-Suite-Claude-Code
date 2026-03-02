---
name: session-hygiene
description: Use when the user switches topics mid-conversation, asks about an unrelated feature, or a task is complete and a new one is starting. Proactively warn before context bloat causes degraded quality.
---

# Session Hygiene

## Overview

Long, multi-topic sessions degrade output quality as context fills up. Warn proactively when signals indicate context bloat risk.

## Trigger Signals — Warn When You Detect:

| Signal | Example |
|--------|---------|
| Topic switch | Finished analytics task, now asking about auth |
| Large file reads already done | types.ts (49KB), multiple full-page components |
| Session has hit compaction | Summary was injected at conversation start |
| 3+ separate tasks completed | Build → debug → new feature in one session |
| User mentions slowness or confusion | "why did this take so long" |
| About to read large files again | Re-reading files already read this session |
| **Phase transition** | Research/design done, now starting implementation |
| **Heavy agent usage** | 3+ subagent results already consumed (~6K-24K tokens of context) |
| **Plan written, implementation requested** | Design doc or implementation plan just saved — implementation should be a new session |
| **Skill chain completing** | Brainstorming → writing-plans → executing-plans should NOT all run in one session |
| **Multiple Figma/MCP fetches** | 3+ MCP tool calls with large payloads (design context, screenshots) |
| **User asks "should I start a new chat?"** | They already sense bloat — confirm and recommend fresh start |

## Hard Rules — Always Warn At These Boundaries:

1. **After a design doc is written** — the research context is no longer needed; implementation needs fresh budget
2. **After an implementation plan is written** — same: planning context consumed budget that implementation needs
3. **When brainstorming skill completes and transitions to writing-plans** — warn that writing-plans can happen here but executing-plans should be a new session
4. **After 4+ agent dispatches** — each agent result consumes 2K-8K tokens; 4+ means 8K-32K tokens of agent results alone
5. **When the user asks to implement after a long research/analysis phase** — the analysis context will compete with implementation for context budget

## The Warning (deliver inline, concise)

> **Session tip:** [specific reason]. For best results, start a fresh session. The [plan/design doc] at `docs/plans/...` has everything needed — no context from this session is required.

Keep it one short paragraph. Be specific about WHY (not generic). Name the artifact that carries context forward (plan file, design doc, CLAUDE.md update). Offer to continue but recommend against it.

## Example Warnings

**After design doc:**
> **Session tip:** The design doc is saved to `docs/plans/...`. This session consumed significant context on research and exploration that implementation won't need. Start a fresh session and reference the plan file directly.

**After heavy agent research:**
> **Session tip:** We've dispatched 6 research agents in this session (~30K tokens of results). The findings are captured in the plan. Implementation will have more room to work in a clean session.

**Phase transition (analysis → code):**
> **Session tip:** We've finished the analysis phase. Writing code in this same session means competing with all the research context for budget. Fresh session recommended — say "Implement the plan at `docs/plans/...`" to pick up where we left off.

**User asks "should I start a new chat?":**
> **Yes.** This session has [N tasks completed / N agents dispatched / heavy file reads]. The [plan/doc] is self-contained. Fresh session will give full context budget for implementation.

## When NOT to Warn

- Follow-up questions on the same task
- Small clarifications
- Fixes to something just built
- User explicitly says "keep going" or "continue here"
- Single-task sessions that haven't hit any triggers
- Reading 1-2 small files for a quick fix

## Context Cost Reference

| Action | Approx tokens consumed |
|--------|----------------------|
| Reading `types.ts` (49KB) | ~12,000 |
| Full component file (~200 lines) | ~1,500 |
| Each agent result | ~2,000–8,000 |
| Figma `get_design_context` response | ~3,000–6,000 |
| Full implementation plan (like this project's) | ~4,000 |
| This conversation after compaction | ~3,000 |
| Sonnet context limit | 200,000 |
| Opus context limit | 200,000 |

## Ideal Session Shapes

| Session Type | What fits | When to split |
|---|---|---|
| **Research** | Explore codebase, read docs, dispatch agents, produce a summary or design doc | Split before implementation |
| **Planning** | Read design doc, write implementation plan with exact code | Split before executing |
| **Implementation** | Read plan, execute tasks, commit | Split after 5-7 tasks or if debugging gets heavy |
| **Debugging** | Reproduce, investigate, fix one issue | Split if unrelated issues surface |
| **Review** | Read diffs, run tests, validate | Self-contained, rarely needs splitting |

## What to Tell Users

If they ask why sessions get slow/expensive:

1. **Start fresh sessions per task** — each session should have one goal
2. **Use `/clear`** between unrelated tasks in the same window
3. **Avoid re-reading large files** — summarize findings instead of re-reading raw
4. **Large generated files** (like `report.html`) should use build scripts, not inline generation
5. **Analysis + implementation** should be separate sessions
6. **Plans are the handoff mechanism** — a well-written plan in `docs/plans/` carries all context a new session needs
7. **Agent-heavy sessions fill up fast** — each subagent result is 2-8K tokens that persist in context

## CLAUDE.md Note

This skill is active for this project. The pattern also applies globally — consider adding similar guidance to `~/.claude/CLAUDE.md` for all projects.
