# Slack Agent Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire Claude Code hooks to Slack so that agents notify you when blocked, and you can approve/reject from your phone via Slack buttons.

**Architecture:** A Slack app (bot token) sends Block Kit messages with Approve/Reject buttons to #claude-code. A local Express server (`slack-listener.js`) receives Slack's interactive payload via a persistent Cloudflare named tunnel and writes the decision to `approval-state.json`. Claude Code hooks read this file to block or proceed. Option A (keyword polling) is available as a fallback via `APPROVAL_MODE=polling`.

**Tech Stack:** Node.js (ESM), Express 4, @slack/web-api, @slack/bolt (listener only), cloudflared CLI, dotenv

---

## Prerequisites (manual steps — do these before running any tasks)

### 1. Create the Slack App

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name: `Claude Agent Bridge`, pick your workspace
3. Under **OAuth & Permissions** → **Bot Token Scopes**, add:
   - `chat:write`
   - `channels:history`
   - `channels:read`
4. Under **Interactivity & Shortcuts** → toggle **On**
   - Leave Request URL blank for now (filled in Task 5)
5. **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-...`)
6. Under **Basic Information** → copy the **Signing Secret**
7. Invite the bot to #claude-code: `/invite @Claude Agent Bridge`

### 2. Get the #claude-code channel ID

In Slack, right-click #claude-code → **View channel details** → scroll to bottom → copy Channel ID (`C...`)

### 3. Install cloudflared

```bash
# Windows (winget)
winget install Cloudflare.cloudflared

# Verify
cloudflared --version
```

---

## Task 1: Project scaffold and dependencies

**Files:**
- Create: `scripts/slack-agent/package.json`
- Create: `scripts/slack-agent/.env.example`

**Step 1: Create the scripts/slack-agent directory**

```bash
mkdir -p scripts/slack-agent
```

**Step 2: Create package.json**

```json
{
  "name": "slack-agent-bridge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "listener": "node slack-listener.js",
    "poll": "node poll-approval.js"
  },
  "dependencies": {
    "@slack/web-api": "^7.3.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  }
}
```

**Step 3: Create .env.example**

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_CHANNEL_ID=C0123456789
CLOUDFLARE_TUNNEL_NAME=claude-agent-bridge
APPROVAL_MODE=webhook
APPROVAL_TIMEOUT_MS=600000
```

**Step 4: Install dependencies**

```bash
cd scripts/slack-agent && npm install
```

Expected: `node_modules/` created, no errors.

**Step 5: Copy .env.example to .env and fill in values**

```bash
cp scripts/slack-agent/.env.example scripts/slack-agent/.env
```

Fill in `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID` from the prerequisite steps.

**Step 6: Ensure .env is gitignored**

```bash
grep -q "scripts/slack-agent/.env" .gitignore || echo "scripts/slack-agent/.env" >> .gitignore
```

**Step 7: Commit scaffold**

```bash
git add scripts/slack-agent/package.json scripts/slack-agent/.env.example .gitignore
git commit -m "feat: scaffold slack-agent-bridge scripts directory"
```

---

## Task 2: approval-state.json and shared state helpers

**Files:**
- Create: `scripts/slack-agent/state.js`
- Create: `.claude/approval-state.json`

**Step 1: Create state.js**

```js
// scripts/slack-agent/state.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '../../.claude/approval-state.json');

export const STATUSES = {
  NONE: 'none',
  WAITING: 'waiting',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  TIMED_OUT: 'timed_out',
};

export function readState() {
  if (!existsSync(STATE_PATH)) return { status: STATUSES.NONE };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { status: STATUSES.NONE };
  }
}

export function writeState(state) {
  writeFileSync(STATE_PATH, JSON.stringify({ ...state, timestamp: new Date().toISOString() }, null, 2));
}

export function resetState() {
  writeState({ status: STATUSES.NONE });
}
```

**Step 2: Create initial approval-state.json**

```json
{
  "status": "none",
  "timestamp": "2026-03-01T00:00:00Z"
}
```

Save to `.claude/approval-state.json`.

**Step 3: Commit**

```bash
git add scripts/slack-agent/state.js .claude/approval-state.json
git commit -m "feat: add approval state file and shared state helpers"
```

---

## Task 3: notify.js — send Slack notifications

**Files:**
- Create: `scripts/slack-agent/notify.js`

**Step 1: Create notify.js**

