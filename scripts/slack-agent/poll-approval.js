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
