const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Recent logs
  const { data: logs, error } = await sb
    .from('cron_health_logs')
    .select('job_name, status, started_at, duration_ms, error_message')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) { console.error('Query error:', error); return; }

  console.log('RECENT CRON HEALTH LOGS (last 40):');
  console.log('='.repeat(130));
  console.log('STATUS    JOB NAME                        AGO         DURATION  ERROR');
  console.log('-'.repeat(130));

  for (const r of logs) {
    const ago = Math.round((Date.now() - new Date(r.started_at).getTime()) / 60000);
    const agoStr = ago < 60 ? ago + 'm' : Math.round(ago / 60) + 'h';
    const dur = r.duration_ms ? (r.duration_ms / 1000).toFixed(1) + 's' : '—';
    const err = r.error_message ? r.error_message.slice(0, 70) : '';
    console.log(
      r.status.padEnd(10) +
      r.job_name.padEnd(32) +
      agoStr.padStart(6) + ' ago' +
      dur.padStart(10) +
      '  ' + err
    );
  }

  // Summary by job
  console.log('\n\nJOB SUMMARY (last 20 per job):');
  console.log('='.repeat(80));
  const byJob = {};
  for (const r of logs) {
    if (!byJob[r.job_name]) byJob[r.job_name] = [];
    byJob[r.job_name].push(r);
  }
  for (const [name, entries] of Object.entries(byJob)) {
    const successes = entries.filter(e => e.status === 'success').length;
    const errors = entries.filter(e => e.status === 'error' || e.status === 'partial').length;
    const lastStatus = entries[0].status;
    const lastAgo = Math.round((Date.now() - new Date(entries[0].started_at).getTime()) / 60000);
    console.log(
      name.padEnd(35) +
      'Last: ' + lastStatus.padEnd(10) +
      (lastAgo + 'm ago').padStart(8) +
      '  Success: ' + successes + '/' + entries.length +
      '  Errors: ' + errors
    );
  }
}

main();
