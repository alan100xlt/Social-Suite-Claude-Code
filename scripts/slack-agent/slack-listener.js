// scripts/slack-agent/slack-listener.js
import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WebClient } from '@slack/web-api';
import { readAllStates, writeState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;
const USER_ID = process.env.SLACK_USER_ID;
const mention = USER_ID ? `<@${USER_ID}> ` : '';

function verifySlackSignature(signingSecret, timestamp, slackSig, rawBody) {
  if (!timestamp || !slackSig) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${rawBody}`;
  const hmac = createHmac('sha256', signingSecret).update(sigBase).digest('hex');
  const computedSig = `v0=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(computedSig), Buffer.from(slackSig));
  } catch {
    return false;
  }
}

// Handle button clicks from Slack
app.post('/slack/actions', express.raw({ type: '*/*' }), async (req, res) => {
  const rawBody = req.body.toString('utf8');
  const timestamp = req.headers['x-slack-request-timestamp'];
  const slackSig = req.headers['x-slack-signature'];

  if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET, timestamp, slackSig, rawBody)) {
    console.error('Slack signature verification failed');
    return res.status(401).send('Unauthorized');
  }

  let payload;
  try {
    const params = new URLSearchParams(rawBody);
    payload = JSON.parse(params.get('payload'));
  } catch (err) {
    console.error('Failed to parse payload:', err.message);
    return res.status(400).send('Bad Request');
  }

  const action = payload?.actions?.[0];
  if (!action) return res.status(400).send('No action');

  console.log(`Action received: action_id=${action.action_id}, value=${action.value}`);

  const userName = payload.user?.name || payload.user?.username || 'Unknown';
  const channel = payload.channel?.id || CHANNEL;
  const messageTs = payload.message?.ts;
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Find which session this button belongs to
  const allStates = readAllStates();
  console.log(`Found ${allStates.length} active state(s), looking for ts=${messageTs}`);
  const matching = allStates.find((s) => {
    if (s.state.thread_ts === messageTs) return true;
    if (s.state.message_ts_list && s.state.message_ts_list.includes(messageTs)) return true;
    return false;
  });
  const sessionId = matching?.sessionId || null;
  const state = matching?.state || {};
  console.log(`Matched session: ${sessionId || 'none'}, event: ${state.event || 'none'}, status: ${state.status || 'none'}`);

  // --- QUESTION OPTION BUTTONS (ask_multi flow) ---
  if (action.action_id.startsWith('question_option_')) {
    try {
      return await handleQuestionOption(action, state, sessionId, channel, messageTs, userName, now, payload, res);
    } catch (err) {
      console.error('handleQuestionOption error:', err);
      if (!res.headersSent) {
        return res.json({
          response_type: 'in_channel',
          replace_original: false,
          text: `Error processing your selection: ${err.message}`,
        });
      }
      return;
    }
  }

  // --- APPROVE / REJECT BUTTONS (permission flow) ---
  const status = action.value; // 'approved' or 'rejected'
  const contextText = payload.message?.text || '';
  const isApproved = status === 'approved';

  writeState(sessionId, {
    status: isApproved ? STATUSES.APPROVED : STATUSES.REJECTED,
    event: 'button_click',
    context: contextText,
    thread_ts: messageTs,
    message: action.value,
    respondedBy: userName,
  });

  console.log(`Action received: ${status} by ${userName} (session: ${sessionId || 'unknown'})`);

  // Replace buttons with confirmation text
  const originalText = payload.message?.blocks?.[0]?.text?.text || contextText;
  const statusEmoji = isApproved ? '✅' : '❌';
  const statusLabel = isApproved ? 'APPROVED' : 'REJECTED';

  res.json({
    response_type: 'in_channel',
    replace_original: true,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: originalText },
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${statusEmoji} *${statusLabel}* by @${userName} at ${now}`,
          },
        ],
      },
    ],
  });

  const decisionEmoji = isApproved ? 'white_check_mark' : 'x';
  const claudeEmoji = isApproved ? 'robot_face' : 'octagonal_sign';

  Promise.all([
    slack.reactions.add({ channel, name: decisionEmoji, timestamp: messageTs }),
    slack.reactions.add({ channel, name: claudeEmoji, timestamp: messageTs }),
  ]).catch((err) => console.error('Reaction error:', err.message));
});

// Handle question option button clicks
async function handleQuestionOption(action, state, sessionId, channel, messageTs, userName, now, payload, res) {
  console.log(`handleQuestionOption: action_id=${action.action_id}, state.event=${state.event}, questions=${(state.questions || []).length}`);

  let selectedLabel;
  let optionIndex;

  try {
    const val = JSON.parse(action.value);
    optionIndex = val.option_index;
    selectedLabel = val.label;
  } catch {
    selectedLabel = action.value;
    optionIndex = -1;
  }

  console.log(`Selected: "${selectedLabel}" (index=${optionIndex})`);

  const isOther = selectedLabel === '__other__';
  const questions = state.questions || [];
  const currentIdx = state.current_question_index ?? 0;
  const currentQ = questions[currentIdx];

  if (!currentQ) {
    console.error(`No question found at index ${currentIdx} (${questions.length} total). State may have been cleared.`);
    return res.json({
      response_type: 'in_channel',
      replace_original: true,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `\u2705 *${selectedLabel}* — selected by @${userName} at ${now}\n_Session state expired — answer may not have been recorded._` },
        },
      ],
    });
  }

  if (isOther) {
    // Replace message with prompt to reply in thread
    const originalQuestion = currentQ?.question || 'Question';
    res.json({
      response_type: 'in_channel',
      replace_original: true,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mention}💬 *${originalQuestion}*\n\n✏️ _@${userName} chose "Other" — reply in this thread with your answer._`,
          },
        },
      ],
    });

    // Update state to indicate we're waiting for a thread reply for "Other"
    writeState(sessionId, {
      ...state,
      waiting_other_reply: true,
      other_message_ts: messageTs,
    });

    console.log(`"Other" selected by ${userName} for question ${currentIdx + 1} — waiting for thread reply`);
    return;
  }

  // Record the answer
  if (currentQ) {
    currentQ.answer = selectedLabel;
  }

  const nextIdx = currentIdx + 1;
  const isLastQuestion = nextIdx >= questions.length;

  // Replace the current message with the answered version
  const originalQuestion = currentQ?.question || 'Question';
  res.json({
    response_type: 'in_channel',
    replace_original: true,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 *${originalQuestion}*`,
        },
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `✅ *${selectedLabel}* — selected by @${userName} at ${now}`,
          },
        ],
      },
    ],
  });

  // Add reaction
  slack.reactions.add({ channel, name: 'white_check_mark', timestamp: messageTs }).catch(() => {});

  if (isLastQuestion) {
    // All questions answered
    writeState(sessionId, {
      ...state,
      questions,
      current_question_index: nextIdx,
      status: STATUSES.ANSWERED,
      respondedBy: userName,
    });
    console.log(`All ${questions.length} questions answered by ${userName} (session: ${sessionId || 'unknown'})`);
  } else {
    // Post next question
    const nextQ = questions[nextIdx];
    const blocks = buildQuestionBlocks(nextQ, nextIdx, questions.length);

    try {
      const nextMsg = await slack.chat.postMessage({
        channel,
        text: `${mention}Claude asks: ${nextQ.question}`,
        blocks,
        attachments: [{ color: '#1E90FF' }],
      });

      const msgList = state.message_ts_list || [];
      msgList.push(nextMsg.ts);

      writeState(sessionId, {
        ...state,
        questions,
        current_question_index: nextIdx,
        status: STATUSES.WAITING_REPLY,
        message_ts_list: msgList,
      });

      console.log(`Question ${nextIdx + 1}/${questions.length} posted (session: ${sessionId || 'unknown'})`);
    } catch (err) {
      console.error('Error posting next question:', err.message);
      // Still save the answer even if next question fails
      writeState(sessionId, {
        ...state,
        questions,
        current_question_index: nextIdx,
        status: STATUSES.ANSWERED,
        respondedBy: userName,
      });
    }
  }
}

// Build Block Kit blocks for a question with option buttons
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

  const buttons = q.options.map((o, i) => ({
    type: 'button',
    text: { type: 'plain_text', text: truncate(o.label, 75), emoji: true },
    action_id: `question_option_${i}`,
    value: JSON.stringify({ option_index: i, label: o.label }),
  }));

  buttons.push({
    type: 'button',
    text: { type: 'plain_text', text: '✏️ Other...', emoji: true },
    action_id: 'question_option_other',
    value: JSON.stringify({ option_index: -1, label: '__other__' }),
  });

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

app.get('/health', (_, res) => res.send('ok'));

// Poll thread replies across ALL active sessions
const THREAD_POLL_INTERVAL_MS = 5000;

async function pollThreadReplies() {
  const allStates = readAllStates();

  for (const { sessionId, state } of allStates) {
    const isWaiting = state.status === STATUSES.WAITING;
    const isWaitingReply = state.status === STATUSES.WAITING_REPLY;

    if ((!isWaiting && !isWaitingReply) || !state.thread_ts) continue;

    try {
      // For ask_multi with "Other" selected, check the current question's message thread
      const tsToCheck = state.waiting_other_reply && state.other_message_ts
        ? state.other_message_ts
        : state.thread_ts;

      const result = await slack.conversations.replies({
        channel: CHANNEL,
        ts: tsToCheck,
      });

      const replies = result.messages?.slice(1) ?? [];
      const humanReply = replies.find((m) => !m.bot_id);

      if (humanReply) {
        const text = humanReply.text.trim();
        const lower = text.toLowerCase();

        // Handle "Other" reply for ask_multi
        if (state.event === 'ask_multi' && state.waiting_other_reply) {
          const questions = state.questions || [];
          const currentIdx = state.current_question_index ?? 0;
          if (questions[currentIdx]) {
            questions[currentIdx].answer = text;
          }

          const nextIdx = currentIdx + 1;
          const isLastQuestion = nextIdx >= questions.length;

          if (isLastQuestion) {
            writeState(sessionId, {
              ...state,
              questions,
              current_question_index: nextIdx,
              status: STATUSES.ANSWERED,
              respondedBy: humanReply.user || 'unknown',
              waiting_other_reply: false,
            });
            console.log(`"Other" reply received, all questions answered (session: ${sessionId || 'unknown'})`);
          } else {
            // Post next question
            const nextQ = questions[nextIdx];
            const blocks = buildQuestionBlocks(nextQ, nextIdx, questions.length);

            const nextMsg = await slack.chat.postMessage({
              channel: CHANNEL,
              text: `${mention}Claude asks: ${nextQ.question}`,
              blocks,
              attachments: [{ color: '#1E90FF' }],
            });

            const msgList = state.message_ts_list || [];
            msgList.push(nextMsg.ts);

            writeState(sessionId, {
              ...state,
              questions,
              current_question_index: nextIdx,
              status: STATUSES.WAITING_REPLY,
              message_ts_list: msgList,
              waiting_other_reply: false,
            });
            console.log(`"Other" reply recorded, question ${nextIdx + 1}/${questions.length} posted`);
          }

          await slack.reactions.add({ channel: CHANNEL, name: 'white_check_mark', timestamp: tsToCheck }).catch(() => {});
          continue;
        }

        // Handle summary follow-up replies
        if (state.event === 'summary') {
          writeState(sessionId, {
            ...state,
            status: STATUSES.ANSWERED,
            message: text,
            respondedBy: humanReply.user || 'unknown',
          });
          console.log(`Summary follow-up from ${humanReply.user}: "${text}"`);
          await slack.reactions.add({ channel: CHANNEL, name: 'eyes', timestamp: state.thread_ts }).catch(() => {});
          continue;
        }

        let newStatus;

        if (isWaitingReply) {
          // For ask_multi without "Other", treat thread reply as free-text answer
          if (state.event === 'ask_multi') {
            const questions = state.questions || [];
            const currentIdx = state.current_question_index ?? 0;
            if (questions[currentIdx]) {
              questions[currentIdx].answer = text;
            }

            const nextIdx = currentIdx + 1;
            const isLastQuestion = nextIdx >= questions.length;

            if (isLastQuestion) {
              writeState(sessionId, {
                ...state,
                questions,
                current_question_index: nextIdx,
                status: STATUSES.ANSWERED,
                respondedBy: humanReply.user || 'unknown',
              });
            } else {
              // Post next question
              const nextQ = questions[nextIdx];
              const blocks = buildQuestionBlocks(nextQ, nextIdx, questions.length);

              const nextMsg = await slack.chat.postMessage({
                channel: CHANNEL,
                text: `${mention}Claude asks: ${nextQ.question}`,
                blocks,
                attachments: [{ color: '#1E90FF' }],
              });

              const msgList = state.message_ts_list || [];
              msgList.push(nextMsg.ts);

              writeState(sessionId, {
                ...state,
                questions,
                current_question_index: nextIdx,
                status: STATUSES.WAITING_REPLY,
                message_ts_list: msgList,
              });
            }

            await slack.reactions.add({ channel: CHANNEL, name: 'speech_balloon', timestamp: state.thread_ts }).catch(() => {});
            continue;
          }

          newStatus = STATUSES.ANSWERED;
        } else {
          if (lower.startsWith('approve') || lower === 'yes' || lower === 'y' || lower === 'go') {
            newStatus = STATUSES.APPROVED;
          } else if (lower.startsWith('reject') || lower === 'no' || lower === 'n' || lower === 'stop') {
            newStatus = STATUSES.REJECTED;
          } else {
            newStatus = STATUSES.APPROVED;
          }
        }

        writeState(sessionId, {
          ...state,
          status: newStatus,
          message: text,
          respondedBy: humanReply.user || 'unknown',
        });

        console.log(`Thread reply for session ${sessionId || 'legacy'}: ${newStatus} — "${text}"`);

        // Add reactions
        if (isWaitingReply) {
          await Promise.all([
            slack.reactions.add({ channel: CHANNEL, name: 'speech_balloon', timestamp: state.thread_ts }),
            slack.reactions.add({ channel: CHANNEL, name: 'robot_face', timestamp: state.thread_ts }),
          ]).catch(() => {});
        } else {
          const isApproved = newStatus === STATUSES.APPROVED;
          const decisionEmoji = isApproved ? 'white_check_mark' : 'x';
          const claudeEmoji = isApproved ? 'robot_face' : 'octagonal_sign';

          await Promise.all([
            slack.reactions.add({ channel: CHANNEL, name: decisionEmoji, timestamp: state.thread_ts }),
            slack.reactions.add({ channel: CHANNEL, name: claudeEmoji, timestamp: state.thread_ts }),
            slack.reactions.add({ channel: CHANNEL, name: 'speech_balloon', timestamp: state.thread_ts }),
          ]).catch(() => {});
        }
      }
    } catch {
      // Silently ignore polling errors for individual sessions
    }
  }
}

setInterval(pollThreadReplies, THREAD_POLL_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Slack listener running on http://localhost:${PORT}`);
  console.log(`Actions endpoint: http://localhost:${PORT}/slack/actions`);
  console.log(`Thread reply polling active (every ${THREAD_POLL_INTERVAL_MS / 1000}s)`);
});
