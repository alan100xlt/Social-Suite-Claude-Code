/**
 * Security tests for the deployed getlate-webhook edge function.
 * Tests HMAC verification, method restrictions, and CORS.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: deno test supabase/functions/_shared/webhook_security_test.ts --allow-net --allow-env --allow-read
 */
import {
  assertEquals,
  assert,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { loadSync } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

// Load .env.local without strict validation (unlike test-helpers.ts which requires all example vars)
try { loadSync({ envPath: '.env.local', allowEmptyValues: true, export: true }); } catch { /* ok */ }
try { loadSync({ envPath: '.env', allowEmptyValues: true, export: true }); } catch { /* ok */ }

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

function envReady(): boolean {
  return !!(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const WEBHOOK_URL = edgeFunctionUrl('getlate-webhook');

// Helper: compute HMAC-SHA256
async function hmacSign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Setup: ensure a webhook registration exists for testing ──

let testSecret: string;
let testCompanyId: string;

async function ensureTestRegistration(): Promise<void> {
  if (!envReady()) return;
  const admin = getAdminClient();

  // Find any company with a getlate_profile_id
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .not('getlate_profile_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!company) {
    console.warn('No company with getlate_profile_id found — some tests will skip');
    return;
  }

  testCompanyId = company.id;

  // Upsert a test webhook registration
  testSecret = 'test-webhook-secret-' + crypto.randomUUID().slice(0, 8);
  await admin.from('webhook_registrations').upsert({
    company_id: testCompanyId,
    provider: 'getlate',
    secret: testSecret,
    events: ['webhook.test'],
    is_active: true,
  }, { onConflict: 'company_id,provider' });
}

// ═══════════════════════════════════════════════════════════════

Deno.test({
  name: 'Security: GET request returns 405',
  ignore: !envReady(),
  async fn() {
    const resp = await fetch(WEBHOOK_URL, { method: 'GET' });
    assertEquals(resp.status, 405);
    await resp.body?.cancel();
  },
});

Deno.test({
  name: 'Security: OPTIONS returns CORS headers',
  ignore: !envReady(),
  async fn() {
    const resp = await fetch(WEBHOOK_URL, { method: 'OPTIONS' });
    assertEquals(resp.status, 200);
    assert(resp.headers.get('access-control-allow-origin') !== null);
    await resp.body?.cancel();
  },
});

Deno.test({
  name: 'Security: POST with no signature header — allowed (discovery mode) but logged',
  ignore: !envReady(),
  async fn() {
    const body = JSON.stringify({ event: 'webhook.test', data: {} });
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    // Should return 200 (no signature = discovery mode, not rejected)
    assertEquals(resp.status, 200);
    const json = await resp.json();
    assertEquals(json.success, true);
  },
});

Deno.test({
  name: 'Security: POST with invalid signature returns 401',
  ignore: !envReady(),
  async fn() {
    await ensureTestRegistration();
    if (!testCompanyId) return;

    const admin = getAdminClient();
    const { data: company } = await admin
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', testCompanyId)
      .single();

    const body = JSON.stringify({
      event: 'webhook.test',
      data: { profileId: company?.getlate_profile_id },
    });

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      },
      body,
    });
    assertEquals(resp.status, 401);
    await resp.body?.cancel();
  },
});

Deno.test({
  name: 'Security: POST with tampered payload returns 401',
  ignore: !envReady(),
  async fn() {
    await ensureTestRegistration();
    if (!testCompanyId) return;

    const admin = getAdminClient();
    const { data: company } = await admin
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', testCompanyId)
      .single();

    const originalBody = JSON.stringify({
      event: 'webhook.test',
      data: { profileId: company?.getlate_profile_id },
    });

    // Sign the original body
    const sig = await hmacSign(originalBody, testSecret);

    // Send a tampered body with the original signature
    const tamperedBody = JSON.stringify({
      event: 'webhook.test',
      data: { profileId: company?.getlate_profile_id, injected: true },
    });

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': sig,
      },
      body: tamperedBody,
    });
    assertEquals(resp.status, 401);
    await resp.body?.cancel();
  },
});

Deno.test({
  name: 'Security: POST with valid HMAC + webhook.test returns 200',
  ignore: !envReady(),
  async fn() {
    await ensureTestRegistration();
    if (!testCompanyId) return;

    const admin = getAdminClient();
    const { data: company } = await admin
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', testCompanyId)
      .single();

    const body = JSON.stringify({
      event: 'webhook.test',
      eventId: `test-${Date.now()}`,
      data: { profileId: company?.getlate_profile_id },
    });

    const sig = await hmacSign(body, testSecret);

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': sig,
      },
      body,
    });
    assertEquals(resp.status, 200);
    const json = await resp.json();
    assertEquals(json.success, true);
  },
});

Deno.test({
  name: 'Security: malformed JSON returns 200 (not 500) to prevent auto-disable',
  ignore: !envReady(),
  async fn() {
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json {{{',
    });
    assertEquals(resp.status, 200);
    const json = await resp.json();
    assertEquals(json.ignored, true);
  },
});

Deno.test({
  name: 'Security: duplicate eventId is ignored (idempotency)',
  ignore: !envReady(),
  async fn() {
    await ensureTestRegistration();
    if (!testCompanyId) return;

    const eventId = `dedup-test-${Date.now()}`;
    const body = JSON.stringify({
      event: 'webhook.test',
      eventId,
      data: {},
    });

    // First request (no signature = discovery mode)
    const resp1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assertEquals(resp1.status, 200);
    await resp1.json();

    // Second request with same eventId
    const resp2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assertEquals(resp2.status, 200);
    const json2 = await resp2.json();
    assertEquals(json2.ignored, true);
    assertEquals(json2.reason, 'duplicate_event');
  },
});

// ─── Cleanup ─────────────────────────────────────────────────

// Note: test webhook registration is left in place (upsert = idempotent).
// The test secret changes each run so old registrations are overwritten.