```js
// scripts/slack-agent/notify.js
import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

// Parse CLI args: --event <type> --context "<text>"
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : '';
};

const event = getArg('--event') || 'unknown';
const context = getArg('--context') || 'No context provided';

const ICONS = {
  permission_prompt: '⚠️',
  error: '🚨',
  ticket_start: '🚀',
  ticket_complete: '✅',
  session_complete: '🏁',
  unknown: 'ℹ️',
};

const COLORS = {
  permission_prompt: '#FFA500',
  error: '#FF0000',
  ticket_start: '#36A64F',
  ticket_complete: '#36A64F',
  session_complete: '#36A64F',
  unknown: '#CCCCCC',
};

const isBlocking = event === 'permission_prompt';

async function notify() {
  const icon = ICONS[event] || 'ℹ️';
  const color = COLORS[event] || '#CCCCCC';

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${icon} *${event.replace(/_/g, ' ').toUpperCase()}*\n${context}`,
      },
    },
  ];

  if (isBlocking) {
    blocks.push({
      type: 'actions',
      block_id: 'approval_actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Approve' },
          style: 'primary',
          action_id: 'approve',
          value: 'approved',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Reject' },
          style: 'danger',
          action_id: 'reject',
          value: 'rejected',
        },
      ],
    });
  }

  const result = await slack.chat.postMessage({
    channel: CHANNEL,
    text: `${icon} ${event}: ${context}`,
    blocks,
    attachments: [{ color }],
  });

  if (isBlocking) {
    writeState({
      status: STATUSES.WAITING,
      event,
      context,
      thread_ts: result.ts,
    });
  }

  console.log(`Slack notification sent (ts=${result.ts})`);
}

notify().catch((err) => {
  console.error('notify.js error:', err.message);
  process.exit(0); // Don't block Claude on notification failure
});
```

**Step 2: Test notify.js manually**

```bash
cd scripts/slack-agent
node notify.js --event ticket_start --context "Starting SOC-99: Test notification"
```

Expected: Message appears in #claude-code. No errors in terminal.

**Step 3: Test blocking notification**

```bash
node notify.js --event permission_prompt --context "About to run: git push --force origin main"
```

Expected: Message with Approve/Reject buttons appears. `.claude/approval-state.json` updated to `{ "status": "waiting", ... }`.

**Step 4: Commit**

```bash
git add scripts/slack-agent/notify.js
git commit -m "feat: add notify.js for outbound Slack notifications"
```

---

## Task 4: check-approval.js — blocking hook helper

**Files:**
- Create: `scripts/slack-agent/check-approval.js`

**Step 1: Create check-approval.js**

```js
// scripts/slack-agent/check-approval.js
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '600000', 10);
const POLL_INTERVAL_MS = 1000;

async function waitForApproval() {
  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const state = readState();

    if (state.status === STATUSES.APPROVED) {
      console.log('Approved:', state.message || '(no message)');
      process.exit(0);
    }

    if (state.status === STATUSES.REJECTED) {
      console.error('Rejected:', state.message || '(no message)');
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error('Approval timed out after', TIMEOUT_MS / 1000 / 60, 'minutes');
  process.exit(1);
}

waitForApproval();
```

**Step 2: Test check-approval.js (approved path)**

In one terminal, run:
```bash
cd scripts/slack-agent && node check-approval.js
```

In another terminal, manually write to `.claude/approval-state.json`:
```json
{ "status": "approved", "message": "go ahead", "timestamp": "2026-03-01T00:00:00Z" }
```

Expected: First terminal prints `Approved: go ahead` and exits 0 within 1-2 seconds.

**Step 3: Test check-approval.js (rejected path)**

Same as above but write `"status": "rejected"`. Expected: exits 1.

**Step 4: Commit**

```bash
git add scripts/slack-agent/check-approval.js
git commit -m "feat: add check-approval.js for blocking hook approval gate"
```

---

## Task 5: slack-listener.js — inbound webhook receiver

**Files:**
- Create: `scripts/slack-agent/slack-listener.js`

**Step 1: Create slack-listener.js**

```js
// scripts/slack-agent/slack-listener.js
import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;

// Slack requires raw body for signature verification
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function verifySlackSignature(req) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = req.headers['x-slack-request-timestamp'];
  const slackSig = req.headers['x-slack-signature'];

  if (!timestamp || !slackSig) return false;

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const rawBody = req.body ? JSON.stringify(req.body) : '';
  const sigBase = `v0:${timestamp}:${rawBody}`;
  const hmac = createHmac('sha256', signingSecret).update(sigBase).digest('hex');
  const computedSig = `v0=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(computedSig), Buffer.from(slackSig));
  } catch {
    return false;
  }
}

app.post('/slack/actions', express.raw({ type: '*/*' }), (req, res) => {
  // Slack sends payload as URL-encoded form
  let payload;
  try {
    const body = req.body.toString();
    const params = new URLSearchParams(body);
    payload = JSON.parse(params.get('payload'));
  } catch (err) {
    console.error('Failed to parse payload:', err.message);
    return res.status(400).send('Bad Request');
  }

  const action = payload?.actions?.[0];
  if (!action) return res.status(400).send('No action');

  const status = action.value; // 'approved' or 'rejected'
  const message = payload.message?.text || '';

  writeState({
    status: status === 'approved' ? STATUSES.APPROVED : STATUSES.REJECTED,
    event: 'button_click',
    context: message,
    message: action.value,
  });

  console.log(`Action received: ${status}`);

  // Acknowledge to Slack immediately (required within 3s)
  res.json({
    response_type: 'in_channel',
    replace_original: false,
    text: status === 'approved' ? '✅ Approved — Claude is proceeding.' : '❌ Rejected — Claude has been stopped.',
  });
});

app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Slack listener running on http://localhost:${PORT}`);
  console.log(`Actions endpoint: http://localhost:${PORT}/slack/actions`);
});
```

**Step 2: Start the listener**

```bash
cd scripts/slack-agent && node slack-listener.js
```

Expected output:
```
Slack listener running on http://localhost:3001
Actions endpoint: http://localhost:3001/slack/actions
```

**Step 3: Verify health endpoint**

```bash
curl http://localhost:3001/health
```

Expected: `ok`

**Step 4: Commit**

```bash
git add scripts/slack-agent/slack-listener.js
git commit -m "feat: add slack-listener.js Express server for interactive payloads"
```

---

## Task 6: Cloudflare named tunnel setup

**Goal:** Create a persistent tunnel so the Slack app Request URL never changes.

**Step 1: Authenticate cloudflared (one-time)**

```bash
cloudflared tunnel login
```

Follow the browser prompt. This creates `~/.cloudflared/cert.pem`.

**Step 2: Create named tunnel**

```bash
cloudflared tunnel create claude-agent-bridge
```

Expected output includes a tunnel UUID. Note it — you'll see it in `~/.cloudflared/<UUID>.json`.

**Step 3: Create tunnel config file**

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: claude-agent-bridge
credentials-file: C:\Users\alana\.cloudflared\<TUNNEL-UUID>.json

ingress:
  - hostname: claude-agent-bridge.<YOUR-CF-SUBDOMAIN>.workers.dev
    service: http://localhost:3001
  - service: http_status:404
```

