/**
 * Pure utility functions for webhook processing.
 * No DB dependencies — fully unit-testable.
 */

// ─── HMAC-SHA256 Verification ────────────────────────────────

export async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody)
  );

  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Strip optional "sha256=" prefix
  const expected = signatureHeader.replace(/^sha256=/, '');

  // Constant-time comparison
  if (computed.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Timestamp / Replay Protection ──────────────────────────

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function isTimestampValid(
  timestamp: string | null | undefined,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): boolean {
  if (!timestamp) return true; // No timestamp = no replay protection enforced
  const ts = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  if (isNaN(ts)) {
    // Try as unix seconds
    const unix = Number(timestamp);
    if (isNaN(unix)) return false;
    const diff = Math.abs(Date.now() - unix * 1000);
    return diff <= maxAgeMs;
  }
  const diff = Math.abs(Date.now() - ts);
  return diff <= maxAgeMs;
}

// ─── Flexible Field Extraction ──────────────────────────────

export function extractField(obj: Record<string, unknown>, ...paths: string[]): unknown {
  for (const path of paths) {
    const parts = path.split('.');
    let current: unknown = obj;
    let found = true;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        found = false;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (found && current !== undefined && current !== null) {
      return current;
    }
  }
  return undefined;
}

// ─── Payload Normalization ──────────────────────────────────

export interface NormalizedPayload {
  eventType: string;
  eventId: string | null;
  timestamp: string | null;
  profileId: string | null;
  platform: string | null;
  data: Record<string, unknown>;
}

export function normalizePayload(
  raw: Record<string, unknown>,
  eventType: string
): NormalizedPayload {
  return {
    eventType,
    eventId: (extractField(raw, 'eventId', 'event_id', 'id') as string) || null,
    timestamp: (extractField(raw, 'timestamp', 'created_at', 'createdAt') as string) || null,
    profileId: (extractField(raw, 'data.profileId', 'data.profile', 'data.accountId', 'profileId') as string) || null,
    platform: (extractField(raw, 'data.platform', 'platform') as string) || null,
    data: (typeof raw.data === 'object' && raw.data !== null ? raw.data : raw) as Record<string, unknown>,
  };
}

// ─── Event Routing ──────────────────────────────────────────

export type EventHandlerName =
  | 'handleMessageReceived'
  | 'handleCommentReceived'
  | 'handlePostFailed'
  | 'handlePostPartial'
  | 'handleAccountDisconnected'
  | 'handleWebhookTest';

const EVENT_ROUTES: Record<string, EventHandlerName> = {
  'message.received': 'handleMessageReceived',
  'message.new': 'handleMessageReceived',
  'comment.received': 'handleCommentReceived',
  'comment.new': 'handleCommentReceived',
  'post.failed': 'handlePostFailed',
  'post.partial': 'handlePostPartial',
  'account.disconnected': 'handleAccountDisconnected',
  'webhook.test': 'handleWebhookTest',
};

export function routeEventType(eventType: string): EventHandlerName | null {
  return EVENT_ROUTES[eventType] || null;
}

// ─── Signature Header Detection ─────────────────────────────

const SIGNATURE_HEADERS = [
  'x-webhook-signature',
  'x-getlate-signature',
  'x-hub-signature-256',
  'x-signature',
];

export function findSignatureHeader(headers: Headers): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}
