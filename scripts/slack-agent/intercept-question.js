// scripts/slack-agent/intercept-question.js
// PreToolUse hook for AskUserQuestion — posts each question to Slack
// with interactive buttons for each option. Multi-question flows are
// posted one at a time. Both IDE and Slack show the question; first wins.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeState, STATUSES } from './state.js';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();

const sessionId = input.session_id || null;

const toolInput = input.tool_input || {};
const questions = toolInput.questions || [];

if (questions.length === 0) {
  process.exit(0);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;
const USER_ID = process.env.SLACK_USER_ID;
const mention = USER_ID ? `<@${USER_ID}> ` : '';

// Build the questions array for state
const questionsState = questions.map((q) => ({
  question: q.question || '',
  header: q.header || '',
  options: (q.options || []).map((o) => ({
    label: o.label,
    description: o.description || '',
  })),
  multiSelect: q.multiSelect || false,
  answer: null,
}));

// Post the first question with buttons
try {
  const firstQ = questionsState[0];
  const blocks = buildQuestionBlocks(firstQ, 0, questionsState.length);

  const result = await slack.chat.postMessage({
    channel: CHANNEL,
    text: `${mention}Claude has a question: ${firstQ.question}`,
    blocks,
    attachments: [{ color: '#1E90FF' }],
  });

  writeState(sessionId, {
    status: STATUSES.WAITING_REPLY,
    event: 'ask_multi',
    questions: questionsState,
    current_question_index: 0,
    thread_ts: result.ts,
    message_ts_list: [result.ts],
  });

  console.log(`Question 1/${questionsState.length} posted to Slack (ts=${result.ts})`);
} catch (err) {
  console.error('intercept-question error:', err.message);
}

// Exit 0 immediately — do NOT block. Let the IDE prompt show too.
process.exit(0);

// --- Helpers ---

function buildQuestionBlocks(q, index, total) {
  const countLabel = total > 1 ? ` (${index + 1}/${total})` : '';
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${mention}💬 *QUESTION FROM CLAUDE*${countLabel}\n\n*${q.question}*`,
      },
    },
  ];

  // Add option descriptions as context if any have descriptions
  const hasDescriptions = q.options.some((o) => o.description);
  if (hasDescriptions) {
    const descText = q.options
      .map((o) => `• *${o.label}* — ${o.description || '_no description_'}`)
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: descText },
    });
  }

  // Buttons for each option (Slack max 5 buttons per actions block)
  const buttons = q.options.map((o, i) => ({
    type: 'button',
    text: { type: 'plain_text', text: truncate(o.label, 75), emoji: true },
    action_id: `question_option_${i}`,
    value: JSON.stringify({ option_index: i, label: o.label }),
  }));

  // Add "Other..." button for free-text reply
  buttons.push({
    type: 'button',
    text: { type: 'plain_text', text: '✏️ Other...', emoji: true },
    action_id: 'question_option_other',
    value: JSON.stringify({ option_index: -1, label: '__other__' }),
  });

  // Slack allows max 5 elements per actions block, so chunk them
  for (let i = 0; i < buttons.length; i += 5) {
    blocks.push({
      type: 'actions',
      block_id: `question_actions_${index}_${i}`,
      elements: buttons.slice(i, i + 5),
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '_Also showing in IDE — answer in either place._',
      },
    ],
  });

  return blocks;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
