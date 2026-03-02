// scripts/slack-agent/check-approval.js
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readState, STATUSES } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '600000', 10);
const POLL_INTERVAL_MS = 1000;

// If polling mode, delegate to poll-approval.js
if (process.env.APPROVAL_MODE === 'polling') {
  const { execSync } = await import('child_process');
  execSync('node poll-approval.js', { stdio: 'inherit', cwd: __dirname });
  process.exit(0);
}

async function waitForApproval() {
  const start = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const state = readState();

    if (state.status === STATUSES.APPROVED) {
      console.log('Approved:', state.message || '(no message)');
      process.exit(0);
    }

    if (state.status === STATUSES.REJECTED) {
      console.error('Rejected:', state.message || '(no message)');
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error('Approval timed out after', TIMEOUT_MS / 1000 / 60, 'minutes');
  process.exit(1);
}

waitForApproval();
