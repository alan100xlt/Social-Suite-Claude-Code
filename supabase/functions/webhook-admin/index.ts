import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const WEBHOOK_EVENTS = [
  'message.received',
  'comment.received',
  'post.failed',
  'post.partial',
  'account.disconnected',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorize(req, { superadminOnly: true });
  } catch (authError) {
    if (authError instanceof Response) return authError;
    throw authError;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/getlate-webhook`;

  const { action } = await req.json();

  try {
    switch (action) {
      case 'register':
        return json(await handleRegister(supabase, webhookUrl));

      case 'status':
        return json(await handleStatus(supabase));

      case 'deregister':
        return json(await handleDeregister(supabase));

      case 'test':
        return json(await handleTest(supabase));

      case 'cleanup-stuck-cron':
        return json(await handleCleanupStuckCron(supabase));

      default:
        return json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: message }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateHmacSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function getGetlateApiKey(): Promise<string> {
  const key = Deno.env.get('GETLATE_API_KEY');
  if (!key) throw new Error('GETLATE_API_KEY not configured in Supabase Secrets');
  return key;
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Register a single account-level webhook on GetLate.
 * GetLate webhooks are account-level — profileId is ignored.
 * We maintain exactly ONE webhook named 'longtale-all'.
 */
async function handleRegister(
  supabase: ReturnType<typeof createClient>,
  webhookUrl: string,
) {
  // Check if we already have an active getlate registration
  const { data: existing } = await supabase
    .from('webhook_registrations')
    .select('id, webhook_id, is_active, company_id')
    .eq('provider', 'getlate')
    .eq('is_active', true)
    .maybeSingle();

  if (existing?.webhook_id) {
    return {
      success: true,
      data: {
        status: 'already_active',
        webhookId: existing.webhook_id,
        anchorCompanyId: existing.company_id,
      },
    };
  }

  const apiKey = await getGetlateApiKey();
  const secret = generateHmacSecret();

  // Find an anchor company (first company with getlate_profile_id)
  const { data: anchor, error: anchorErr } = await supabase
    .from('companies')
    .select('id')
    .not('getlate_profile_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (anchorErr) throw new Error(`Failed to find anchor company: ${anchorErr.message}`);
  if (!anchor) throw new Error('No company with getlate_profile_id found');

  let webhookId: string | null = null;
  let registrationStatus = 'registered';

  try {
    const response = await fetch(`${GETLATE_API_URL}/webhooks/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'longtale-all',
        url: webhookUrl,
        secret,
        events: WEBHOOK_EVENTS,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      const data = await response.json();
      webhookId = data.webhook?._id || data._id || data.id || data.webhookId || null;
    } else {
      const text = await response.text();
      registrationStatus = `getlate_failed (${response.status}: ${text.slice(0, 200)})`;
    }
  } catch (fetchErr) {
    registrationStatus = `getlate_error (${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)})`;
  }

  const { error: upsertError } = await supabase
    .from('webhook_registrations')
    .upsert({
      company_id: anchor.id,
      provider: 'getlate',
      webhook_id: webhookId,
      secret,
      events: WEBHOOK_EVENTS,
      is_active: true,
      consecutive_failures: 0,
    }, { onConflict: 'company_id,provider' });

  if (upsertError) throw new Error(`Failed to store registration: ${upsertError.message}`);

  return { success: true, data: { status: registrationStatus, webhookId, anchorCompanyId: anchor.id } };
}

