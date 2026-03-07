/**
 * SessionStart hook: checks cron pipeline health on conversation start.
 *
 * Queries cron_health_logs for errors/partial failures in the last 24h
 * and stuck jobs (status='running' for >10 minutes).
 * Outputs a summary to stdout so Claude sees it in context.
 * Always exits 0 — never blocks session start.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Parse .env.local manually (no dotenv dependency) ──────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env.local');
  const env = {};
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf-8');
  } catch {
    return env;
  }
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.log('Pipeline Health Check: skipped (missing Supabase env vars)');
    process.exit(0);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (...args) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      return fetch(args[0], { ...args[1], signal: controller.signal });
    }}
  });

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  // ── Query 1: errors and partial failures in last 24h ──────────────────
  const { data: errorLogs, error: errQ1 } = await sb
    .from('cron_health_logs')
    .select('job_name, status, error_message, started_at, created_at')
    .or('status.eq.error,status.eq.partial')
    .gte('created_at', twentyFourHoursAgo)
    .or('job_name.like.inbox-sync%,job_name.like.analytics-sync%,job_name.like.rss-poll%')
    .order('created_at', { ascending: false })
    .limit(100);

  // ── Query 2: stuck jobs (running for >10 minutes) ─────────────────────
  const { data: stuckLogs, error: errQ2 } = await sb
    .from('cron_health_logs')
    .select('job_name, status, started_at, created_at')
    .eq('status', 'running')
    .lt('started_at', tenMinutesAgo)
    .or('job_name.like.inbox-sync%,job_name.like.analytics-sync%,job_name.like.rss-poll%')
    .order('started_at', { ascending: true })
    .limit(20);

  if (errQ1 || errQ2) {
    const msg = (errQ1 || errQ2).message || 'unknown';
    console.log(`Pipeline Health Check: query failed (${msg})`);
    process.exit(0);
  }

  const errors = errorLogs || [];
  const stuck = stuckLogs || [];

  // ── No problems: short message ────────────────────────────────────────
  if (errors.length === 0 && stuck.length === 0) {
    console.log('Pipeline Health Check: All cron jobs healthy (0 errors in last 24h)');
    process.exit(0);
  }

  // ── Group errors by job name ──────────────────────────────────────────
  const byJob = {};
  for (const log of errors) {
    if (!byJob[log.job_name]) byJob[log.job_name] = [];
    byJob[log.job_name].push(log);
  }

  // ── Count consecutive failures per job (from most recent) ─────────────
  // We need the last 5 logs per failing job to check streak
  const consecutiveMap = {};
  for (const jobName of Object.keys(byJob)) {
    const { data: recentLogs } = await sb
      .from('cron_health_logs')
      .select('status')
      .eq('job_name', jobName)
      .order('created_at', { ascending: false })
      .limit(5);

    let consecutive = 0;
    if (recentLogs) {
      for (const r of recentLogs) {
        if (r.status === 'error' || r.status === 'partial') consecutive++;
        else break;
      }
    }
    consecutiveMap[jobName] = consecutive;
  }

  // ── Build output ──────────────────────────────────────────────────────
  const lines = ['Pipeline Health Check:'];

  const jobCount = Object.keys(byJob).length;
  lines.push(`  ${errors.length} error${errors.length === 1 ? '' : 's'} across ${jobCount} cron job${jobCount === 1 ? '' : 's'} in the last 24h`);

  for (const [jobName, logs] of Object.entries(byJob)) {
    const consecutive = consecutiveMap[jobName] || 0;
    const mostRecent = logs[0];
    const errMsg = mostRecent.error_message
      ? mostRecent.error_message.slice(0, 120)
      : '(no message)';
    const countLabel = consecutive > 1
      ? `${consecutive} consecutive failures`
      : `${logs.length} error${logs.length === 1 ? '' : 's'}`;
    lines.push(`  - ${jobName} (${countLabel}): "${errMsg}"`);
  }

  if (stuck.length > 0) {
    for (const s of stuck) {
      const runningMin = Math.round((now.getTime() - new Date(s.started_at).getTime()) / 60000);
      lines.push(`  ${stuck.indexOf(s) === 0 ? '\n  ' : '  '}Stuck job: ${s.job_name} (running for ${runningMin} minutes)`);
    }
  }

  lines.push('');
  lines.push('  Action needed: Review edge function logs and fix before errors accumulate.');

  console.log(lines.join('\n'));
  process.exit(0);
}

main().catch(() => {
  // Never block session start
  console.log('Pipeline Health Check: failed to run (caught exception)');
  process.exit(0);
});
