// scripts/slack-agent/notify-session-start.js
// SessionStart hook: posts a rich Slack message with branch, recent commits,
// and modified files so the user knows what context Claude is working in.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();
const sessionId = input.session_id || null;
const cwd = input.cwd || process.cwd();

function run(cmd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

const branch = run('git branch --show-current');
const lastCommit = run('git log -1 --format="%h %s" 2>/dev/null');
const recentCommits = run('git log -3 --format="• %h %s (%ar)" 2>/dev/null');
const modifiedFiles = run('git diff --name-only HEAD 2>/dev/null');
const untrackedFiles = run('git ls-files --others --exclude-standard 2>/dev/null');
const stagedFiles = run('git diff --cached --name-only 2>/dev/null');

// Build summary
const fileSections = [];
if (stagedFiles) fileSections.push(`*Staged:*\n\`\`\`${stagedFiles}\`\`\``);
if (modifiedFiles) fileSections.push(`*Modified:*\n\`\`\`${modifiedFiles}\`\`\``);
if (untrackedFiles) {
  const lines = untrackedFiles.split('\n');
  const display = lines.length > 10
    ? lines.slice(0, 10).join('\n') + `\n... and ${lines.length - 10} more`
    : untrackedFiles;
  fileSections.push(`*Untracked:*\n\`\`\`${display}\`\`\``);
}

const filesSummary = fileSections.length > 0
  ? fileSections.join('\n')
  : '_Working tree clean_';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

try {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `🟢 SESSION STARTED on branch ${branch}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `🟢 *SESSION STARTED*${sessionId ? ` _(${sessionId.slice(0, 8)})_` : ''}`,
            `*Branch:* \`${branch || '(detached)'}\``,
            lastCommit ? `*Last commit:* ${lastCommit}` : '',
          ].filter(Boolean).join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: recentCommits
            ? `*Recent commits:*\n${recentCommits}`
            : '_No recent commits_',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Working tree:*\n${filesSummary}`,
        },
      },
    ],
    attachments: [{ color: '#36A64F' }],
  });

  console.log('Session start notification sent');
} catch (err) {
  console.error('notify-session-start error:', err.message);
}

process.exit(0);
