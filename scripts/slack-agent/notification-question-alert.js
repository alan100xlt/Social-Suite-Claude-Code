// scripts/slack-agent/notification-question-alert.js
// Elicitation hook: fires when Claude asks the user a question (AskUserQuestion).
// Posts a short @mention alert to Slack directing user to VS Code tunnel.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;
const USER_ID = process.env.SLACK_USER_ID;
const TUNNEL_URL = 'https://vscode.dev/tunnel/alan-vivo';

const mention = USER_ID ? `<@${USER_ID}>` : '';

async function main() {
  const input = await parseHookInput();

  // The Elicitation hook provides the question context
  const message = input.message || '';

  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `${mention} Claude has a question — check ${TUNNEL_URL}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${mention} :speech_balloon: *Claude has a question* — <${TUNNEL_URL}|open VS Code tunnel>`,
        },
      },
      ...(message
        ? [
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `_${message.slice(0, 200)}${message.length > 200 ? '…' : ''}_` },
              ],
            },
          ]
        : []),
    ],
    attachments: [{ color: '#1E90FF' }],
  });

  console.log('Question alert sent to Slack');
}

main().catch((err) => {
  console.error('notification-question-alert error:', err.message);
  process.exit(0); // Don't block Claude on notification failure
});
