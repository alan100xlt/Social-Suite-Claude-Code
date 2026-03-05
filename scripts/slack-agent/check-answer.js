// scripts/slack-agent/check-answer.js
// Polls state file for question answers. Used by notify.js /ask flow
// to block until the user answers in Slack (or IDE resolves it).
// Prints the answer(s) to stdout as JSON.

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '600000', 10);
const POLL_INTERVAL_MS = 1000;

// Parse --session arg
const args = process.argv.slice(2);
const sessionIdx = args.indexOf('--session');
const sessionId = sessionIdx !== -1 ? args[sessionIdx + 1] : null;

async function waitForAnswers() {
  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const state = readState(sessionId);

    // All questions answered (ask_multi flow)
    if (state.event === 'ask_multi' && state.status === STATUSES.ANSWERED) {
      const answers = (state.questions || []).map((q) => ({
        question: q.question,
        answer: q.answer,
      }));
      console.log(JSON.stringify({ status: 'answered', answers }));
      process.exit(0);
    }

    // Single question answered (legacy ask flow)
    if (state.status === STATUSES.ANSWERED && state.event !== 'ask_multi') {
      console.log(JSON.stringify({ status: 'answered', message: state.message }));
      process.exit(0);
    }

    // State was reset (IDE answered and resolve-question cleaned up)
    if (state.status === STATUSES.NONE && Date.now() - start > 2000) {
      console.log(JSON.stringify({ status: 'resolved_in_ide' }));
      process.exit(0);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error(JSON.stringify({ status: 'timed_out' }));
  process.exit(1);
}

waitForAnswers();
