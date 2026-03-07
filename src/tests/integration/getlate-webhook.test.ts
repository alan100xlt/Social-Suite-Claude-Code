/**
 * Integration tests for getlate-webhook edge function (RECEIVE path).
 * Tests against the real deployed edge function with HMAC verification.
 *
 * Run: npx vitest --config vitest.integration.config.ts src/tests/integration/getlate-webhook.test.ts
 */
import { describe, it, expect } from 'vitest';
import { supabaseUrl, adminClient } from './setup';

const FUNCTION_URL = `${supabaseUrl}/functions/v1/getlate-webhook`;

// ─── HMAC Helper (mirrors Web Crypto pattern from webhook-utils_test.ts) ────

async function computeHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Get the single webhook secret from DB ──────────────────

async function getWebhookSecret(): Promise<string> {
  const { data, error } = await adminClient
    .from('webhook_registrations')
    .select('secret')
    .eq('provider', 'getlate')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch webhook secret: ${error.message}`);
  if (!data?.secret) throw new Error('No active getlate webhook registration found');
  return data.secret;
}

describe('getlate-webhook edge function (receive path)', () => {
  it('rejects invalid HMAC signature with 401', async () => {
    const body = JSON.stringify({
      event: 'message.received',
      data: { profileId: 'fake', message: { text: 'test' } },
    });

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      },
      body,
    });

    expect(response.status).toBe(401);
  });

  it('accepts valid HMAC signature with 200', async () => {
    const secret = await getWebhookSecret();
    const body = JSON.stringify({
      event: 'message.received',
      data: {
        profileId: 'test-profile-id',
        message: {
          id: `test-hmac-valid-${Date.now()}`,
          text: 'integration test message',
          from: { id: 'sender-1', name: 'Test Sender' },
        },
      },
    });

    const signature = await computeHmac(body, secret);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // Should process (or skip due to unknown company) — not reject
    expect(data).toBeDefined();
  });

  it('processes request without signature header (discovery mode)', async () => {
    const body = JSON.stringify({
      event: 'message.received',
      data: {
        profileId: 'test-discovery',
        message: { id: `test-discovery-${Date.now()}`, text: 'discovery test' },
      },
    });

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    // Should return 200 (discovery mode — no sig = not rejected)
    expect(response.status).toBe(200);
  });

  it('handles unknown event type gracefully', async () => {
    const secret = await getWebhookSecret();
    const body = JSON.stringify({
      event: 'totally.unknown.event',
      data: { profileId: 'test-profile' },
    });

    const signature = await computeHmac(body, secret);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status || data.event).toBeDefined();
  });

  it('handles malformed JSON body', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json{{{',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reason).toBe('malformed_json');
  });

  it('handles duplicate event (idempotency)', async () => {
    const secret = await getWebhookSecret();
    const eventId = `test-dedup-${Date.now()}`;
    const body = JSON.stringify({
      event: 'message.received',
      eventId,
      data: {
        profileId: 'test-profile-dedup',
        message: { id: eventId, text: 'dedup test' },
      },
    });

    const signature = await computeHmac(body, secret);
    const headers = {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
    };

    // First request
    const first = await fetch(FUNCTION_URL, { method: 'POST', headers, body });
    expect(first.status).toBe(200);

    // Second request with same eventId
    const second = await fetch(FUNCTION_URL, { method: 'POST', headers, body });
    expect(second.status).toBe(200);
    const secondData = await second.json();
    // Should detect duplicate via eventId in webhook_event_log
    expect(secondData.reason).toBe('duplicate_event');
  });

  it('rejects non-POST methods', async () => {
    const response = await fetch(FUNCTION_URL, { method: 'GET' });
    expect(response.status).toBe(405);
  });

  it('HMAC fallback finds registration for any company (single-webhook model)', async () => {
    // The single webhook registration is anchored to DiarioJudio's company_id,
    // but events from OTHER companies should still verify via the fallback loop.
    const secret = await getWebhookSecret();
    const body = JSON.stringify({
      event: 'message.received',
      data: {
        // Use a profileId that does NOT match the anchor company
        profileId: 'nonexistent-profile-id-for-fallback-test',
        message: {
          id: `test-fallback-${Date.now()}`,
          text: 'fallback HMAC test',
          from: { id: 'fallback-sender', name: 'Fallback' },
        },
      },
    });

    const signature = await computeHmac(body, secret);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body,
    });

    // Should be 200 — the fallback loop should find the single registration's secret
    expect(response.status).toBe(200);
    const data = await response.json();
    // Won't be rejected as 401 — that's the key assertion
    expect(data).toBeDefined();
  });
});
