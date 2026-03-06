/**
 * SessionStart hook: detects uncommitted or unpushed edge function changes.
 *
 * Checks for:
 * 1. Uncommitted changes to supabase/functions/ (staged or unstaged)
 * 2. Committed but unpushed changes to supabase/functions/ (local ahead of origin/main)
 *
 * Outputs a warning so Claude sees it in context and can act on it.
 * Always exits 0 — never blocks session start.
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

function main() {
  // 1. Uncommitted changes (staged + unstaged + untracked) in supabase/functions/
  const uncommittedModified = run('git diff --name-only -- supabase/functions/');
  const uncommittedStaged = run('git diff --cached --name-only -- supabase/functions/');
  const untrackedRaw = run('git ls-files --others --exclude-standard -- supabase/functions/');

  const uncommitted = new Set([
    ...uncommittedModified.split('\n').filter(Boolean),
    ...uncommittedStaged.split('\n').filter(Boolean),
    ...untrackedRaw.split('\n').filter(Boolean),
  ]);

  // 2. Committed but unpushed changes to supabase/functions/
  const unpushed = run('git diff --name-only origin/main...HEAD -- supabase/functions/');
  const unpushedFiles = new Set(unpushed.split('\n').filter(Boolean));

  // Remove overlap — if a file is both uncommitted AND unpushed, show it as uncommitted (worse state)
  for (const f of uncommitted) {
    unpushedFiles.delete(f);
  }

  if (uncommitted.size === 0 && unpushedFiles.size === 0) {
    console.log('Edge Function Drift Check: All edge functions in sync with deployed version.');
    process.exit(0);
  }

  // Extract function names from paths like supabase/functions/<name>/index.ts
  function extractFunctionNames(files) {
    const names = new Set();
    for (const f of files) {
      const match = f.match(/^supabase\/functions\/([^/]+)\//);
      if (match && !match[1].startsWith('_')) names.add(match[1]);
    }
    return [...names].sort();
  }

  const lines = ['Edge Function Drift Check: WARNING — local edge functions out of sync with production!'];
  lines.push('');

  if (uncommitted.size > 0) {
    const names = extractFunctionNames(uncommitted);
    lines.push(`  UNCOMMITTED changes (${uncommitted.size} files in ${names.length} functions):`);
    for (const name of names) {
      lines.push(`    - ${name}`);
    }
    lines.push('  These changes are NOT committed and NOT deployed. They WILL be lost if you switch branches.');
    lines.push('');
  }

  if (unpushedFiles.size > 0) {
    const names = extractFunctionNames(unpushedFiles);
    lines.push(`  UNPUSHED changes (${unpushedFiles.size} files in ${names.length} functions):`);
    for (const name of names) {
      lines.push(`    - ${name}`);
    }
    lines.push('  These are committed locally but NOT pushed. CI/CD has NOT deployed them.');
    lines.push('');
  }

  lines.push('  Action: Commit, push, and deploy before starting new work. Use /deploy to deploy edge functions.');

  console.log(lines.join('\n'));
  process.exit(0);
}

main();
