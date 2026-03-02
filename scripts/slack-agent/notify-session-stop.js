// scripts/slack-agent/notify-session-stop.js
// Stop hook: posts a rich Slack message summarizing what changed during the session.

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
const lastCommit = run('git log -1 --format="%h %s (%ar)" 2>/dev/null');

// Files changed since session (uncommitted)
const modifiedFiles = run('git diff --name-only HEAD 2>/dev/null');
const stagedFiles = run('git diff --cached --name-only 2>/dev/null');
const untrackedNew = run('git ls-files --others --exclude-standard 2>/dev/null');

// Recent commits (likely from this session — last 5 within the last hour)
const recentSessionCommits = run('git log --since="1 hour ago" --format="• %h %s" 2>/dev/null');

// Diff stats
const diffStat = run('git diff --stat HEAD 2>/dev/null');

// Build summary sections
const sections = [];

// Commits made this session
if (recentSessionCommits) {
  sections.push(`*Commits this session:*\n${recentSessionCommits}`);
} else {
  sections.push('_No commits made this session_');
}

// Uncommitted changes
const uncommitted = [];
if (stagedFiles) uncommitted.push(`*Staged:* ${stagedFiles.split('\n').length} file(s)`);
if (modifiedFiles) uncommitted.push(`*Modified:* ${modifiedFiles.split('\n').length} file(s)`);
if (untrackedNew) uncommitted.push(`*New files:* ${untrackedNew.split('\n').length} file(s)`);

if (uncommitted.length > 0) {
  sections.push(`*Uncommitted changes:*\n${uncommitted.join('\n')}`);
}

// Diff stats (insertions/deletions)
if (diffStat) {
  const lastLine = diffStat.split('\n').pop();
  if (lastLine) sections.push(`*Diff summary:* ${lastLine}`);
}

// Changed file list (truncated)
const allChanged = [stagedFiles, modifiedFiles, untrackedNew].filter(Boolean).join('\n');
if (allChanged) {
  const files = [...new Set(allChanged.split('\n'))];
  const display = files.length > 15
    ? files.slice(0, 15).join('\n') + `\n... and ${files.length - 15} more`
    : files.join('\n');
  sections.push(`*Files touched:*\n\`\`\`${display}\`\`\``);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

try {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `🏁 SESSION COMPLETE on branch ${branch}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `🏁 *SESSION COMPLETE*${sessionId ? ` _(${sessionId.slice(0, 8)})_` : ''}`,
            `*Branch:* \`${branch || '(detached)'}\``,
            lastCommit ? `*Latest commit:* ${lastCommit}` : '',
          ].filter(Boolean).join('\n'),
        },
      },
      ...sections.map((text) => ({
        type: 'section',
        text: { type: 'mrkdwn', text },
      })),
    ],
    attachments: [{ color: '#4A90D9' }],
  });

  console.log('Session stop notification sent');
} catch (err) {
  console.error('notify-session-stop error:', err.message);
}

process.exit(0);
