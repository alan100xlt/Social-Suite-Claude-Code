// scripts/slack-agent/post-tool-eslint.js
// PostToolUse hook: runs ESLint --fix on edited .ts/.tsx/.js/.jsx files.
// Windows-compatible (reads stdin via Node streams, not /dev/stdin).

import { execSync } from 'child_process';
import { parseHookInput } from './stdin.js';

const input = await parseHookInput();
const filePath = input.tool_input?.file_path;

if (filePath && /\.(tsx?|jsx?)$/.test(filePath)) {
  try {
    execSync(`npx eslint --fix ${JSON.stringify(filePath)}`, { stdio: 'inherit' });
  } catch {
    // ESLint errors are non-fatal for the hook
  }
}

process.exit(0);
