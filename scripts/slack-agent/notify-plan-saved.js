// scripts/slack-agent/notify-plan-saved.js
// PostToolUse hook: fires when Claude writes to docs/plans/*.md
// Posts a Slack notification so the user knows a plan was saved
// and that Linear issues + execution handoff are coming next.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();

// The tool input contains the file path that was written
const filePath = input?.tool_input?.file_path || '';
const fileName = basename(filePath) || 'unknown plan';

// Only notify for docs/plans/ writes
if (!filePath.includes('docs/plans/')) {
  process.exit(0);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

try {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `📋 Plan saved: \`${fileName}\` — Linear issues + execution prompt coming next.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `📋 *Plan saved:* \`${fileName}\``,
            '',
            'Linear issues are being created now.',
            'An execution prompt will follow — check the session for the parallel session command.',
          ].join('\n'),
        },
      },
    ],
    attachments: [{ color: '#4A90E2' }],
  });

  console.log('Plan saved notification sent');
} catch (err) {
  console.error('notify-plan-saved error:', err.message);
}

process.exit(0);