Replace `<TUNNEL-UUID>` with the UUID from Step 2.
Replace `<YOUR-CF-SUBDOMAIN>` — Cloudflare assigns this when you create the tunnel (shown in output).

**Step 4: Add DNS route**

```bash
cloudflared tunnel route dns claude-agent-bridge claude-agent-bridge
```

**Step 5: Test tunnel**

Start the listener in one terminal:
```bash
cd scripts/slack-agent && node slack-listener.js
```

Start the tunnel in another:
```bash
cloudflared tunnel run claude-agent-bridge
```

Test health:
```bash
curl https://claude-agent-bridge.<YOUR-CF-SUBDOMAIN>.workers.dev/health
```

Expected: `ok`

**Step 6: Add tunnel URL to Slack App**

1. Go to https://api.slack.com/apps → your app → **Interactivity & Shortcuts**
2. Set Request URL to: `https://claude-agent-bridge.<YOUR-CF-SUBDOMAIN>.workers.dev/slack/actions`
3. Click **Save Changes**

**Step 7: Create tunnel startup script**

Create `scripts/slack-agent/start-tunnel.sh`:

```bash
#!/bin/bash
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run claude-agent-bridge
```

**Step 8: Commit**

```bash
git add scripts/slack-agent/start-tunnel.sh
git commit -m "feat: add cloudflare tunnel startup script"
```

---

## Task 7: End-to-end test

**Goal:** Verify the full flow works before wiring hooks.

**Step 1: Start listener and tunnel (two terminals)**

Terminal 1:
```bash
cd scripts/slack-agent && node slack-listener.js
```

Terminal 2:
```bash
cloudflared tunnel run claude-agent-bridge
```

**Step 2: Send a blocking notification**

Terminal 3:
```bash
cd scripts/slack-agent && node notify.js --event permission_prompt --context "E2E test: About to delete 50 files"
```

Expected: Slack message with Approve/Reject buttons appears in #claude-code.

**Step 3: Start check-approval.js**

Terminal 3 (same):
```bash
node check-approval.js
```

Expected: Process hangs, waiting.

**Step 4: Tap Approve in Slack**

Tap the Approve button on phone or desktop.

Expected:
- Slack shows confirmation message "✅ Approved — Claude is proceeding."
- Terminal 3 prints `Approved: approved` and exits 0

**Step 5: Test reject path**

Repeat Steps 2-3, then tap Reject.

Expected: Terminal exits 1 with `Rejected: rejected`.

---

## Task 8: Wire Claude Code hooks

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Read current settings.json**

Read `.claude/settings.json` to get the current hook structure.

**Step 2: Add hooks**

