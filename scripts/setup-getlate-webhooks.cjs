#!/usr/bin/env node
/**
 * Setup GetLate Webhooks — registers webhook endpoints for all companies
 * with a getlate_profile_id, stores HMAC secrets in webhook_registrations.
 *
 * Usage:
 *   node scripts/setup-getlate-webhooks.cjs [--test] [--company <id>]
 *
 * Options:
 *   --test       Send a test event after registration
 *   --company    Only register for a specific company ID
 *   --dry-run    Show what would be done without making changes
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ─── Load env vars from .env.local ───────────────────────────

// Load .env.local manually (no dotenv dependency)
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
    // Strip surrounding quotes
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
const sendTest = args.includes('--test');
const dryRun = args.includes('--dry-run');
const companyIdx = args.indexOf('--company');
const targetCompanyId = companyIdx !== -1 ? args[companyIdx + 1] : null;

// ─── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID;

// GETLATE_API_KEY: check env, then --api-key flag
const apiKeyIdx = args.indexOf('--api-key');
const GETLATE_API_KEY = process.env.GETLATE_API_KEY || (apiKeyIdx !== -1 ? args[apiKeyIdx + 1] : null);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !PROJECT_ID) {
  console.error('ERROR: Missing required env vars. Need:');
  console.error('  VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_PROJECT_ID');
  process.exit(1);
}

if (!GETLATE_API_KEY) {
  console.error('ERROR: GETLATE_API_KEY not found. Set it in .env.local or pass --api-key <key>');
  process.exit(1);
}

const WEBHOOK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/getlate-webhook`;
const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const WEBHOOK_EVENTS = [
  'message.received',
  'comment.received',
  'post.failed',
  'post.partial',
  'account.disconnected',
];

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Events: ${WEBHOOK_EVENTS.join(', ')}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Fetch companies with GetLate profiles
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

  console.log(`Found ${companies.length} company(s) to register:\n`);

  for (const company of companies) {
    console.log(`── ${company.name} (${company.id.slice(0, 8)}...) ──`);
    console.log(`   Profile: ${company.getlate_profile_id}`);

    // Check for existing registration
    const { data: existing } = await supabase
      .from('webhook_registrations')
      .select('id, webhook_id, is_active')
      .eq('company_id', company.id)
      .eq('provider', 'getlate')
      .maybeSingle();

    if (existing?.is_active && existing?.webhook_id) {
      console.log(`   Status: Already registered (webhook_id: ${existing.webhook_id})`);
      if (!sendTest) {
        console.log('   Skipping (use --test to send a test event)\n');
        continue;
      }
    }

    // Generate HMAC secret
    const secret = crypto.randomBytes(32).toString('hex');
    const webhookName = `longtale-${company.id.slice(0, 8)}`;

    if (dryRun) {
      console.log(`   [DRY RUN] Would register webhook "${webhookName}"`);
      console.log(`   [DRY RUN] Secret: ${secret.slice(0, 8)}...`);
      console.log('');
      continue;
    }

    // Register with GetLate API
    try {
      console.log(`   Registering webhook "${webhookName}"...`);
      const response = await fetch(`${GETLATE_API_URL}/webhooks/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GETLATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: webhookName,
          url: WEBHOOK_URL,
          secret: secret,
          events: WEBHOOK_EVENTS,
          profileId: company.getlate_profile_id,
        }),
      });

      const responseText = await response.text();
      let webhookId = null;

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          webhookId = data._id || data.id || data.webhookId || null;
          console.log(`   GetLate response: ${response.status} — webhook_id: ${webhookId || '(not returned)'}`);
        } catch {
          console.log(`   GetLate response: ${response.status} — ${responseText.slice(0, 200)}`);
        }
      } else {
        console.warn(`   GetLate registration failed: ${response.status} — ${responseText.slice(0, 200)}`);
        console.warn('   Storing secret locally anyway (can retry GetLate registration later)');
      }

      // Store in webhook_registrations
      const { error: upsertError } = await supabase
        .from('webhook_registrations')
        .upsert({
          company_id: company.id,
          provider: 'getlate',
          webhook_id: webhookId,
          secret: secret,
          events: WEBHOOK_EVENTS,
          is_active: true,
          consecutive_failures: 0,
        }, { onConflict: 'company_id,provider' });

      if (upsertError) {
        console.error(`   Failed to store registration: ${upsertError.message}`);
      } else {
        console.log(`   Stored in webhook_registrations`);
      }

      // Send test event if requested
      if (sendTest) {
        console.log('   Sending test event...');
        try {
          const testResponse = await fetch(`${GETLATE_API_URL}/webhooks/test`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GETLATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhookId: webhookId,
              profileId: company.getlate_profile_id,
            }),
          });

          const testText = await testResponse.text();
          console.log(`   Test event response: ${testResponse.status} — ${testText.slice(0, 200)}`);

          // Wait a moment for the webhook to be processed
          await new Promise(r => setTimeout(r, 2000));

          // Check webhook_event_log for the test event
          const { data: logs } = await supabase
            .from('webhook_event_log')
            .select('id, event_type, processing_status, created_at')
            .eq('company_id', company.id)
            .eq('event_type', 'webhook.test')
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0) {
            console.log(`   Test event received! Status: ${logs[0].processing_status} at ${logs[0].created_at}`);
          } else {
            console.warn('   Test event not found in webhook_event_log (may take a moment)');
          }
        } catch (testErr) {
          console.warn(`   Test event failed: ${testErr.message}`);
        }
      }

    } catch (err) {
      console.error(`   Registration error: ${err.message}`);
    }

    console.log('');
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
