// scripts/slack-agent/resolve-question.js
// PostToolUse hook for AskUserQuestion — when the user answers in the IDE,
// update the Slack message to show it's been resolved and reset state.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readState, writeState, STATUSES } from './state.js';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();
const sessionId = input.session_id || null;

const state = readState(sessionId);

// Only act if there's a pending question in Slack for this session
if (state.status !== STATUSES.WAITING_REPLY || !state.thread_ts) {
  process.exit(0);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

// Extract what the user answered in the IDE
const toolResult = input.tool_result || {};
const answers = toolResult.answers || {};
const firstAnswer = Object.values(answers)[0] || '(answered in IDE)';

try {
  // Update the original Slack message to show it's resolved
  await slack.chat.update({
    channel: CHANNEL,
    ts: state.thread_ts,
    text: `✅ Question resolved in IDE`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 *QUESTION FROM CLAUDE*\n\n${state.context || '(question)'}`,
        },
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `✅ *Answered in IDE* — ${firstAnswer}`,
          },
        ],
      },
    ],
    attachments: [{ color: '#36A64F' }],
  });

  await slack.reactions.add({
    channel: CHANNEL,
    name: 'white_check_mark',
    timestamp: state.thread_ts,
  }).catch(() => {});
} catch {
  // Fallback: just add emoji
  try {
    await slack.reactions.add({ channel: CHANNEL, name: 'white_check_mark', timestamp: state.thread_ts });
    await slack.reactions.add({ channel: CHANNEL, name: 'desktop_computer', timestamp: state.thread_ts });
  } catch {}
}

writeState(sessionId, { status: STATUSES.NONE });
process.exit(0);
