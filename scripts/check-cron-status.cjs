const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. Cron job settings
  const { data: settings, error: e1 } = await supabase.from('cron_job_settings').select('*');
  console.log('=== CRON JOB SETTINGS ===');
  if (e1) {
    console.log('Error:', e1.message);
  } else if (settings) {
    settings.forEach(s => {
      console.log(s.job_name, '|', s.schedule, '|', 'enabled:', s.enabled, '|', s.edge_function_name || '');
    });
  }

  // 2. Recent cron health logs
  const { data: logs, error: e2 } = await supabase
    .from('cron_health_logs')
    .select('job_name, status, started_at, completed_at, duration_ms, error_message')
    .order('started_at', { ascending: false })
    .limit(40);

  console.log('\n=== RECENT CRON HEALTH LOGS (last 40) ===');
  if (e2) {
    console.log('Error:', e2.message);
  } else if (logs) {
    logs.forEach(l => {
      const ago = Math.round((Date.now() - new Date(l.started_at).getTime()) / 60000);
      const dur = l.duration_ms ? l.duration_ms + 'ms' : '-';
      const err = l.error_message ? l.error_message.slice(0, 80) : '';
      console.log(l.job_name, '|', l.status, '|', ago + 'min ago', '|', dur, '|', err);
    });
  }

  // 3. Per-job summary
  console.log('\n=== PER-JOB SUMMARY ===');
  const byJob = {};
  if (logs) {
    logs.forEach(l => {
      if (!byJob[l.job_name]) byJob[l.job_name] = { success: 0, error: 0, running: 0, total: 0 };
      byJob[l.job_name][l.status] = (byJob[l.job_name][l.status] || 0) + 1;
      byJob[l.job_name].total++;
    });
    for (const [name, counts] of Object.entries(byJob)) {
      console.log(name, '| success:', counts.success || 0, '| error:', counts.error || 0, '| running:', counts.running || 0, '| total:', counts.total);
    }
  }

  // 4. Check which edge functions exist
  console.log('\n=== EXPECTED CRON JOBS (from settings) ===');
  const expectedJobs = ['rss-poll', 'analytics-sync', 'inbox-sync', 'getlate-changelog-monitor'];
  for (const job of expectedJobs) {
    const found = settings ? settings.find(s => s.job_name === job || s.edge_function_name === job) : null;
    const logCount = byJob[job] ? byJob[job].total : 0;
    const status = found ? 'configured' : 'NOT configured';
    console.log(job, '|', status, '| log entries:', logCount);
  }
}

main().catch(console.error);
