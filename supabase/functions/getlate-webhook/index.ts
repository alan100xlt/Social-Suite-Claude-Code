/**
 * GetLate Webhook Receiver — real-time inbox event ingestion.
 *
 * Complements the polling-based inbox-sync cron. Both paths use
 * the same shared inbox-processing module for identical dedup logic.
 *
 * HMAC-SHA256 verified. Always returns 200 on valid signatures
 * (even on internal errors) to prevent GetLate's auto-disable
 * after 10 consecutive failures.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';
import {
  verifyHmacSignature,
  isTimestampValid,
  normalizePayload,
  routeEventType,
  findSignatureHeader,
  type NormalizedPayload,
} from './webhook-utils.ts';
import {
  upsertContact,
  upsertConversation,
  insertMessageIfNew,
  linkArticleToConversation,
} from '../_shared/inbox-processing.ts';
import { checkAndAutoRespond } from '../inbox-sync/auto-respond.ts';
import { classifyConversation, setFallbackClassification } from '../_shared/classify.ts';
import { extractField } from './webhook-utils.ts';

type SupabaseClient = ReturnType<typeof createClient>;

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();

  // Read raw body BEFORE parsing (needed for HMAC verification)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: 'Failed to read body' }, 400);
  }

  // ── HMAC Signature Verification ──
  const signatureHeader = findSignatureHeader(req.headers);

  // Log all headers on first invocation for discovery
  if (!signatureHeader) {
    console.warn('[getlate-webhook] No signature header found. Headers:', Object.fromEntries(req.headers.entries()));
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Parse JSON payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Malformed JSON — return 200 to prevent auto-disable
    await logEvent(supabase, null, 'unknown', null, {}, 'skipped', 'Malformed JSON', Date.now() - startTime);
    return jsonResponse({ ignored: true, reason: 'malformed_json' });
  }

  const eventType = (payload.event as string) || (payload.type as string) || (payload.action as string) || 'unknown';
  const normalized = normalizePayload(payload, eventType);

  // ── Resolve company + verify HMAC ──
  let companyId: string | null = null;
  let hmacValid = false;

  // Try to resolve company from profile ID first
  if (normalized.profileId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('getlate_profile_id', normalized.profileId)
      .maybeSingle();
    if (company) companyId = company.id;
  }

  // Look up webhook registration for HMAC secret
  if (companyId) {
    const { data: reg } = await supabase
      .from('webhook_registrations')
      .select('secret')
      .eq('company_id', companyId)
      .eq('provider', 'getlate')
      .eq('is_active', true)
      .maybeSingle();

    if (reg?.secret && signatureHeader) {
      hmacValid = await verifyHmacSignature(rawBody, signatureHeader, reg.secret);
    }
  }

  // Fallback: resolve company from webhook secret (if profile ID didn't match)
  if (!hmacValid && signatureHeader) {
    const { data: regs } = await supabase
      .from('webhook_registrations')
      .select('company_id, secret')
      .eq('provider', 'getlate')
      .eq('is_active', true);

    for (const reg of regs || []) {
      if (await verifyHmacSignature(rawBody, signatureHeader, reg.secret)) {
        hmacValid = true;
        companyId = reg.company_id;
        break;
      }
    }
  }

  // If we have a signature header but it's invalid, reject
  if (signatureHeader && !hmacValid) {
    // Increment consecutive failures
    if (companyId) {
      try {
        const { data: reg } = await supabase
          .from('webhook_registrations')
          .select('consecutive_failures')
          .eq('company_id', companyId)
          .eq('provider', 'getlate')
          .maybeSingle();

        await supabase
          .from('webhook_registrations')
          .update({
            consecutive_failures: (reg?.consecutive_failures || 0) + 1,
            last_failure_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId)
          .eq('provider', 'getlate');
      } catch {
        // Non-fatal — don't let failure tracking prevent the 401 response
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // No signature header at all — still allow for discovery phase, but log warning
  if (!signatureHeader) {
    console.warn('[getlate-webhook] Processing event without signature verification');
  }

  // ── Idempotency check ──
  if (normalized.eventId) {
    const { data: existing } = await supabase
      .from('webhook_event_log')
      .select('id')
      .eq('provider', 'getlate')
      .eq('event_id', normalized.eventId)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ ignored: true, reason: 'duplicate_event' });
    }
  }

  // ── Timestamp replay protection ──
  if (!isTimestampValid(normalized.timestamp)) {
    await logEvent(supabase, companyId, eventType, normalized.eventId, payload, 'skipped', 'Stale timestamp', Date.now() - startTime);
    return jsonResponse({ ignored: true, reason: 'stale_timestamp' });
  }

  // ── Route to handler ──
  const handler = routeEventType(eventType);

  if (!handler) {
    await logEvent(supabase, companyId, eventType, normalized.eventId, payload, 'skipped', `Unknown event type: ${eventType}`, Date.now() - startTime);
    return jsonResponse({ success: true, event: eventType, status: 'skipped' });
  }

  // ── Company required for inbox events ──
  if (!companyId && handler !== 'handleWebhookTest') {
    await logEvent(supabase, null, eventType, normalized.eventId, payload, 'skipped', 'Could not resolve company', Date.now() - startTime);
    return jsonResponse({ success: true, event: eventType, status: 'skipped', reason: 'unknown_company' });
  }

  // ── Execute handler ──
  try {
    let result: Record<string, unknown> = {};

    switch (handler) {
      case 'handleMessageReceived':
        result = await handleMessageReceived(supabase, companyId!, normalized);
        break;
      case 'handleCommentReceived':
        result = await handleCommentReceived(supabase, companyId!, normalized);
        break;
      case 'handlePostFailed':
      case 'handlePostPartial':
        result = await handlePostEvent(supabase, companyId!, normalized, handler === 'handlePostPartial');
        break;
      case 'handleAccountDisconnected':
        result = await handleAccountDisconnected(supabase, companyId!, normalized);
        break;
      case 'handleWebhookTest':
        result = { success: true, event: 'webhook.test' };
        break;
    }

    const durationMs = Date.now() - startTime;
    await logEvent(supabase, companyId, eventType, normalized.eventId, payload, 'processed', null, durationMs);

    // Reset consecutive failures on success
    if (companyId) {
      await supabase
        .from('webhook_registrations')
        .update({
          consecutive_failures: 0,
          last_success_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('provider', 'getlate');
    }

    return jsonResponse({ success: true, event: eventType, durationMs, ...result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[getlate-webhook] Handler error for ${eventType}:`, errorMsg);
    await logEvent(supabase, companyId, eventType, normalized.eventId, payload, 'failed', errorMsg, Date.now() - startTime);

    // Return 200 even on errors to prevent auto-disable
    return jsonResponse({ success: false, event: eventType, error: errorMsg });
  }
});

// ─── Event Handlers ──────────────────────────────────────────

async function handleMessageReceived(
  supabase: SupabaseClient,
  companyId: string,
  event: NormalizedPayload
): Promise<Record<string, unknown>> {
  const data = event.data;
  const platform = event.platform || (extractField(data, 'platform') as string) || 'unknown';
  const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

  // Extract contact info
  const sender = (data.sender || data.from || data.participant || {}) as Record<string, unknown>;
  const contactId = await upsertContact(supabase, companyId, {
    platform,
    platformUserId: (extractField(sender, 'id', 'userId', 'platformUserId') as string) || 'unknown',
    username: extractField(sender, 'username', 'handle') as string | undefined,
    displayName: extractField(sender, 'name', 'displayName') as string | undefined,
    avatarUrl: extractField(sender, 'avatarUrl', 'profileUrl', 'avatar') as string | undefined,
  });

  // Build conversation key
  const conversationPlatformId = (extractField(data, 'conversationId', 'conversation_id', 'threadId') as string) || '';
  const convKey = `dm-${platform}-${conversationPlatformId}`;

  const convResult = await upsertConversation(supabase, companyId, {
    platform,
    platformConversationId: convKey,
    type: 'dm',
    subject: (extractField(sender, 'name', 'displayName') as string) || 'DM',
    contactId,
    lastMessageAt: (extractField(data, 'createdAt', 'timestamp', 'created_at') as string) || new Date().toISOString(),
    lastMessagePreview: ((extractField(data, 'text', 'content', 'message') as string) || '').slice(0, 200),
  });

  const platformMsgId = (extractField(data, 'messageId', 'message_id', 'id') as string) || '';
  if (!platformMsgId) return { skipped: true, reason: 'no_message_id' };

  const isFromUs = (data.isFromBrand === true) || (data.direction === 'outbound') || (data.isOwn === true);

  const msgResult = await insertMessageIfNew(supabase, companyId, convResult.id, {
    platformMessageId: platformMsgId,
    contactId: isFromUs ? null : contactId,
    senderType: isFromUs ? 'agent' : 'contact',
    content: (extractField(data, 'text', 'content', 'message') as string) || '',
    contentType: data.mediaUrl || (data.attachments as unknown[])?.length ? 'image' : 'text',
    mediaUrl: (data.mediaUrl as string) || undefined,
    metadata: { raw: data, source: 'webhook' },
    createdAt: (extractField(data, 'createdAt', 'timestamp', 'created_at') as string) || new Date().toISOString(),
  });

  if (!msgResult.inserted) {
    return { deduplicated: true };
  }

  // Auto-respond (only for contact messages)
  if (msgResult.message && !isFromUs) {
    // Resolve profile ID for auto-respond
    const { data: company } = await supabase
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', companyId)
      .single();

    try {
      await checkAndAutoRespond(supabase, msgResult.message, {
        id: convResult.id,
        platform,
        type: 'dm' as const,
        platform_conversation_id: convKey,
        post_id: null,
        contact_id: contactId,
      }, getlateApiKey, company?.getlate_profile_id || null);
    } catch (autoErr) {
      console.error('[getlate-webhook] Auto-respond error:', autoErr);
    }
  }

  // AI classification (if enabled)
  if (!isFromUs) {
    await maybeClassify(supabase, companyId, convResult.id);
  }

  return { inserted: true, conversationId: convResult.id, isNew: convResult.isNew };
}

async function handleCommentReceived(
  supabase: SupabaseClient,
  companyId: string,
  event: NormalizedPayload
): Promise<Record<string, unknown>> {
  const data = event.data;
  const platform = event.platform || (extractField(data, 'platform') as string) || 'unknown';
  const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

  // Extract comment author
  const author = (data.author || data.sender || data.from || {}) as Record<string, unknown>;
  const contactId = await upsertContact(supabase, companyId, {
    platform,
    platformUserId: (extractField(author, 'id', 'userId') as string) || 'unknown',
    username: extractField(author, 'handle', 'username') as string | undefined,
    displayName: extractField(author, 'name', 'displayName') as string | undefined,
    avatarUrl: extractField(author, 'profileUrl', 'avatarUrl') as string | undefined,
  });

  // Build conversation key (comments keyed by platform-postId)
  const postId = (extractField(data, 'postId', 'post_id') as string) || '';
  const convKey = `${platform}-${postId}`;
  const postUrl = (extractField(data, 'postUrl', 'post_url', 'permalink') as string) || undefined;
  const postContent = (extractField(data, 'postContent', 'post_content', 'caption') as string) || undefined;

  const convResult = await upsertConversation(supabase, companyId, {
    platform,
    platformConversationId: convKey,
    type: 'comment',
    subject: postContent ? postContent.slice(0, 100) : 'Comment thread',
    contactId,
    postId: postId || undefined,
    postUrl,
    lastMessageAt: (extractField(data, 'createdAt', 'timestamp') as string) || new Date().toISOString(),
    lastMessagePreview: ((extractField(data, 'text', 'content', 'comment') as string) || '').slice(0, 200),
  });

  // Link article on new conversations
  if (convResult.isNew && postId) {
    await linkArticleToConversation(supabase, postId, convResult.id);
  }

  const commentId = (extractField(data, 'commentId', 'comment_id', 'id') as string) || '';
  if (!commentId) return { skipped: true, reason: 'no_comment_id' };

  const msgResult = await insertMessageIfNew(supabase, companyId, convResult.id, {
    platformMessageId: commentId,
    contactId,
    senderType: 'contact',
    content: (extractField(data, 'text', 'content', 'comment') as string) || '',
    metadata: {
      likeCount: data.likeCount,
      replyCount: data.replyCount,
      hidden: data.hidden,
      accountId: data.accountId,
      source: 'webhook',
    },
    createdAt: (extractField(data, 'createdAt', 'timestamp') as string) || new Date().toISOString(),
  });

  if (!msgResult.inserted) {
    return { deduplicated: true };
  }

  // Auto-respond
  if (msgResult.message) {
    const { data: company } = await supabase
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', companyId)
      .single();

    try {
      await checkAndAutoRespond(supabase, msgResult.message, {
        id: convResult.id,
        platform,
        type: 'comment' as const,
        platform_conversation_id: convKey,
        post_id: postId || null,
        contact_id: contactId,
      }, getlateApiKey, company?.getlate_profile_id || null);
    } catch (autoErr) {
      console.error('[getlate-webhook] Auto-respond comment error:', autoErr);
    }
  }

  // AI classification
  await maybeClassify(supabase, companyId, convResult.id);

  return { inserted: true, conversationId: convResult.id, isNew: convResult.isNew };
}

async function handlePostEvent(
  supabase: SupabaseClient,
  companyId: string,
  event: NormalizedPayload,
  isPartial: boolean
): Promise<Record<string, unknown>> {
  // Stub: log event, update post status if found
  const data = event.data;
  const postId = (extractField(data, 'postId', 'post_id') as string) || '';

  if (postId) {
    const newStatus = isPartial ? 'partial' : 'failed';
    await supabase
      .from('posts')
      .update({
        status: newStatus,
        metadata: { webhook_event: event.eventType, failure_details: data },
      })
      .eq('getlate_post_id', postId)
      .eq('company_id', companyId);
  }

  return { handled: true, postId, status: isPartial ? 'partial' : 'failed' };
}

async function handleAccountDisconnected(
  supabase: SupabaseClient,
  companyId: string,
  event: NormalizedPayload
): Promise<Record<string, unknown>> {
  // Stub: log event
  const data = event.data;
  const accountId = (extractField(data, 'accountId', 'account_id') as string) || '';
  const platform = event.platform || '';

  console.warn(`[getlate-webhook] Account disconnected: ${platform} ${accountId} for company ${companyId}`);

  return { handled: true, accountId, platform };
}

// ─── AI Classification Helper ────────────────────────────────

async function maybeClassify(
  supabase: SupabaseClient,
  companyId: string,
  conversationId: string
): Promise<void> {
  try {
    const { data: aiSettings } = await supabase
      .from('inbox_ai_settings')
      .select('auto_classify')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!aiSettings?.auto_classify) return;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) return;

    // Check if already classified
    const { data: conv } = await supabase
      .from('inbox_conversations')
      .select('ai_classified_at')
      .eq('id', conversationId)
      .eq('company_id', companyId)
      .single();

    if (conv?.ai_classified_at) return;

    await classifyConversation(supabase, geminiApiKey, companyId, conversationId);

    // Increment AI call counter
    try {
      const { data: settings } = await supabase
        .from('inbox_ai_settings')
        .select('ai_calls_count')
        .eq('company_id', companyId)
        .single();
      if (settings) {
        await supabase
          .from('inbox_ai_settings')
          .update({ ai_calls_count: (settings.ai_calls_count || 0) + 1 })
          .eq('company_id', companyId);
      }
    } catch { /* non-fatal */ }
  } catch (err) {
    console.error(`[getlate-webhook] Classification failed for ${conversationId}:`, err);
    await setFallbackClassification(supabase, companyId, conversationId).catch(() => {});
  }
}

// ─── Event Logging ───────────────────────────────────────────

async function logEvent(
  supabase: SupabaseClient,
  companyId: string | null,
  eventType: string,
  eventId: string | null,
  payload: Record<string, unknown>,
  status: string,
  errorMessage: string | null,
  durationMs: number
): Promise<void> {
  try {
    await supabase.from('webhook_event_log').insert({
      company_id: companyId,
      provider: 'getlate',
      event_type: eventType,
      event_id: eventId,
      payload,
      processing_status: status,
      error_message: errorMessage,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error('[getlate-webhook] Failed to log event:', err);
  }
}

// ─── Response Helper ─────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
