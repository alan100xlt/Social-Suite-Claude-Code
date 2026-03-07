// scripts/hooks/block-process-env.js
// PreToolUse hook: warns when Edit/Write introduces process.env in client code.
// Only checks files under src/ — edge functions and scripts are fine.

import { parseHookInput } from '../slack-agent/stdin.js';

const input = await parseHookInput();
const filePath = input.tool_input?.file_path || input.tool_input?.file || '';
const content = input.tool_input?.content || input.tool_input?.new_string || '';

// Only check src/ files (client-side code)
if (!filePath.replace(/\\/g, '/').includes('/src/')) {
  process.exit(0);
}

// Only check TS/TSX/JS/JSX files
if (!/\.(tsx?|jsx?)$/.test(filePath)) {
  process.exit(0);
}

if (/process\.env\b/.test(content)) {
  process.stderr.write(
    `\n⚠️  BLOCKED: process.env detected in ${filePath}\n` +
    `   This is a Vite app — use import.meta.env.VITE_* instead.\n` +
    `   process.env is undefined in the browser and will cause runtime errors.\n\n`
  );
  // Exit 2 = block the tool call
  process.exit(2);
}

process.exit(0);
