// scripts/slack-agent/state.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '../../.claude/approval-state.json');

export const STATUSES = {
  NONE: 'none',
  WAITING: 'waiting',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  TIMED_OUT: 'timed_out',
};

export function readState() {
  if (!existsSync(STATE_PATH)) return { status: STATUSES.NONE };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { status: STATUSES.NONE };
  }
}

export function writeState(state) {
  writeFileSync(STATE_PATH, JSON.stringify({ ...state, timestamp: new Date().toISOString() }, null, 2));
}

export function resetState() {
  writeState({ status: STATUSES.NONE });
}
