// scripts/slack-agent/slack-listener.js
import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WebClient } from '@slack/web-api';
import { readState, writeState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

function verifySlackSignature(signingSecret, timestamp, slackSig, rawBody) {
  if (!timestamp || !slackSig) return false;
  // Reject requests older than 5 minutes
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

// Use raw body for signature verification
app.post('/slack/actions', express.raw({ type: '*/*' }), (req, res) => {
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

  const status = action.value; // 'approved' or 'rejected'
  const contextText = payload.message?.text || '';
  const userName = payload.user?.name || payload.user?.username || 'Unknown';
  const channel = payload.channel?.id || process.env.SLACK_CHANNEL_ID;
  const messageTs = payload.message?.ts;
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const isApproved = status === 'approved';

  writeState({
    status: isApproved ? STATUSES.APPROVED : STATUSES.REJECTED,
    event: 'button_click',
    context: contextText,
    message: action.value,
    respondedBy: userName,
  });

  console.log(`Action received: ${status} by ${userName}`);

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
        text: {
          type: 'mrkdwn',
          text: originalText,
        },
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

  // Add emoji reactions for at-a-glance scanning
  // Decision: ✅ or ❌ | Claude status: 🤖 resumed or 🛑 stopped
  const decisionEmoji = isApproved ? 'white_check_mark' : 'x';
  const claudeEmoji = isApproved ? 'robot_face' : 'octagonal_sign';

  Promise.all([
    slack.reactions.add({ channel, name: decisionEmoji, timestamp: messageTs }),
    slack.reactions.add({ channel, name: claudeEmoji, timestamp: messageTs }),
  ]).catch((err) => console.error('Reaction error:', err.message));
});

app.get('/health', (_, res) => res.send('ok'));

// Poll for thread replies while status is "waiting"
// This lets you type a freeform message in the thread instead of tapping buttons
const THREAD_POLL_INTERVAL_MS = 5000;
const CHANNEL = process.env.SLACK_CHANNEL_ID;

async function pollThreadReplies() {
  const state = readState();
  if (state.status !== STATUSES.WAITING || !state.thread_ts) return;

  try {
    const result = await slack.conversations.replies({
      channel: CHANNEL,
      ts: state.thread_ts,
    });

    const replies = result.messages?.slice(1) ?? [];
    const humanReply = replies.find((m) => !m.bot_id);

    if (humanReply) {
      const text = humanReply.text.trim();
      const lower = text.toLowerCase();

      // Detect approve/reject keywords, otherwise treat as freeform instruction
      let status;
      if (lower.startsWith('approve') || lower === 'yes' || lower === 'y' || lower === 'go') {
        status = STATUSES.APPROVED;
      } else if (lower.startsWith('reject') || lower === 'no' || lower === 'n' || lower === 'stop') {
        status = STATUSES.REJECTED;
      } else {
        // Freeform reply — treat as approved with instructions
        status = STATUSES.APPROVED;
      }

      const isApproved = status === STATUSES.APPROVED;

      writeState({
        ...state,
        status,
        message: text,
        respondedBy: humanReply.user || 'unknown',
      });

      console.log(`Thread reply detected: ${status} — "${text}"`);

      // Add reactions
      const decisionEmoji = isApproved ? 'white_check_mark' : 'x';
      const claudeEmoji = isApproved ? 'robot_face' : 'octagonal_sign';

      await Promise.all([
        slack.reactions.add({ channel: CHANNEL, name: decisionEmoji, timestamp: state.thread_ts }),
        slack.reactions.add({ channel: CHANNEL, name: claudeEmoji, timestamp: state.thread_ts }),
        slack.reactions.add({ channel: CHANNEL, name: 'speech_balloon', timestamp: state.thread_ts }),
      ]).catch(() => {});
    }
  } catch (err) {
    // Silently ignore polling errors
  }
}

setInterval(pollThreadReplies, THREAD_POLL_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Slack listener running on http://localhost:${PORT}`);
  console.log(`Actions endpoint: http://localhost:${PORT}/slack/actions`);
  console.log(`Thread reply polling active (every ${THREAD_POLL_INTERVAL_MS / 1000}s)`);
});
