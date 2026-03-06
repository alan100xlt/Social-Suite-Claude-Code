import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';
import { checkAndAutoRespond } from './auto-respond.ts';
import { classifyConversation, setFallbackClassification } from '../_shared/classify.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

// ─── Deadline guard ──────────────────────────────────────────
// Supabase edge functions timeout at ~60s (free) or ~150s (pro).
// Bail early at 45s to leave time for monitor.success() and response.
const DEADLINE_MS = 45_000;
// Per-request timeout for GetLate API calls (prevents hanging fetch from blocking past deadline)
const FETCH_TIMEOUT_MS = 15_000;
// Retry config for transient failures
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ─── Retry-capable fetch ─────────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  pastDeadline: () => boolean,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (pastDeadline()) throw new Error('Deadline exceeded before fetch');
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      // Retry on 429/5xx, but not on 4xx client errors
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < retries && !pastDeadline()) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[inbox-sync] Retrying ${url} after ${resp.status} (attempt ${attempt + 1}/${retries}, waiting ${delay}ms)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      return resp;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Retry on network errors / timeouts
      if (attempt < retries && !pastDeadline()) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[inbox-sync] Retrying ${url} after error: ${lastError.message} (attempt ${attempt + 1}/${retries}, waiting ${delay}ms)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError || new Error(`fetchWithRetry failed for ${url}`);
}

