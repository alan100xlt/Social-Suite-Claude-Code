# Slack Agent Bridge

Bidirectional Slack ↔ Claude Code integration. Notifies you in #claude-code when agents need approval or hit blockers, and lets you respond from your phone.

## First-time Setup

### 1. Fill in credentials

Copy `env.example` to `.env` and fill in the values:

```bash
cp env.example .env
```

Required values:
- `SLACK_BOT_TOKEN` — from your Slack app's OAuth & Permissions page (`xoxb-...`)
- `SLACK_SIGNING_SECRET` — from your Slack app's Basic Information page
- `SLACK_CHANNEL_ID` — right-click #claude-code in Slack → View channel details → Channel ID (`C...`)

### 2. Set up ngrok (one-time)

```bash
# Install ngrok
winget install ngrok.ngrok
# Or download from https://ngrok.com/download

# Add your authtoken (from https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken YOUR_TOKEN

# Claim a free static domain at https://dashboard.ngrok.com/domains
# e.g. sherika-halterlike-savanna.ngrok-free.dev
```

### 3. Add Request URL to Slack App

1. Go to https://api.slack.com/apps → your app → Interactivity & Shortcuts
2. Set Request URL to: `https://<your-ngrok-domain>/slack/actions`
3. Save Changes

### 4. Invite the bot to #claude-code

In Slack, type: `/invite @Claude Agent Bridge`

---

## Daily Use

Start the bridge before autonomous Claude sessions:

```bash
bash scripts/slack-agent/start-listener.sh
```

This starts both the Express listener and the ngrok tunnel. Keep it running in a terminal.

---

## Notification Types

| Type | Blocking | When |
|---|---|---|
| ⚠️ permission_prompt | Yes — waits for your tap | Risky commands (rm, force-push) |
| 🚨 error | No | Non-zero exit / unresolvable failure |
| 🚀 ticket_start | No | First tool use of a session |
| 🏁 session_complete | No | Claude Code Stop hook |

**Blocking notifications** show Approve/Reject buttons. Tap from your phone to unblock Claude.

---

## Fallback Mode (no tunnel)

If the ngrok tunnel isn't running, switch to keyword polling:

1. Set `APPROVAL_MODE=polling` in `.env`
2. When Claude sends an approval request, reply in the Slack thread with:
   - `approve` — Claude continues
   - `reject` — Claude stops
3. 5-10 second polling delay vs instant button tap

---

## Architecture

```
Claude Code hook fires
    → notify.js (posts Block Kit message to #claude-code)
    → approval-state.json = { status: "waiting" }
    → check-approval.js (polls state file every 1s)

You tap Approve in Slack
    → Slack POSTs to ngrok tunnel
    → slack-listener.js writes approval-state.json = { status: "approved" }
    → check-approval.js detects change, exits 0
    → Claude Code proceeds
```
