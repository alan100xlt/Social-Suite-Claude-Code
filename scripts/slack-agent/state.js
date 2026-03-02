// scripts/slack-agent/state.js
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '../../.claude');

export const STATUSES = {
  NONE: 'none',
  WAITING: 'waiting',
  WAITING_REPLY: 'waiting_reply',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ANSWERED: 'answered',
  TIMED_OUT: 'timed_out',
};

function statePath(sessionId) {
  if (sessionId) {
    return join(STATE_DIR, `approval-state-${sessionId}.json`);
  }
  // Fallback to legacy single file (for CLI scripts without session context)
  return join(STATE_DIR, 'approval-state.json');
}

export function readState(sessionId) {
  const path = statePath(sessionId);
  if (!existsSync(path)) return { status: STATUSES.NONE };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { status: STATUSES.NONE };
  }
}

export function writeState(sessionId, state) {
  // Support old signature: writeState(state) without sessionId
  if (typeof sessionId === 'object') {
    state = sessionId;
    sessionId = state.session_id || null;
  }
  const path = statePath(sessionId);
  writeFileSync(path, JSON.stringify({ ...state, session_id: sessionId, timestamp: new Date().toISOString() }, null, 2));
}

export function resetState(sessionId) {
  writeState(sessionId, { status: STATUSES.NONE });
}

/**
 * Find all active state files (for the thread poller in slack-listener.js)
 * Returns array of { sessionId, state } objects
 */
export function readAllStates() {
  const results = [];
  try {
    const files = readdirSync(STATE_DIR).filter((f) => f.startsWith('approval-state'));
    for (const file of files) {
      const path = join(STATE_DIR, file);
      try {
        const state = JSON.parse(readFileSync(path, 'utf8'));
        const sessionId = state.session_id || null;
        results.push({ sessionId, state, path });
      } catch {}
    }
  } catch {}
  return results;
}

/**
 * Clean up state files older than maxAgeMs (default 24h)
 */
export function cleanupStaleStates(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const files = readdirSync(STATE_DIR).filter((f) => f.startsWith('approval-state'));
    const now = Date.now();
    for (const file of files) {
      const path = join(STATE_DIR, file);
      try {
        const stat = statSync(path);
        if (now - stat.mtimeMs > maxAgeMs) {
          unlinkSync(path);
        }
      } catch {}
    }
  } catch {}
}
