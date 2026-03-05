import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';
import { checkAndAutoRespond } from './auto-respond.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

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

  try {
    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all companies with getlate_profile_id
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, getlate_profile_id')
      .not('getlate_profile_id', 'is', null);

    if (compError) throw compError;
    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No companies to sync', results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: SyncResult[] = [];

    for (const company of companies) {
      // Sync comments for this company
      const commentStart = Date.now();
      const commentResult = await syncComments(supabase, company, getlateApiKey);
      results.push(commentResult);

      // Log comment sync to api_call_logs
      try {
        await supabase.from('api_call_logs' as any).insert({
          function_name: 'inbox-sync',
          action: 'sync-comments',
          request_summary: JSON.stringify({ company_id: company.id, profile_id: company.getlate_profile_id }).slice(0, 500),
          response_summary: JSON.stringify({ new_items: commentResult.new_items, errors: commentResult.errors.length }).slice(0, 500),
          success: commentResult.errors.length === 0,
          duration_ms: Date.now() - commentStart,
          company_id: company.id,
        });
      } catch (logErr) {
        console.error('Failed to log comment sync:', logErr);
      }

      // Sync DMs for this company
      const dmStart = Date.now();
      const dmResult = await syncDMs(supabase, company, getlateApiKey);
      results.push(dmResult);

      // Log DM sync to api_call_logs
      try {
        await supabase.from('api_call_logs' as any).insert({
          function_name: 'inbox-sync',
          action: 'sync-dms',
          request_summary: JSON.stringify({ company_id: company.id, profile_id: company.getlate_profile_id }).slice(0, 500),
          response_summary: JSON.stringify({ new_items: dmResult.new_items, errors: dmResult.errors.length }).slice(0, 500),
          success: dmResult.errors.length === 0,
          duration_ms: Date.now() - dmStart,
          company_id: company.id,
        });
      } catch (logErr) {
        console.error('Failed to log DM sync:', logErr);
      }
    }

    // Log to cron health
    const totalNew = results.reduce((s: number, r: SyncResult) => s + r.new_items, 0);
    const totalErrors = results.reduce((s: number, r: SyncResult) => s + r.errors.length, 0);
    try {
      await supabase.from('cron_health_logs').insert({
        job_name: 'inbox-sync-every-5-min',
        status: totalErrors > 0 ? 'partial' : 'success',
        duration_ms: Date.now() - startTime,
        details: { companies: companies.length, totalNew, totalErrors, results },
      });
    } catch (logErr) {
      console.error('Failed to log cron health:', logErr);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('inbox-sync error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Comments Sync ──────────────────────────────────────────
// Two-step: 1) list posts with comments, 2) fetch comments per post

async function syncComments(
  supabase: ReturnType<typeof createClient>,
  company: { id: string; getlate_profile_id: string },
  apiKey: string
): Promise<SyncResult> {
  const result: SyncResult = {
    company_id: company.id,
    platform: 'all',
    sync_type: 'comments',
    new_items: 0,
    errors: [],
  };

  try {
    // Step 1: List posts with comments
    let cursor: string | null = null;
    let hasMore = true;
    const postsWithComments: Array<{ postId: string; accountId: string; platform: string; platformPostUrl?: string; content?: string }> = [];

    while (hasMore) {
      const params = new URLSearchParams({ profile: company.getlate_profile_id, limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const listUrl = `${GETLATE_API_URL}/inbox/comments?${params}`;
      console.log(`[inbox-sync] Fetching comment posts: ${listUrl}`);

      const response = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        result.errors.push(`list-inbox-comments returned ${response.status}: ${errText.slice(0, 200)}`);
        return result;
      }

      const data = await response.json();
      const posts = data.data || data.posts || [];

      // Log first post shape for debugging
      if (posts.length > 0) {
        console.log(`[inbox-sync] First post keys: ${JSON.stringify(Object.keys(posts[0]))}`);
        console.log(`[inbox-sync] First post sample: ${JSON.stringify(posts[0]).slice(0, 500)}`);
      }

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

    console.log(`[inbox-sync] Found ${postsWithComments.length} posts with comments for company ${company.id}`);

    // Step 2: Fetch comments for each post
    for (const post of postsWithComments) {
      try {
        let commentCursor: string | null = null;
        let commentHasMore = true;

        while (commentHasMore) {
          const commentParams = new URLSearchParams({
            postId: post.postId,
            accountId: post.accountId,
          });
          if (commentCursor) commentParams.set('cursor', commentCursor);

          const commentsUrl = `${GETLATE_API_URL}/inbox/comments/${post.postId}?${commentParams}`;
          const commentsResponse = await fetch(commentsUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          });

          if (!commentsResponse.ok) {
            const errBody = await commentsResponse.text().catch(() => '');
            result.errors.push(`get-inbox-post-comments postId=${post.postId} accountId=${post.accountId} returned ${commentsResponse.status}: ${errBody.slice(0, 200)}`);
            break;
          }

          const commentsData = await commentsResponse.json();
          const comments = commentsData.data || [];

          for (const comment of comments) {
            try {
              // Upsert contact from comment author
              const contactId = await upsertContact(supabase, company.id, {
                platform: post.platform || 'unknown',
                platformUserId: comment.author?.id || 'unknown',
                username: comment.author?.handle,
                displayName: comment.author?.name,
                avatarUrl: comment.author?.profileUrl,
              });

              // Upsert conversation (group by post)
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
                await supabase
                  .from('inbox_conversations')
                  .update({
                    last_message_at: comment.createdAt || new Date().toISOString(),
                    last_message_preview: (comment.text || '').slice(0, 200),
                  })
                  .eq('id', conversationId);
              } else {
                const { data: newConv, error: convError } = await supabase
                  .from('inbox_conversations')
                  .insert({
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
                  })
                  .select('id')
                  .single();

                if (convError) { result.errors.push(`Conv insert: ${convError.message}`); continue; }
                conversationId = newConv.id;
              }

              // Insert message (skip if already exists by platform ID)
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

                // Check auto-respond rules
                if (insertedMsg) {
                  try {
                    const conv = {
                      id: conversationId,
                      platform: post.platform || 'unknown',
                      type: 'comment' as const,
                      platform_conversation_id: convKey,
                      post_id: post.postId,
                      contact_id: contactId,
                    };
                    await checkAndAutoRespond(supabase, insertedMsg, conv, apiKey, company.getlate_profile_id);
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

    // Update sync state
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
  apiKey: string
): Promise<SyncResult> {
  const result: SyncResult = {
    company_id: company.id,
    platform: 'all',
    sync_type: 'dms',
    new_items: 0,
    errors: [],
  };

  try {
    // Step 1: List conversations
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({ profileId: company.getlate_profile_id, limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const listUrl = `${GETLATE_API_URL}/inbox/conversations?${params}`;
      console.log(`[inbox-sync] Fetching DM conversations: ${listUrl}`);

      const response = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        result.errors.push(`list-inbox-conversations returned ${response.status}: ${errText.slice(0, 200)}`);
        return result;
      }

      const data = await response.json();
      const conversations = data.conversations || data.data || [];

      for (const conv of conversations) {
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
            await supabase
              .from('inbox_conversations')
              .update({
                last_message_at: conv.lastMessageTime || new Date().toISOString(),
                last_message_preview: (conv.lastMessage || '').slice(0, 200),
              })
              .eq('id', conversationId);
          } else {
            const { data: newConv, error: convError } = await supabase
              .from('inbox_conversations')
              .insert({
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
              })
              .select('id')
              .single();

            if (convError) { result.errors.push(`DM conv insert: ${convError.message}`); continue; }
            conversationId = newConv.id;
          }

          // Step 2: Fetch messages for this conversation
          const messagesUrl = `${GETLATE_API_URL}/inbox/conversations/${conv.id}/messages?accountId=${conv.accountId}`;
          const messagesResponse = await fetch(messagesUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          });

          if (!messagesResponse.ok) {
            result.errors.push(`get-inbox-conversation-messages ${conv.id} returned ${messagesResponse.status}`);
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

              // Check auto-respond for inbound DMs
              if (insertedDmMsg && !isFromUs) {
                try {
                  const dmConv = {
                    id: conversationId,
                    platform: conv.platform || 'unknown',
                    type: 'dm' as const,
                    platform_conversation_id: convKey,
                    post_id: null,
                    contact_id: contactId,
                  };
                  await checkAndAutoRespond(supabase, insertedDmMsg, dmConv, apiKey, company.getlate_profile_id);
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
    await supabase
      .from('inbox_contacts')
      .update({
        username: contact.username || undefined,
        display_name: contact.displayName || undefined,
        avatar_url: contact.avatarUrl || undefined,
      })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: newContact, error } = await supabase
    .from('inbox_contacts')
    .insert({
      company_id: companyId,
      platform: contact.platform,
      platform_user_id: contact.platformUserId,
      username: contact.username,
      display_name: contact.displayName,
      avatar_url: contact.avatarUrl,
    })
    .select('id')
    .single();

  if (error) throw error;
  return newContact.id;
}
