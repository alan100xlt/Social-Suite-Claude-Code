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

  writeState({
    status: status === 'approved' ? STATUSES.APPROVED : STATUSES.REJECTED,
    event: 'button_click',
    context: contextText,
    message: action.value,
  });

  console.log(`Action received: ${status}`);

  // Acknowledge to Slack immediately (required within 3s)
  res.json({
    response_type: 'in_channel',
    replace_original: false,
    text: status === 'approved'
      ? '✅ Approved — Claude is proceeding.'
      : '❌ Rejected — Claude has been stopped.',
  });
});

app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Slack listener running on http://localhost:${PORT}`);
  console.log(`Actions endpoint: http://localhost:${PORT}/slack/actions`);
});
