import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';

/**
 * Cron Dispatcher — replaces the SQL dispatch_company_sync() function.
 *
 * Called by pg_cron to fan out sync jobs per company. Uses its own
 * auto-injected SUPABASE_SERVICE_ROLE_KEY to call target edge functions,
 * eliminating the vault as a secret store for auth keys.
 *
 * Usage (from pg_cron):
 *   SELECT net.http_post(
 *     url := '<supabase_url>/functions/v1/cron-dispatcher',
 *     headers := '{"Content-Type":"application/json"}'::jsonb,
 *     body := '{"function":"inbox-sync"}'::jsonb
 *   );
 *
 * The function queries companies with getlate_profile_id and fires
 * one HTTP request per company to the target edge function.
 */

const ALLOWED_FUNCTIONS = [
  'inbox-sync',
  'analytics-sync',
  'rss-poll',
  'getlate-changelog-monitor',
  'cron-escalation',
  'evergreen-recycler',
  'performance-alerts',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // No custom auth — this function has verify_jwt=false and is only
  // callable from pg_cron (internal Supabase network). The function
  // whitelist below prevents abuse.

  let body: { function?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const functionName = body.function;
  if (!functionName || !ALLOWED_FUNCTIONS.includes(functionName)) {
    return new Response(
      JSON.stringify({ error: `Invalid function: ${functionName}. Allowed: ${ALLOWED_FUNCTIONS.join(', ')}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Query companies that need syncing
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fan-out functions need per-company dispatch
  const fanOutFunctions = ['inbox-sync', 'analytics-sync'];

  if (fanOutFunctions.includes(functionName)) {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id')
      .not('getlate_profile_id', 'is', null);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fire one request per company (non-blocking)
    const dispatches = (companies || []).map((company) =>
      fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        signal: AbortSignal.timeout(55_000),
        body: JSON.stringify({ companyId: company.id }),
      }).catch((err) => {
        console.error(`Dispatch to ${functionName} for ${company.id} failed:`, err);
        return null;
      })
    );

    // Wait for all dispatches (they run concurrently)
    const results = await Promise.allSettled(dispatches);
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value?.ok).length;
    const failed = results.length - succeeded;

    return new Response(
      JSON.stringify({
        success: true,
        function: functionName,
        companies_dispatched: companies?.length || 0,
        succeeded,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Single-invocation functions (rss-poll, changelog-monitor, cron-escalation)
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({}),
    });

    return new Response(
      JSON.stringify({
        success: resp.ok,
        function: functionName,
        status: resp.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, function: functionName, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
