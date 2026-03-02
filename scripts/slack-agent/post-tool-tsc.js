// scripts/slack-agent/post-tool-tsc.js
// PostToolUse hook: runs tsc --noEmit on edited .ts/.tsx files.
// Windows-compatible (reads stdin via Node streams, not /dev/stdin).

import { execSync } from 'child_process';
import { parseHookInput } from './stdin.js';

const input = await parseHookInput();
const filePath = input.tool_input?.file_path;

if (filePath && /\.(tsx?|ts)$/.test(filePath)) {
  try {
    const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', timeout: 30000 });
    const lines = output.split('\n').slice(0, 20).join('\n');
    if (lines.trim()) {
      process.stderr.write(lines);
    }
  } catch (err) {
    // Show first 20 lines of type errors
    const output = err.stdout || err.stderr || '';
    const lines = output.split('\n').slice(0, 20).join('\n');
    if (lines.trim()) {
      process.stderr.write(lines);
    }
  }
}

process.exit(0);
