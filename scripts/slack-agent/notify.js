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

// Parse CLI args: --event <type> --context "<text>" --session <id>
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : '';
};

const event = getArg('--event') || 'unknown';
const context = getArg('--context') || 'No context provided';
const sessionId = getArg('--session') || null;

const ICONS = {
  permission_prompt: '⚠️',
  error: '🚨',
  ticket_start: '🚀',
  ticket_complete: '✅',
  session_complete: '🏁',
  ask: '💬',
  unknown: 'ℹ️',
};

const COLORS = {
  permission_prompt: '#FFA500',
  error: '#FF0000',
  ticket_start: '#36A64F',
  ticket_complete: '#36A64F',
  session_complete: '#36A64F',
  ask: '#1E90FF',
  unknown: '#CCCCCC',
};

const isBlocking = event === 'permission_prompt';
const isAsk = event === 'ask';

async function notify() {
  const icon = ICONS[event] || 'ℹ️';
  const color = COLORS[event] || '#CCCCCC';

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${icon} *${event.replace(/_/g, ' ').toUpperCase()}*${sessionId ? ` _(session ${sessionId.slice(0, 8)})_` : ''}\n${context}`,
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

  if (isAsk) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_Reply in this thread to answer. Claude is waiting for your response._',
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
    writeState(sessionId, {
      status: STATUSES.WAITING,
      event,
      context,
      thread_ts: result.ts,
    });
  }

  if (isAsk) {
    writeState(sessionId, {
      status: STATUSES.WAITING_REPLY,
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
