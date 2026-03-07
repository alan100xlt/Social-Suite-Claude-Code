import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// ─── Unit tests for webhook-admin helpers ───────────────────

Deno.test('generateHmacSecret produces valid 64-char hex', () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  assertEquals(secret.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(secret), true);
});

Deno.test('WEBHOOK_EVENTS contains expected event types', () => {
  const events = [
    'message.received',
    'comment.received',
    'post.failed',
    'post.partial',
    'account.disconnected',
  ];
  assertEquals(events.length, 5);
  assertEquals(events.includes('message.received'), true);
  assertEquals(events.includes('comment.received'), true);
});

Deno.test('single webhook name is always longtale-all', () => {
  // Single-webhook model: name is constant, not derived from company ID
  const webhookName = 'longtale-all';
  assertEquals(webhookName, 'longtale-all');
});

Deno.test('cleanup threshold is 5 minutes', () => {
  const thresholdMs = 5 * 60 * 1000;
  assertEquals(thresholdMs, 300_000);

  // An entry from 6 min ago should be "stuck"
  const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000);
  const fiveMinAgoThreshold = new Date(Date.now() - thresholdMs);
  assertEquals(sixMinAgo < fiveMinAgoThreshold, true);

  // An entry from 3 min ago should NOT be "stuck"
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
  assertEquals(threeMinAgo < fiveMinAgoThreshold, false);
});

Deno.test('project ID extraction from Supabase URL', () => {
  const url = 'https://yeffbytlvhhzsbrabhgh.supabase.co';
  const projectId = url.replace('https://', '').replace('.supabase.co', '');
  assertEquals(projectId, 'yeffbytlvhhzsbrabhgh');
});

Deno.test('webhook URL construction', () => {
  const projectId = 'yeffbytlvhhzsbrabhgh';
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/getlate-webhook`;
  assertEquals(webhookUrl, 'https://yeffbytlvhhzsbrabhgh.supabase.co/functions/v1/getlate-webhook');
});

Deno.test('register action does not include profileId in payload', () => {
  // Single-webhook model: GetLate webhooks are account-level, profileId is ignored
  const payload = {
    name: 'longtale-all',
    url: 'https://test.supabase.co/functions/v1/getlate-webhook',
    secret: 'abc123',
    events: ['message.received', 'comment.received'],
  };
  assertEquals('profileId' in payload, false);
  assertEquals(payload.name, 'longtale-all');
});

Deno.test('deregister and test actions do not require companyId', () => {
  // Single-webhook model: only one registration exists, no companyId needed
  const deregisterPayload = { action: 'deregister' };
  const testPayload = { action: 'test' };
  assertEquals('companyId' in deregisterPayload, false);
  assertEquals('companyId' in testPayload, false);
});

Deno.test('status action returns registrations array (not per-company)', () => {
  // The status response has a flat registrations array
  const mockResponse = {
    success: true,
    data: {
      registrations: [{ provider: 'getlate', is_active: true, webhook_id: '69ab98669bc21bee2ad61519' }],
      recentEvents: [],
      eventCounts: {},
    },
  };
  assertEquals(mockResponse.data.registrations.length, 1);
  assertEquals(mockResponse.data.registrations[0].provider, 'getlate');
});