async function handleStatus(supabase: ReturnType<typeof createClient>) {
  const { data: registrations, error: regError } = await supabase
    .from('webhook_registrations')
    .select('company_id, provider, webhook_id, is_active, consecutive_failures, created_at, updated_at');

  if (regError) throw new Error(`Failed to fetch registrations: ${regError.message}`);

  // Recent webhook events
  const { data: recentEvents, error: eventError } = await supabase
    .from('webhook_event_log')
    .select('id, event_type, processing_status, company_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (eventError) throw new Error(`Failed to fetch events: ${eventError.message}`);

  // Event counts per company
  const { data: eventCounts } = await supabase
    .from('webhook_event_log')
    .select('company_id, processing_status');

  const countsByCompany: Record<string, { total: number; processed: number; failed: number }> = {};
  if (eventCounts) {
    for (const e of eventCounts) {
      if (!countsByCompany[e.company_id]) countsByCompany[e.company_id] = { total: 0, processed: 0, failed: 0 };
      countsByCompany[e.company_id].total++;
      if (e.processing_status === 'processed') countsByCompany[e.company_id].processed++;
      if (e.processing_status === 'failed') countsByCompany[e.company_id].failed++;
    }
  }

  return {
    success: true,
    data: {
      registrations: registrations || [],
      recentEvents: recentEvents || [],
      eventCounts: countsByCompany,
    },
  };
}

/**
 * Deactivate the single GetLate webhook.
 * Sets is_active = false on the single registration row.
 */
async function handleDeregister(supabase: ReturnType<typeof createClient>) {
  const { data: reg, error: findErr } = await supabase
    .from('webhook_registrations')
    .select('id, webhook_id, company_id')
    .eq('provider', 'getlate')
    .maybeSingle();

  if (findErr) throw new Error(`Failed to find registration: ${findErr.message}`);
  if (!reg) return { success: true, data: { status: 'no_registration_found' } };

  // Deactivate on GetLate API if we have a webhook ID
  if (reg.webhook_id) {
    try {
      const apiKey = await getGetlateApiKey();
      await fetch(`${GETLATE_API_URL}/webhooks/settings/${reg.webhook_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // Best-effort — still deactivate locally
    }
  }

  const { error } = await supabase
    .from('webhook_registrations')
    .update({ is_active: false })
    .eq('provider', 'getlate');

  if (error) throw new Error(`Failed to deregister: ${error.message}`);

  return { success: true, data: { status: 'deactivated', webhookId: reg.webhook_id } };
}

/**
 * Send a test event through the single GetLate webhook.
 */
async function handleTest(supabase: ReturnType<typeof createClient>) {
  const apiKey = await getGetlateApiKey();

  const { data: reg, error: regError } = await supabase
    .from('webhook_registrations')
    .select('webhook_id')
    .eq('provider', 'getlate')
    .eq('is_active', true)
    .maybeSingle();

  if (regError) throw new Error(`Failed to fetch registration: ${regError.message}`);
  if (!reg?.webhook_id) throw new Error('No active webhook registration found');

  const response = await fetch(`${GETLATE_API_URL}/webhooks/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhookId: reg.webhook_id }),
    signal: AbortSignal.timeout(15_000),
  });

  const responseText = await response.text();

  return {
    success: response.ok,
    data: {
      status: response.status,
      response: responseText.slice(0, 500),
    },
  };
}

async function handleCleanupStuckCron(supabase: ReturnType<typeof createClient>) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Find stuck entries
  const { data: stuck, error: findErr } = await supabase
    .from('cron_health_logs')
    .select('id, job_name, started_at')
    .eq('status', 'running')
    .lt('started_at', fiveMinAgo);

  if (findErr) throw new Error(`Failed to find stuck entries: ${findErr.message}`);

  if (!stuck?.length) {
    return { success: true, data: { cleaned: 0, message: 'No stuck entries found' } };
  }

  // Update them to error
  const { error: updateErr } = await supabase
    .from('cron_health_logs')
    .update({
      status: 'error',
      completed_at: new Date().toISOString(),
      error_message: 'Marked as failed: function timed out without completing (orphaned running entry)',
    })
    .eq('status', 'running')
    .lt('started_at', fiveMinAgo);

  if (updateErr) throw new Error(`Failed to update stuck entries: ${updateErr.message}`);

  const entries = stuck.map((s) => ({
    id: s.id,
    job_name: s.job_name,
    minutes_ago: Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000),
  }));

  return { success: true, data: { cleaned: stuck.length, entries } };
}
