/**
 * Unit tests for webhook-utils.ts — pure functions, no DB needed.
 * Run: deno test supabase/functions/getlate-webhook/webhook-utils_test.ts
 */
import {
  assertEquals,
  assertNotEquals,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  verifyHmacSignature,
  isTimestampValid,
  extractField,
  normalizePayload,
  routeEventType,
  findSignatureHeader,
} from './webhook-utils.ts';

// ─── Helper: compute a valid HMAC for test payloads ─────────

async function computeHmac(body: string, secret: string): Promise<string> {
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

// ═══════════════════════════════════════════════════════════════
// HMAC Verification
// ═══════════════════════════════════════════════════════════════

Deno.test('HMAC: valid signature passes', async () => {
  const body = '{"event":"message.received"}';
  const secret = 'test-secret-key-123';
  const sig = await computeHmac(body, secret);
  assertEquals(await verifyHmacSignature(body, sig, secret), true);
});

Deno.test('HMAC: valid signature with sha256= prefix passes', async () => {
  const body = '{"event":"message.received"}';
  const secret = 'test-secret-key-123';
  const sig = await computeHmac(body, secret);
  assertEquals(await verifyHmacSignature(body, `sha256=${sig}`, secret), true);
});

Deno.test('HMAC: invalid signature rejected', async () => {
  const body = '{"event":"message.received"}';
  const secret = 'test-secret-key-123';
  assertEquals(await verifyHmacSignature(body, 'deadbeef'.repeat(8), secret), false);
});

Deno.test('HMAC: null signature rejected', async () => {
  const body = '{"event":"message.received"}';
  assertEquals(await verifyHmacSignature(body, null, 'secret'), false);
});

Deno.test('HMAC: empty signature rejected', async () => {
  const body = '{"event":"message.received"}';
  assertEquals(await verifyHmacSignature(body, '', 'secret'), false);
});

Deno.test('HMAC: empty secret rejected', async () => {
  const body = '{"event":"message.received"}';
  assertEquals(await verifyHmacSignature(body, 'some-sig', ''), false);
});

Deno.test('HMAC: tampered body fails', async () => {
  const body = '{"event":"message.received"}';
  const secret = 'test-secret-key-123';
  const sig = await computeHmac(body, secret);
  // Tamper with body
  const tampered = '{"event":"message.received","hacked":true}';
  assertEquals(await verifyHmacSignature(tampered, sig, secret), false);
});

Deno.test('HMAC: wrong secret fails', async () => {
  const body = '{"event":"message.received"}';
  const sig = await computeHmac(body, 'correct-secret');
  assertEquals(await verifyHmacSignature(body, sig, 'wrong-secret'), false);
});

Deno.test('HMAC: signature length mismatch rejected', async () => {
  const body = '{"event":"test"}';
  assertEquals(await verifyHmacSignature(body, 'short', 'secret'), false);
});

// ═══════════════════════════════════════════════════════════════
// Timestamp Validation
// ═══════════════════════════════════════════════════════════════

Deno.test('Timestamp: null timestamp is valid (no replay protection)', () => {
  assertEquals(isTimestampValid(null), true);
  assertEquals(isTimestampValid(undefined), true);
});

Deno.test('Timestamp: recent ISO timestamp is valid', () => {
  const recent = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
  assertEquals(isTimestampValid(recent), true);
});

Deno.test('Timestamp: stale ISO timestamp is rejected', () => {
  const stale = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 min ago
  assertEquals(isTimestampValid(stale), false);
});

Deno.test('Timestamp: recent unix seconds is valid', () => {
  const unix = String(Math.floor(Date.now() / 1000) - 30); // 30s ago
  assertEquals(isTimestampValid(unix), true);
});

Deno.test('Timestamp: stale unix seconds is rejected', () => {
  const unix = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
  assertEquals(isTimestampValid(unix), false);
});

Deno.test('Timestamp: garbage string is rejected', () => {
  assertEquals(isTimestampValid('not-a-date'), false);
});

Deno.test('Timestamp: custom maxAge respected', () => {
  const recent = new Date(Date.now() - 2_000).toISOString(); // 2s ago
  assertEquals(isTimestampValid(recent, 1_000), false); // 1s max
  assertEquals(isTimestampValid(recent, 5_000), true);   // 5s max
});

// ═══════════════════════════════════════════════════════════════
// Field Extraction
// ═══════════════════════════════════════════════════════════════

Deno.test('extractField: first path found wins', () => {
  const obj = { a: 1, b: 2 };
  assertEquals(extractField(obj, 'a', 'b'), 1);
});

Deno.test('extractField: falls through to second path', () => {
  const obj = { b: 2 };
  assertEquals(extractField(obj, 'a', 'b'), 2);
});

Deno.test('extractField: nested path works', () => {
  const obj = { data: { profileId: 'abc' } };
  assertEquals(extractField(obj, 'data.profileId'), 'abc');
});

Deno.test('extractField: returns undefined for missing paths', () => {
  assertEquals(extractField({}, 'a', 'b', 'c'), undefined);
});

Deno.test('extractField: skips null intermediate objects', () => {
  const obj = { data: null };
  assertEquals(extractField(obj as any, 'data.profileId', 'fallback'), undefined);
});

// ═══════════════════════════════════════════════════════════════
// Payload Normalization
// ═══════════════════════════════════════════════════════════════

Deno.test('normalizePayload: standard fields extracted', () => {
  const raw = {
    eventId: 'evt-123',
    timestamp: '2026-03-06T12:00:00Z',
    data: { profileId: 'prof-456', platform: 'facebook', text: 'hello' },
  };
  const result = normalizePayload(raw, 'message.received');
  assertEquals(result.eventType, 'message.received');
  assertEquals(result.eventId, 'evt-123');
  assertEquals(result.profileId, 'prof-456');
  assertEquals(result.platform, 'facebook');
});

Deno.test('normalizePayload: alternative field names', () => {
  const raw = {
    event_id: 'evt-alt',
    created_at: '2026-03-06T12:00:00Z',
    data: { profile: 'prof-alt' },
  };
  const result = normalizePayload(raw, 'comment.received');
  assertEquals(result.eventId, 'evt-alt');
  assertEquals(result.profileId, 'prof-alt');
});

Deno.test('normalizePayload: missing data uses raw as data', () => {
  const raw = { eventId: 'x', text: 'hi' };
  const result = normalizePayload(raw, 'message.received');
  assertEquals(result.data, raw);
});

Deno.test('normalizePayload: null/missing fields return null', () => {
  const result = normalizePayload({}, 'unknown');
  assertEquals(result.eventId, null);
  assertEquals(result.profileId, null);
  assertEquals(result.platform, null);
  assertEquals(result.timestamp, null);
});

// ═══════════════════════════════════════════════════════════════
// Event Routing
// ═══════════════════════════════════════════════════════════════

Deno.test('routeEventType: message.received routes correctly', () => {
  assertEquals(routeEventType('message.received'), 'handleMessageReceived');
});

Deno.test('routeEventType: message.new is an alias for message.received', () => {
  assertEquals(routeEventType('message.new'), 'handleMessageReceived');
});

Deno.test('routeEventType: comment.received routes correctly', () => {
  assertEquals(routeEventType('comment.received'), 'handleCommentReceived');
});

Deno.test('routeEventType: post.failed routes correctly', () => {
  assertEquals(routeEventType('post.failed'), 'handlePostFailed');
});

Deno.test('routeEventType: post.partial routes correctly', () => {
  assertEquals(routeEventType('post.partial'), 'handlePostPartial');
});

Deno.test('routeEventType: account.disconnected routes correctly', () => {
  assertEquals(routeEventType('account.disconnected'), 'handleAccountDisconnected');
});

Deno.test('routeEventType: webhook.test routes correctly', () => {
  assertEquals(routeEventType('webhook.test'), 'handleWebhookTest');
});

Deno.test('routeEventType: unknown event returns null', () => {
  assertEquals(routeEventType('some.random.event'), null);
  assertEquals(routeEventType(''), null);
});

// ═══════════════════════════════════════════════════════════════
// Signature Header Detection
// ═══════════════════════════════════════════════════════════════

Deno.test('findSignatureHeader: finds x-webhook-signature', () => {
  const headers = new Headers({ 'x-webhook-signature': 'abc123' });
  assertEquals(findSignatureHeader(headers), 'abc123');
});

Deno.test('findSignatureHeader: finds x-getlate-signature', () => {
  const headers = new Headers({ 'x-getlate-signature': 'def456' });
  assertEquals(findSignatureHeader(headers), 'def456');
});

Deno.test('findSignatureHeader: finds x-hub-signature-256', () => {
  const headers = new Headers({ 'x-hub-signature-256': 'sha256=ghi789' });
  assertEquals(findSignatureHeader(headers), 'sha256=ghi789');
});

Deno.test('findSignatureHeader: returns null when no signature header', () => {
  const headers = new Headers({ 'content-type': 'application/json' });
  assertEquals(findSignatureHeader(headers), null);
});

Deno.test('findSignatureHeader: prefers first match (x-webhook-signature)', () => {
  const headers = new Headers({
    'x-webhook-signature': 'first',
    'x-getlate-signature': 'second',
  });
  assertEquals(findSignatureHeader(headers), 'first');
});
