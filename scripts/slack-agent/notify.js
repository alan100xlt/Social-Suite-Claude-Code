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
const USER_ID = process.env.SLACK_USER_ID;
const mention = USER_ID ? `<@${USER_ID}> ` : '';

// Parse CLI args: --event <type> --context "<text>" --session <id> --headline "<short text>"
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : '';
};

const event = getArg('--event') || 'unknown';
const context = getArg('--context') || 'No context provided';
const headline = getArg('--headline') || '';
const sessionId = getArg('--session') || null;

const ICONS = {
  permission_prompt: '\u26a0\ufe0f',
  error: '\ud83d\udea8',
  ticket_start: '\ud83d\ude80',
  ticket_complete: '\u2705',
  session_complete: '\ud83c\udfc1',
  ask: '\ud83d\udcac',
  summary: '\ud83d\udccb',
  unknown: '\u2139\ufe0f',
};

const COLORS = {
  permission_prompt: '#FFA500',
  error: '#FF0000',
  ticket_start: '#36A64F',
  ticket_complete: '#36A64F',
  session_complete: '#36A64F',
  ask: '#1E90FF',
  summary: '#4A90D9',
  unknown: '#CCCCCC',
};

// Events that @mention the user (action required)
const MENTION_EVENTS = ['ask', 'summary', 'permission_prompt', 'error'];
// Events where full details go in a thread reply, not the top-level message
const THREAD_DETAIL_EVENTS = ['summary', 'ticket_complete', 'session_complete'];

const isBlocking = event === 'permission_prompt';
const isAsk = event === 'ask';
const isSummary = event === 'summary';
const shouldMention = MENTION_EVENTS.includes(event);
const useThreadDetails = THREAD_DETAIL_EVENTS.includes(event);

async function notify() {
  const icon = ICONS[event] || '\u2139\ufe0f';
  const color = COLORS[event] || '#CCCCCC';
  const mentionPrefix = shouldMention ? mention : '';

  // For update events: short top-level message, details in thread
  if (useThreadDetails) {
    const shortText = headline || `${icon} ${event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} completed.`;

    const topBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${mentionPrefix}${shortText}`,
        },
      },
    ];

    if (isSummary) {
      topBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Reply in this thread with questions or follow-ups._',
          },
        ],
      });
    }

    const result = await slack.chat.postMessage({
      channel: CHANNEL,
      text: `${mentionPrefix}${shortText}`,
      blocks: topBlocks,
      attachments: [{ color }],
    });

    // Post full details as a thread reply
    await slack.chat.postMessage({
      channel: CHANNEL,
      thread_ts: result.ts,
      text: context,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: context },
        },
      ],
    });

    if (isSummary) {
      writeState(sessionId, {
        status: STATUSES.WAITING_REPLY,
        event: 'summary',
        context,
        thread_ts: result.ts,
      });
    }

    console.log(`Slack notification sent (ts=${result.ts})`);
    return;
  }

  // For blocking/ask events: full message at top level (needs immediate visibility)
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${mentionPrefix}${icon} *${event.replace(/_/g, ' ').toUpperCase()}*${sessionId ? ` _(session ${sessionId.slice(0, 8)})_` : ''}\n${context}`,
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
          text: { type: 'plain_text', text: '\u2705 Approve' },
          style: 'primary',
          action_id: 'approve',
          value: 'approved',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '\u274c Reject' },
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
    text: `${mentionPrefix}${icon} ${event}: ${context}`,
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
