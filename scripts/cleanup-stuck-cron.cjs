const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
  // Find all "running" entries older than 5 minutes (definitely stuck)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuck, error: findErr } = await supabase
    .from('cron_health_logs')
    .select('id, job_name, started_at')
    .eq('status', 'running')
    .lt('started_at', fiveMinAgo);

  if (findErr) {
    console.error('Error finding stuck entries:', findErr.message);
    return;
  }

  console.log(`Found ${stuck.length} stuck "running" entries older than 5 min`);

  if (stuck.length === 0) return;

  // Update them to "error" with explanation
  const { error: updateErr } = await supabase
    .from('cron_health_logs')
    .update({
      status: 'error',
      completed_at: new Date().toISOString(),
      error_message: 'Marked as failed: function timed out without completing (orphaned running entry)',
    })
    .eq('status', 'running')
    .lt('started_at', fiveMinAgo);

  if (updateErr) {
    console.error('Error updating stuck entries:', updateErr.message);
  } else {
    console.log(`Updated ${stuck.length} stuck entries to "error" status`);
    for (const s of stuck) {
      const ago = Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000);
      console.log(`  - ${s.job_name} (${ago} min ago)`);
    }
  }
}

main().catch(console.error);
