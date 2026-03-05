// scripts/slack-agent/notify-session-stop.js
// Stop hook: posts a short one-liner to the channel, full details in thread.

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeState, STATUSES } from './state.js';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const input = await parseHookInput();
const sessionId = input.session_id || null;
const cwd = input.cwd || process.cwd();

const USER_ID = process.env.SLACK_USER_ID;
const mention = USER_ID ? `<@${USER_ID}> ` : '';

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

// Build plain English summary for thread
const detailParts = [];

if (recentSessionCommits) {
  const commitCount = recentSessionCommits.split('\n').filter(Boolean).length;
  detailParts.push(`*Commits this session (${commitCount}):*\n${recentSessionCommits}`);
} else {
  detailParts.push('_No commits made this session._');
}

// Uncommitted changes
const uncommittedFiles = [
  ...(stagedFiles ? stagedFiles.split('\n') : []),
  ...(modifiedFiles ? modifiedFiles.split('\n') : []),
  ...(untrackedNew ? untrackedNew.split('\n') : []),
].filter(Boolean);
const uniqueUncommitted = [...new Set(uncommittedFiles)];

if (uniqueUncommitted.length > 0) {
  const fileList = uniqueUncommitted.length > 10
    ? uniqueUncommitted.slice(0, 10).join('\n') + `\n_...and ${uniqueUncommitted.length - 10} more_`
    : uniqueUncommitted.join('\n');
  detailParts.push(`*Uncommitted files (${uniqueUncommitted.length}):*\n\`\`\`${fileList}\`\`\``);
}

if (diffStat) {
  const lastLine = diffStat.split('\n').pop();
  if (lastLine) detailParts.push(`*Diff:* ${lastLine}`);
}

const threadDetails = detailParts.join('\n\n');

// Build short one-liner for the channel
const commitCount = recentSessionCommits ? recentSessionCommits.split('\n').filter(Boolean).length : 0;
const uncommittedCount = uniqueUncommitted.length;
const parts = [];
if (commitCount > 0) parts.push(`${commitCount} commit${commitCount > 1 ? 's' : ''}`);
if (uncommittedCount > 0) parts.push(`${uncommittedCount} uncommitted file${uncommittedCount > 1 ? 's' : ''}`);
const shortSummary = parts.length > 0 ? parts.join(', ') : 'no changes';

const headline = `\ud83c\udfc1 Session complete on \`${branch || 'detached'}\` — ${shortSummary}.`;

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

try {
  // Short top-level message
  const result = await slack.chat.postMessage({
    channel: CHANNEL,
    text: `${mention}${headline}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `${mention}${headline}` },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Reply in this thread with questions or follow-ups._',
          },
        ],
      },
    ],
    attachments: [{ color: '#4A90D9' }],
  });

  // Full details as thread reply
  await slack.chat.postMessage({
    channel: CHANNEL,
    thread_ts: result.ts,
    text: threadDetails,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Branch:* \`${branch || '(detached)'}\`${lastCommit ? `\n*Latest commit:* ${lastCommit}` : ''}`,
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: threadDetails },
      },
    ],
  });

  // Write state so follow-up replies can be picked up
  writeState(sessionId, {
    status: STATUSES.WAITING_REPLY,
    event: 'summary',
    context: threadDetails,
    thread_ts: result.ts,
  });

  console.log('Session stop notification sent');
} catch (err) {
  console.error('notify-session-stop error:', err.message);
}

process.exit(0);