Merge these hooks into the existing `hooks` block in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(rm *)",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/slack-agent/notify.js --event permission_prompt --context \"Risky bash command requested\""
          },
          {
            "type": "command",
            "command": "node scripts/slack-agent/check-approval.js"
          }
        ]
      },
      {
        "matcher": "Bash(git push --force*)",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/slack-agent/notify.js --event permission_prompt --context \"Force push requested\""
          },
          {
            "type": "command",
            "command": "node scripts/slack-agent/check-approval.js"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/slack-agent/notify.js --event session_complete --context \"Claude Code session ended\""
          }
        ]
      }
    ]
  }
}
```

**Step 3: Test PreToolUse hook fires**

In a Claude Code session, attempt a command that matches `rm *`. Verify:
- Slack notification appears with Approve/Reject buttons
- Claude Code waits
- Approving in Slack allows the command to proceed
- Rejecting blocks the command

**Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: wire Claude Code hooks to slack-agent-bridge"
```

---

## Task 9: Fallback — poll-approval.js (Option A)

**Files:**
- Create: `scripts/slack-agent/poll-approval.js`

**Step 1: Create poll-approval.js**

```js
// scripts/slack-agent/poll-approval.js
// Fallback for when the Cloudflare tunnel is not running.
// Set APPROVAL_MODE=polling in .env to use this.
import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readState, writeState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '600000', 10);

async function pollForReply() {
  const state = readState();
  if (!state.thread_ts) {
    console.error('No thread_ts in state — cannot poll');
    process.exit(1);
  }

  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const result = await slack.conversations.replies({
      channel: process.env.SLACK_CHANNEL_ID,
      ts: state.thread_ts,
    });

    const replies = result.messages?.slice(1) ?? []; // skip parent message
    const reply = replies.find((m) => !m.bot_id); // first non-bot reply

    if (reply) {
      const text = reply.text.toLowerCase().trim();
      const status = text.startsWith('approve') ? STATUSES.APPROVED
        : text.startsWith('reject') ? STATUSES.REJECTED
        : null;

      if (status) {
        writeState({ ...state, status, message: reply.text });
        console.log(`Poll detected reply: ${status}`);
        process.exit(status === STATUSES.APPROVED ? 0 : 1);
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error('Polling timed out');
  process.exit(1);
}

pollForReply().catch((err) => {
  console.error('poll-approval.js error:', err.message);
  process.exit(1);
});
```

**Step 2: Update check-approval.js to support APPROVAL_MODE**

Add at the top of `check-approval.js`, before the `waitForApproval` function:

```js
// If polling mode, delegate to poll-approval.js
if (process.env.APPROVAL_MODE === 'polling') {
  const { execSync } = await import('child_process');
  execSync('node poll-approval.js', { stdio: 'inherit', cwd: __dirname });
  process.exit(0);
}
```

**Step 3: Commit**

```bash
git add scripts/slack-agent/poll-approval.js scripts/slack-agent/check-approval.js
git commit -m "feat: add poll-approval.js fallback for Option A mode"
```

---

## Task 10: Startup automation (optional quality of life)

**Files:**
- Create: `scripts/slack-agent/README.md`

**Step 1: Create README with startup instructions**

````md
# Slack Agent Bridge

Bidirectional Slack ↔ Claude Code integration.

## Quick Start

1. Fill in `scripts/slack-agent/.env` (copy from `.env.example`)
2. Start the listener: `node scripts/slack-agent/slack-listener.js`
3. Start the tunnel: `cloudflared tunnel run claude-agent-bridge`
4. Claude Code hooks will now notify #claude-code and wait for your approval

## Fallback Mode (no tunnel)

Set `APPROVAL_MODE=polling` in `.env`. Reply `approve` or `reject` in the Slack thread.

## Notification Types

| Type | Blocking | Trigger |
|---|---|---|
| permission_prompt | Yes | rm, force-push, sensitive edits |
| error | No | Non-zero exit codes |
| ticket_start | No | First tool use of session |
| session_complete | No | Claude Code Stop hook |
````

**Step 2: Commit**

```bash
git add scripts/slack-agent/README.md
git commit -m "docs: add slack-agent-bridge README"
```

---

## Verification Checklist

Before calling this complete, verify:

- [ ] Slack message appears in #claude-code when `notify.js` runs
- [ ] Approve/Reject buttons visible in Slack message
- [ ] Tapping Approve in Slack → `check-approval.js` exits 0
- [ ] Tapping Reject in Slack → `check-approval.js` exits 1
- [ ] Claude Code `PreToolUse` hook blocks on risky commands until approval
- [ ] `Stop` hook sends session complete notification
- [ ] Fallback polling works when `APPROVAL_MODE=polling`
- [ ] Tunnel URL is stable across restarts (named tunnel)
- [ ] `.env` is not committed to git