interface SyncResult {
  company_id: string;
  platform: string;
  sync_type: string;
  new_items: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth: only service role can invoke this (called by pg_cron dispatcher)
  try {
    const { authorize } = await import('../_shared/authorize.ts');
    await authorize(req, { allowServiceRole: true });
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Parse companyId from request body (sent by fan-out dispatcher)
  let targetCompanyId: string | null = null;
  try {
    const body = await req.json();
    targetCompanyId = body.companyId || null;
  } catch {
    // No body — legacy single-invocation mode
  }

  // Use companyId in monitor name for per-company tracking
  const monitorName = targetCompanyId
    ? `inbox-sync:${targetCompanyId.slice(0, 8)}`
    : 'inbox-sync-every-5-min';
  const monitor = new CronMonitor(monitorName, supabase);
  await monitor.start();

  const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

  try {
    // ── Resolve which company to process ──
    let targetCompany: { id: string; getlate_profile_id: string } | null = null;

    if (targetCompanyId) {
      // Dispatcher mode: process exactly this company
      const { data, error } = await supabase
        .from('companies')
        .select('id, getlate_profile_id')
        .eq('id', targetCompanyId)
        .not('getlate_profile_id', 'is', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        await monitor.success({ message: 'Company not found or no getlate profile', companyId: targetCompanyId });
        return new Response(JSON.stringify({ success: true, message: 'Company not found or no profile' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetCompany = data;
    } else {
      // Legacy mode (no dispatcher): pick least-recently-synced company
      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('id, getlate_profile_id')
        .not('getlate_profile_id', 'is', null);

      if (compError) throw compError;
      if (!companies || companies.length === 0) {
        await monitor.success({ message: 'No companies to sync' });
        return new Response(JSON.stringify({ success: true, message: 'No companies to sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Pick least-recently-synced
      const { data: allSyncStates } = await supabase
        .from('inbox_sync_state')
        .select('company_id, last_synced_at')
        .eq('sync_type', 'dms');

      const syncMap = new Map<string, string>();
      const syncedIds = new Set<string>();
      for (const s of allSyncStates || []) {
        syncMap.set(s.company_id, s.last_synced_at);
        syncedIds.add(s.company_id);
      }

      const neverSynced = companies.filter(c => !syncedIds.has(c.id));
      targetCompany = neverSynced.length > 0
        ? neverSynced[0]
        : companies.sort((a, b) => (syncMap.get(a.id) || '').localeCompare(syncMap.get(b.id) || ''))[0];
    }

    console.log(`[inbox-sync] Processing company ${targetCompany.id}`);

    const results: SyncResult[] = [];

    // Sync comments
    if (!pastDeadline()) {
      const commentResult = await syncComments(supabase, targetCompany, getlateApiKey, pastDeadline);
      results.push(commentResult);
      logApiCall(supabase, 'sync-comments', targetCompany, commentResult, Date.now() - startTime);
    }

    // Sync DMs
    if (!pastDeadline()) {
      const dmStart = Date.now();
      const dmResult = await syncDMs(supabase, targetCompany, getlateApiKey, pastDeadline);
      results.push(dmResult);
      logApiCall(supabase, 'sync-dms', targetCompany, dmResult, Date.now() - dmStart);
    }

    // ── Phase 1: Auto-classify unclassified conversations (R1, R11) ──
    let classificationsAttempted = 0;
    let classificationsSucceeded = 0;
    if (!pastDeadline() && targetCompany) {
      try {
        // Check if company has auto_classify enabled (R15 — defaults to false)
        const { data: aiSettings } = await supabase
          .from('inbox_ai_settings')
          .select('auto_classify')
          .eq('company_id', targetCompany.id)
          .maybeSingle();

        if (aiSettings?.auto_classify) {
          const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
          if (geminiApiKey) {
            // Get unclassified conversations (R1: skip-if-classified guard)
            const { data: unclassified } = await supabase
              .from('inbox_conversations')
              .select('id')
              .eq('company_id', targetCompany.id)
              .is('ai_classified_at', null)
              .order('last_message_at', { ascending: false })
              .limit(10); // Batch size to stay within deadline

            for (const conv of unclassified || []) {
              if (pastDeadline()) break;
              classificationsAttempted++;
              try {
                await classifyConversation(supabase, geminiApiKey, targetCompany.id, conv.id);
                classificationsSucceeded++;
                // Increment AI call counter (R3)
                await supabase.rpc('increment_ai_calls', { _company_id: targetCompany.id }).catch(() => {});
              } catch (classifyErr) {
                console.error(`Classification failed for ${conv.id}:`, classifyErr);
                // Gemini-down fallback (R1)
                await setFallbackClassification(supabase, targetCompany.id, conv.id).catch(() => {});
              }
            }
          }
        }
      } catch (classifyErr) {
        console.error('Classification batch error:', classifyErr);
      }
    }

    // Finalize
    const totalNew = results.reduce((s: number, r: SyncResult) => s + r.new_items, 0);
    const totalErrors = results.reduce((s: number, r: SyncResult) => s + r.errors.length, 0);

    const details = {
      company: targetCompany.id,
      totalNew,
      totalErrors,
      classificationsAttempted,
      classificationsSucceeded,
      bailedEarly: pastDeadline(),
      durationMs: Date.now() - startTime,
      results: results.map(r => ({
        company_id: r.company_id,
        sync_type: r.sync_type,
        new_items: r.new_items,
        errors: r.errors,
      })),
    };

    if (totalErrors > 0) {
      const errorSummary = results.flatMap((r) => r.errors).slice(0, 5).join('; ');
      await monitor.error(errorSummary, details);
    } else {
      await monitor.success(details);
    }

    return new Response(JSON.stringify({ success: true, results, ...details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('inbox-sync error:', error);
    await monitor.error(error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── API Call Logger ─────────────────────────────────────────

async function logApiCall(
  supabase: ReturnType<typeof createClient>,
  action: string,
  company: { id: string; getlate_profile_id: string },
  result: SyncResult,
  durationMs: number
) {
  try {
    await supabase.from('api_call_logs' as any).insert({
      function_name: 'inbox-sync',
      action,
      request_summary: JSON.stringify({ company_id: company.id, profile_id: company.getlate_profile_id }).slice(0, 500),
      response_summary: JSON.stringify({ new_items: result.new_items, errors: result.errors.length }).slice(0, 500),
      success: result.errors.length === 0,
      duration_ms: durationMs,
      company_id: company.id,
    });
  } catch (logErr) {
    console.error('Failed to log API call:', logErr);
  }
}

// ─── Comments Sync ──────────────────────────────────────────

async function syncComments(
  supabase: ReturnType<typeof createClient>,
  company: { id: string; getlate_profile_id: string },
  apiKey: string,
  pastDeadline: () => boolean
): Promise<SyncResult> {
  const result: SyncResult = {
    company_id: company.id,
    platform: 'all',
    sync_type: 'comments',
    new_items: 0,
    errors: [],
  };

  try {
    let cursor: string | null = null;
    let hasMore = true;
    const postsWithComments: Array<{ postId: string; accountId: string; platform: string; platformPostUrl?: string; content?: string }> = [];

    while (hasMore && !pastDeadline()) {
      const params = new URLSearchParams({ profile: company.getlate_profile_id, limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const response = await fetchWithRetry(`${GETLATE_API_URL}/inbox/comments?${params}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }, pastDeadline);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        result.errors.push(`list-inbox-comments returned ${response.status}: ${errText.slice(0, 200)}`);
        return result;
      }

      const data = await response.json();
      const posts = data.data || data.posts || [];

      for (const post of posts) {
        const commentCount = post.commentCount ?? post.comments ?? 0;
        if (commentCount > 0) {
          postsWithComments.push({
            postId: post.postId || post._id || post.id,
            accountId: post.accountId || post.account_id || post.socialAccountId,
            platform: post.platform || post.type,
            platformPostUrl: post.platformPostUrl || post.url || post.permalink,
            content: post.content || post.text || post.caption,
          });
        }
      }

      cursor = data.pagination?.cursor || null;
      hasMore = data.pagination?.hasMore === true && !!cursor;
    }

    for (const post of postsWithComments) {
      if (pastDeadline()) break;

      try {
        let commentCursor: string | null = null;
        let commentHasMore = true;

        while (commentHasMore && !pastDeadline()) {
          const commentParams = new URLSearchParams({ postId: post.postId, accountId: post.accountId });
          if (commentCursor) commentParams.set('cursor', commentCursor);

          const commentsResponse = await fetchWithRetry(`${GETLATE_API_URL}/inbox/comments/${post.postId}?${commentParams}`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          }, pastDeadline);

          if (!commentsResponse.ok) {
            const errBody = await commentsResponse.text().catch(() => '');
            result.errors.push(`comments ${post.postId}: ${commentsResponse.status} ${errBody.slice(0, 200)}`);
            break;
          }

          const commentsData = await commentsResponse.json();
          const comments = commentsData.data || [];

          for (const comment of comments) {
            try {
              const contactId = await upsertContact(supabase, company.id, {
                platform: post.platform || 'unknown',
                platformUserId: comment.author?.id || 'unknown',
                username: comment.author?.handle,
                displayName: comment.author?.name,
                avatarUrl: comment.author?.profileUrl,
              });

              const convKey = `${post.platform}-${post.postId}`;
              const { data: existingConv } = await supabase
                .from('inbox_conversations')
                .select('id')
                .eq('company_id', company.id)
                .eq('platform_conversation_id', convKey)
                .maybeSingle();

              let conversationId: string;

              if (existingConv) {
                conversationId = existingConv.id;
                await supabase.from('inbox_conversations').update({
                  last_message_at: comment.createdAt || new Date().toISOString(),
                  last_message_preview: (comment.text || '').slice(0, 200),
                }).eq('id', conversationId);
              } else {
                const { data: newConv, error: convError } = await supabase.from('inbox_conversations').insert({
                  company_id: company.id,
                  platform: post.platform || 'unknown',
                  platform_conversation_id: convKey,
                  type: 'comment',
                  status: 'open',
                  subject: post.content ? post.content.slice(0, 100) : 'Comment thread',
                  contact_id: contactId,
                  post_id: post.postId,
                  post_url: post.platformPostUrl,
                  last_message_at: comment.createdAt || new Date().toISOString(),
                  last_message_preview: (comment.text || '').slice(0, 200),
                }).select('id').single();

                if (convError) { result.errors.push(`Conv insert: ${convError.message}`); continue; }
                conversationId = newConv.id;

                // Phase 1B-article: Wire article join for comment conversations
                if (post.postId) {
                  try {
                    const { data: feedItem } = await supabase
                      .from('rss_feed_items')
                      .select('link, title')
                      .eq('post_id', post.postId)
                      .maybeSingle();

                    if (feedItem?.link) {
                      await supabase.from('inbox_conversations').update({
                        article_url: feedItem.link,
                        article_title: feedItem.title,
                      }).eq('id', conversationId);
                    }
                  } catch {
                    // Non-fatal — article linking is best-effort (R8)
                  }
                }
              }

              const platformMsgId = comment.id;
              if (!platformMsgId) continue;

              const { data: existingMsg } = await supabase
                .from('inbox_messages')
                .select('id')
                .eq('platform_message_id', platformMsgId)
                .eq('conversation_id', conversationId)
                .maybeSingle();

              if (!existingMsg) {
                const { data: insertedMsg } = await supabase.from('inbox_messages').insert({
                  conversation_id: conversationId,
                  company_id: company.id,
                  platform_message_id: platformMsgId,
                  contact_id: contactId,
                  sender_type: 'contact',
                  content: comment.text || '',
                  content_type: 'text',
                  metadata: {
                    likeCount: comment.likeCount,
                    replyCount: comment.replyCount,
                    hidden: comment.hidden,
                    canReply: comment.canReply,
                    canDelete: comment.canDelete,
                    canLike: comment.canLike,
                    accountId: post.accountId,
                  },
                  created_at: comment.createdAt || new Date().toISOString(),
                }).select('id, conversation_id, company_id, content, sender_type, contact_id').single();

                result.new_items++;

                if (insertedMsg) {
                  try {
                    await checkAndAutoRespond(supabase, insertedMsg, {
                      id: conversationId,
                      platform: post.platform || 'unknown',
                      type: 'comment' as const,
                      platform_conversation_id: convKey,
                      post_id: post.postId,
                      contact_id: contactId,
                    }, apiKey, company.getlate_profile_id);
                  } catch (autoErr) {
                    console.error('Auto-respond error:', autoErr);
                  }
                }
              }
            } catch (err) {
              result.errors.push(`Comment ${comment.id}: ${String(err)}`);
            }
          }

          commentCursor = commentsData.pagination?.nextCursor || null;
          commentHasMore = !!commentCursor;
        }
      } catch (err) {
        result.errors.push(`Post ${post.postId}: ${String(err)}`);
      }
    }

    await supabase.from('inbox_sync_state').upsert({
      company_id: company.id,
      platform: 'all',
      sync_type: 'comments',
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    result.errors.push(String(err));
  }

  return result;
}

// ─── DMs Sync ───────────────────────────────────────────────

async function syncDMs(
  supabase: ReturnType<typeof createClient>,
  company: { id: string; getlate_profile_id: string },
  apiKey: string,
  pastDeadline: () => boolean
): Promise<SyncResult> {
  const result: SyncResult = {
    company_id: company.id,
    platform: 'all',
    sync_type: 'dms',
    new_items: 0,
    errors: [],
  };

  try {
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore && !pastDeadline()) {
      const params = new URLSearchParams({ profileId: company.getlate_profile_id, limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const response = await fetchWithRetry(`${GETLATE_API_URL}/inbox/conversations?${params}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }, pastDeadline);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        result.errors.push(`list-inbox-conversations returned ${response.status}: ${errText.slice(0, 200)}`);
        return result;
      }

      const data = await response.json();
      const conversations = data.conversations || data.data || [];

      for (const conv of conversations) {
        if (pastDeadline()) break;

        try {
          const contactId = await upsertContact(supabase, company.id, {
            platform: conv.platform || 'unknown',
            platformUserId: conv.id || 'unknown',
            username: conv.participantName,
            displayName: conv.participantName,
          });

          const convKey = `dm-${conv.platform}-${conv.id}`;
          const { data: existingConv } = await supabase
            .from('inbox_conversations')
            .select('id')
            .eq('company_id', company.id)
            .eq('platform_conversation_id', convKey)
            .maybeSingle();

          let conversationId: string;

          if (existingConv) {
            conversationId = existingConv.id;
            await supabase.from('inbox_conversations').update({
              last_message_at: conv.lastMessageTime || new Date().toISOString(),
              last_message_preview: (conv.lastMessage || '').slice(0, 200),
            }).eq('id', conversationId);
          } else {
            const { data: newConv, error: convError } = await supabase.from('inbox_conversations').insert({
              company_id: company.id,
              platform: conv.platform || 'unknown',
              platform_conversation_id: convKey,
              type: 'dm',
              status: 'open',
              subject: conv.participantName || 'DM',
              contact_id: contactId,
              last_message_at: conv.lastMessageTime || new Date().toISOString(),
              last_message_preview: (conv.lastMessage || '').slice(0, 200),
              unread_count: conv.unreadCount || 0,
            }).select('id').single();

            if (convError) { result.errors.push(`DM conv insert: ${convError.message}`); continue; }
            conversationId = newConv.id;
          }

          if (pastDeadline()) break;

          const messagesResponse = await fetchWithRetry(
            `${GETLATE_API_URL}/inbox/conversations/${conv.id}/messages?accountId=${conv.accountId}`,
            { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
            pastDeadline,
          );

          if (!messagesResponse.ok) {
            result.errors.push(`DM messages ${conv.id}: ${messagesResponse.status}`);
            continue;
          }

          const messagesData = await messagesResponse.json();
          const messages = messagesData.data || messagesData.messages || [];

          for (const msg of messages) {
            const platformMsgId = msg.id || msg._id || `${conv.id}-${msg.createdAt}`;
            const { data: existingMsg } = await supabase
              .from('inbox_messages')
              .select('id')
              .eq('platform_message_id', platformMsgId)
              .eq('conversation_id', conversationId)
              .maybeSingle();

            if (!existingMsg) {
              const isFromUs = msg.isFromBrand || msg.direction === 'outbound' || msg.isOwn === true;
              const { data: insertedDmMsg } = await supabase.from('inbox_messages').insert({
                conversation_id: conversationId,
                company_id: company.id,
                platform_message_id: platformMsgId,
                contact_id: isFromUs ? null : contactId,
                sender_type: isFromUs ? 'agent' : 'contact',
                content: msg.text || msg.content || msg.message || '',
                content_type: msg.mediaUrl || msg.attachments?.length ? 'image' : 'text',
                media_url: msg.mediaUrl,
                metadata: { raw: msg },
                created_at: msg.createdAt || msg.timestamp || new Date().toISOString(),
              }).select('id, conversation_id, company_id, content, sender_type, contact_id').single();

              result.new_items++;

              if (insertedDmMsg && !isFromUs) {
                try {
                  await checkAndAutoRespond(supabase, insertedDmMsg, {
                    id: conversationId,
                    platform: conv.platform || 'unknown',
                    type: 'dm' as const,
                    platform_conversation_id: convKey,
                    post_id: null,
                    contact_id: contactId,
                  }, apiKey, company.getlate_profile_id);
                } catch (autoErr) {
                  console.error('Auto-respond DM error:', autoErr);
                }
              }
            }
          }
        } catch (err) {
          result.errors.push(`DM ${conv.id}: ${String(err)}`);
        }
      }

      cursor = data.pagination?.cursor || null;
      hasMore = data.pagination?.hasMore === true && !!cursor;
    }

    await supabase.from('inbox_sync_state').upsert({
      company_id: company.id,
      platform: 'all',
      sync_type: 'dms',
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    result.errors.push(String(err));
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────────

async function upsertContact(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  contact: { platform: string; platformUserId: string; username?: string; displayName?: string; avatarUrl?: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from('inbox_contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('platform', contact.platform)
    .eq('platform_user_id', contact.platformUserId)
    .maybeSingle();

  if (existing) {
    await supabase.from('inbox_contacts').update({
      username: contact.username || undefined,
      display_name: contact.displayName || undefined,
      avatar_url: contact.avatarUrl || undefined,
    }).eq('id', existing.id);
    return existing.id;
  }

  const { data: newContact, error } = await supabase.from('inbox_contacts').insert({
    company_id: companyId,
    platform: contact.platform,
    platform_user_id: contact.platformUserId,
    username: contact.username,
    display_name: contact.displayName,
    avatar_url: contact.avatarUrl,
  }).select('id').single();

  if (error) throw error;
  return newContact.id;
}
