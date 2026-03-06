/**
 * Stop hook: warns if edge functions were modified during this session but not deployed.
 *
 * Checks for uncommitted or unpushed changes to supabase/functions/.
 * Outputs a warning — does NOT block the session from ending (exit 0).
 * The warning ensures Claude (and the user) see it before the session closes.
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 10000 }).trim();
  } catch {
    return '';
  }
}

function extractFunctionNames(files) {
  const names = new Set();
  for (const f of files) {
    const match = f.match(/^supabase\/functions\/([^/]+)\//);
    if (match && !match[1].startsWith('_')) names.add(match[1]);
  }
  return [...names].sort();
}

function main() {
  const uncommittedModified = run('git diff --name-only -- supabase/functions/');
  const uncommittedStaged = run('git diff --cached --name-only -- supabase/functions/');
  const untrackedRaw = run('git ls-files --others --exclude-standard -- supabase/functions/');
  const unpushed = run('git diff --name-only origin/main...HEAD -- supabase/functions/');

  const uncommitted = new Set([
    ...uncommittedModified.split('\n').filter(Boolean),
    ...uncommittedStaged.split('\n').filter(Boolean),
    ...untrackedRaw.split('\n').filter(Boolean),
  ]);

  const unpushedFiles = new Set(unpushed.split('\n').filter(Boolean));
  for (const f of uncommitted) unpushedFiles.delete(f);

  if (uncommitted.size === 0 && unpushedFiles.size === 0) {
    process.exit(0); // Silent — no drift, no message needed
  }

  const allNames = new Set([
    ...extractFunctionNames(uncommitted),
    ...extractFunctionNames(unpushedFiles),
  ]);

  const lines = [];
  lines.push('');
  lines.push('WARNING: Edge functions modified but NOT deployed to production:');
  lines.push(`  Functions: ${[...allNames].join(', ')}`);

  if (uncommitted.size > 0) {
    lines.push(`  ${uncommitted.size} file(s) not even committed yet`);
  }
  if (unpushedFiles.size > 0) {
    lines.push(`  ${unpushedFiles.size} file(s) committed but not pushed (CI/CD hasn't deployed)`);
  }

  lines.push('');
  lines.push('  The app may be broken in production. Before closing:');
  lines.push('  1. Commit changes: git add supabase/functions/ && git commit');
  lines.push('  2. Push to trigger CI/CD: git push');
  lines.push('  3. Or deploy manually: /deploy');
  lines.push('');

  console.log(lines.join('\n'));
  process.exit(0);
}

main();
