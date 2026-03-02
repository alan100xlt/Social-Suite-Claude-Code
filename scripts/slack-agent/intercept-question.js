// scripts/slack-agent/intercept-question.js
// PreToolUse hook for AskUserQuestion — posts question to Slack
// and exits 0 immediately (non-blocking) so the IDE prompt also shows.
// User can answer in either Slack or IDE — whichever is first wins.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeState, STATUSES } from './state.js';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();

const permissionMode = input.permission_mode || 'default';
const sessionId = input.session_id || null;

// Skip if permissions are bypassed — user is at their computer
if (permissionMode === 'bypassPermissions' || permissionMode === 'dontAsk' || permissionMode === 'acceptEdits') {
  process.exit(0);
}

const toolInput = input.tool_input || {};

// Extract question text from AskUserQuestion input
const questions = toolInput.questions || [];
const questionText = questions
  .map((q) => {
    const opts = (q.options || []).map((o) => `  • ${o.label}${o.description ? ` — ${o.description}` : ''}`).join('\n');
    return `${q.question}${opts ? '\n' + opts : ''}`;
  })
  .join('\n\n');

if (!questionText) {
  process.exit(0);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

try {
  const result = await slack.chat.postMessage({
    channel: CHANNEL,
    text: `💬 Claude has a question:\n${questionText}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 *QUESTION FROM CLAUDE*${sessionId ? ` _(session ${sessionId.slice(0, 8)})_` : ''}\n\n${questionText}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Also showing in IDE — answer in either place._',
          },
        ],
      },
    ],
    attachments: [{ color: '#1E90FF' }],
    metadata: sessionId ? { event_type: 'question', event_payload: { session_id: sessionId } } : undefined,
  });

  writeState(sessionId, {
    status: STATUSES.WAITING_REPLY,
    event: 'ask',
    context: questionText,
    thread_ts: result.ts,
  });

  console.log(`Question posted to Slack (ts=${result.ts})`);
} catch (err) {
  console.error('intercept-question error:', err.message);
}

// Exit 0 immediately — do NOT block. Let the IDE prompt show too.
process.exit(0);
