# Slack Agent Bridge — Design Document

**Date:** 2026-03-01
**Status:** Approved

---

## Problem

Claude Code and Windsurf agents run autonomously but occasionally hit decision points, permission prompts, or unresolvable errors that require human input. When working remotely, there is no way to be notified or unblock the agent without being at a desk watching the terminal.

## Goal

Enable bidirectional communication between Claude Code and Slack so that:
1. Agents notify you in #claude-code when they need approval or hit a blocker
2. You can approve, reject, or send instructions from your phone
3. Agents are notified of ticket start/complete so you have visibility into what's running

---

## Architecture (Option B — Primary)

### Components

```
Claude Code (hooks)
    │
    ▼
scripts/slack-agent/notify.js        — Sends Slack Block Kit messages with Approve/Reject buttons
scripts/slack-agent/check-approval.js — Blocks until approval-state.json is resolved (used by hooks)
scripts/slack-agent/slack-listener.js — Express server (port 3001) receives Slack interactive payloads
    │
    ▼
.claude/approval-state.json          — Shared state file between scripts and Claude Code hooks
    │
    ▼
Cloudflare Named Tunnel               — Stable public HTTPS URL → localhost:3001
    │
    ▼
Slack App (Bot Token)                 — Sends messages + receives button interactions
    │
    ▼
#claude-code channel                  — Where all notifications and approvals appear
```

### Data Flow

**Outbound (Claude → Slack):**
1. Claude Code hook fires (PreToolUse, PostToolUse, Stop)
2. Hook calls `node scripts/slack-agent/notify.js --event <type> --context "<description>"`
3. `notify.js` POSTs a Block Kit message to #claude-code via Slack Web API
4. For blocking events, also writes `approval-state.json = { status: "waiting", ... }`

**Inbound (Slack → Claude):**
1. You tap Approve/Reject button in Slack (from phone or desktop)
2. Slack POSTs interactive payload to Cloudflare Tunnel → `slack-listener.js`
3. `slack-listener.js` verifies Slack signing secret, writes `approval-state.json = { status: "approved"|"rejected", message: "..." }`
4. `check-approval.js` (running in hook) detects state change, exits 0 (approved) or 1 (rejected)
5. Claude Code proceeds or stops based on exit code

---

## Notification Types

| Event | Hook | Blocking | Message |
|---|---|---|---|
| Risky action (rm, force-push, sensitive edit) | PreToolUse | Yes | ⚠️ Approval needed: [action]. |
| Unresolvable error / test failure | PostToolUse (non-zero) | No | 🚨 Error on [ticket]: [summary] |
| Ticket started | PreToolUse (session first tool) | No | 🚀 Starting [SOC-XX]: [title] |
| Ticket completed / session end | Stop hook | No | ✅ Done [SOC-XX]. Next: [ticket or idle] |

**Timeout:** Blocking hooks wait 10 minutes. If no reply, `status = "timed_out"` and Claude stops the task (does NOT auto-approve).

---

## approval-state.json Schema

```json
{
  "status": "none|waiting|approved|rejected|timed_out",
  "event": "permission_prompt|error|ticket_start|ticket_complete",
  "context": "Human-readable description of what Claude is doing",
  "thread_ts": "Slack thread timestamp for reply threading",
  "message": "Your reply text (if any)",
  "timestamp": "2026-03-01T12:00:00Z"
}
```

---

## Environment Variables

```
SLACK_BOT_TOKEN=xoxb-...         # Bot token from Slack app
SLACK_SIGNING_SECRET=...          # Signing secret for verifying Slack payloads
SLACK_CHANNEL_ID=C...             # #claude-code channel ID
CLOUDFLARE_TUNNEL_NAME=claude-agent-bridge  # Named tunnel identifier
```

These go in `.env` (already gitignored) and are referenced by the scripts.

---

## Slack App Requirements

**Bot Token Scopes:**
- `chat:write` — post messages
- `channels:history` — read thread replies (fallback polling)
- `channels:read` — resolve channel IDs

**Interactive Components:**
- Request URL: `https://<tunnel-name>.trycloudflare.com/slack/actions`
- Enable: Interactivity & Shortcuts → on

---

## Claude Code Hook Wiring (.claude/settings.json additions)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(rm *|git push --force*)",
        "hooks": [
          { "type": "command", "command": "node scripts/slack-agent/notify.js --event permission_prompt --context \"$CLAUDE_TOOL_INPUT\"" },
          { "type": "command", "command": "node scripts/slack-agent/check-approval.js" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node scripts/slack-agent/notify-on-error.js --exit-code $CLAUDE_TOOL_EXIT_CODE --context \"$CLAUDE_TOOL_INPUT\"" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node scripts/slack-agent/notify.js --event session_complete --context \"Session ended\"" }
        ]
      }
    ]
  }
}
```

---

## Fallback: Option A (No Tunnel)

If the Cloudflare tunnel is unavailable, fall back to keyword polling:

1. `notify.js` posts message with instructions: "Reply `approve`, `reject`, or type instructions"
2. `poll-approval.js` polls the Slack thread every 5s via Slack Web API (`conversations.replies`)
3. Detects your keyword reply, writes `approval-state.json`
4. 5-10s delay vs instant button tap — acceptable fallback

To switch: set `APPROVAL_MODE=polling` in `.env`. `check-approval.js` reads this and uses polling instead of waiting for webhook.

---

## Files to Create

```
scripts/slack-agent/
  notify.js              — Send Slack notification (outbound)
  check-approval.js      — Block and wait for approval (hook-side)
  slack-listener.js      — Express server for Slack interactive payloads
  poll-approval.js       — Fallback: poll Slack thread for keyword reply
  .env.example           — Template for required env vars
docs/plans/
  2026-03-01-slack-agent-bridge-design.md   — This document
  2026-03-01-slack-agent-bridge.md          — Implementation plan
```

---

## Out of Scope

- Mobile push notifications (Slack handles this natively)
- Multi-agent coordination (single approval state, one agent at a time)
- Persisting approval history beyond the current session
- Slack app distribution (internal workspace use only)
