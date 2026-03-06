#!/usr/bin/env node
/**
 * Historical Inbox Backfill CLI — triggers full inbox import for companies.
 *
 * Usage:
 *   node scripts/backfill-inbox-historical.cjs [options]
 *
 * Options:
 *   --company <id>    Backfill a specific company
 *   --all             Backfill all companies with getlate_profile_id
 *   --status          Show status of active/recent backfill jobs
 *   --dry-run         List companies that would be backfilled
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ─── Load env vars from .env.local ───────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

// ─── Parse CLI args ──────────────────────────────────────────

const args = process.argv.slice(2);
const showStatus = args.includes('--status');
const backfillAll = args.includes('--all');
const dryRun = args.includes('--dry-run');
const companyIdx = args.indexOf('--company');
const targetCompanyId = companyIdx !== -1 ? args[companyIdx + 1] : null;

if (!showStatus && !backfillAll && !targetCompanyId) {
  console.log('Usage:');
  console.log('  node scripts/backfill-inbox-historical.cjs --company <id>');
  console.log('  node scripts/backfill-inbox-historical.cjs --all');
  console.log('  node scripts/backfill-inbox-historical.cjs --status');
  console.log('  node scripts/backfill-inbox-historical.cjs --dry-run --all');
  process.exit(0);
}

// ─── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Main ────────────────────────────────────────────────────

async function main() {
  if (showStatus) {
    return await showJobStatus();
  }

  // Fetch companies
  let query = supabase
    .from('companies')
    .select('id, name, getlate_profile_id')
    .not('getlate_profile_id', 'is', null);

  if (targetCompanyId) {
    query = query.eq('id', targetCompanyId);
  }

  const { data: companies, error } = await query;
  if (error) {
    console.error('Failed to fetch companies:', error.message);
    process.exit(1);
  }

  if (!companies || companies.length === 0) {
    console.log('No companies with getlate_profile_id found.');
    return;
  }

  console.log(`Found ${companies.length} company(s):\n`);

  for (const company of companies) {
    console.log(`  ${company.name} (${company.id.slice(0, 8)}...) — profile: ${company.getlate_profile_id}`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No backfill triggered.');
    return;
  }

  console.log('');

  for (const company of companies) {
    console.log(`── Triggering historical sync for ${company.name} ──`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/inbox-historical-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: company.id }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`  Job started: ${data.jobId}`);

        // Poll for progress
        await pollProgress(data.jobId, company.name);
      } else {
        console.error(`  Failed: ${data.error || data.message}`);
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    console.log('');
  }
}

async function pollProgress(jobId, companyName) {
  const POLL_INTERVAL = 5000;
  const MAX_POLLS = 360; // 30 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const { data: job } = await supabase
      .from('inbox_backfill_jobs')
      .select('status, synced_conversations, synced_messages, cursor_state, error, completed_at')
      .eq('id', jobId)
      .single();

    if (!job) {
      console.log('  Job not found — stopping poll');
      return;
    }

    const phase = job.cursor_state?.phase || '?';
    const chain = job.cursor_state?.chainCount || 0;
    process.stdout.write(`\r  [${job.status}] ${job.synced_conversations} convs, ${job.synced_messages} msgs — phase: ${phase}, chain: ${chain}    `);

    if (job.status === 'completed') {
      console.log(`\n  Completed! ${job.synced_conversations} conversations, ${job.synced_messages} messages imported.`);
      return;
    }

    if (job.status === 'failed') {
      console.log(`\n  Failed: ${job.error}`);
      return;
    }
  }

  console.log('\n  Timed out waiting for completion (still running in background)');
}

async function showJobStatus() {
  const { data: jobs, error } = await supabase
    .from('inbox_backfill_jobs')
    .select('id, company_id, job_type, status, synced_conversations, synced_messages, cursor_state, error, started_at, completed_at')
    .eq('job_type', 'historical_sync')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch jobs:', error.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('No historical sync jobs found.');
    return;
  }

  console.log(`Recent historical sync jobs:\n`);

  for (const job of jobs) {
    const phase = job.cursor_state?.phase || '?';
    const chain = job.cursor_state?.chainCount || 0;
    const duration = job.started_at && job.completed_at
      ? `${Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000)}s`
      : job.started_at ? 'running...' : 'pending';

    console.log(`  ${job.id.slice(0, 8)} | ${job.company_id.slice(0, 8)} | ${job.status.padEnd(10)} | ${job.synced_conversations} convs, ${job.synced_messages} msgs | phase: ${phase} chain: ${chain} | ${duration}`);
    if (job.error) console.log(`    Error: ${job.error}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
