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
      const commentResult = await syncComments(supabase, company, getlateApiKey);
      results.push(commentResult);

      // Sync DMs for this company
      const dmResult = await syncDMs(supabase, company, getlateApiKey);
      results.push(dmResult);
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
    // Get sync state
    const { data: syncState } = await supabase
      .from('inbox_sync_state')
      .select('*')
      .eq('company_id', company.id)
      .eq('sync_type', 'comments')
      .maybeSingle();

    const since = syncState?.last_synced_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch comments from GetLate
    const response = await fetch(`${GETLATE_API_URL}/comments?profileId=${company.getlate_profile_id}&since=${since}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      result.errors.push(`GetLate comments API returned ${response.status}`);
      return result;
    }

    const data = await response.json();
    const comments = data.comments || data.data || [];

    for (const comment of comments) {
      try {
        // Upsert contact
        const contactId = await upsertContact(supabase, company.id, {
          platform: comment.platform || 'unknown',
          platformUserId: comment.authorId || comment.userId || 'unknown',
          username: comment.authorUsername || comment.username,
          displayName: comment.authorName || comment.displayName,
          avatarUrl: comment.authorAvatar || comment.profilePicture,
        });

        // Upsert conversation (group by post)
        const convKey = `${comment.platform}-${comment.postId || comment.parentId || comment.id}`;
        const { data: existingConv } = await supabase
          .from('inbox_conversations')
          .select('id')
          .eq('company_id', company.id)
          .eq('platform_conversation_id', convKey)
          .maybeSingle();

        let conversationId: string;

        if (existingConv) {
          conversationId = existingConv.id;
          // Update last message
          await supabase
            .from('inbox_conversations')
            .update({
              last_message_at: comment.createdAt || new Date().toISOString(),
              last_message_preview: (comment.text || '').slice(0, 200),
              unread_count: supabase.rpc ? 1 : 1, // Will increment via trigger later
            })
            .eq('id', conversationId);
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('inbox_conversations')
            .insert({
              company_id: company.id,
              platform: comment.platform || 'unknown',
              platform_conversation_id: convKey,
              type: 'comment',
              status: 'open',
              subject: comment.postText ? comment.postText.slice(0, 100) : 'Comment thread',
              contact_id: contactId,
              post_id: comment.postId,
              post_url: comment.postUrl,
              last_message_at: comment.createdAt || new Date().toISOString(),
              last_message_preview: (comment.text || '').slice(0, 200),
            })
            .select('id')
            .single();

          if (convError) { result.errors.push(`Conv insert: ${convError.message}`); continue; }
          conversationId = newConv.id;
        }

        // Insert message (skip if already exists)
        const platformMsgId = comment.id || comment._id;
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
            content: comment.text || comment.message || '',
            content_type: 'text',
            parent_message_id: null,
            metadata: { raw: comment },
            created_at: comment.createdAt || new Date().toISOString(),
          }).select('id, conversation_id, company_id, content, sender_type, contact_id').single();

          result.new_items++;

          // Check auto-respond rules
          if (insertedMsg) {
            try {
              const conv = { id: conversationId, platform: comment.platform || 'unknown', type: 'comment' as const, platform_conversation_id: convKey, post_id: comment.postId, contact_id: contactId };
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
    const { data: syncState } = await supabase
      .from('inbox_sync_state')
      .select('*')
      .eq('company_id', company.id)
      .eq('sync_type', 'dms')
      .maybeSingle();

    const since = syncState?.last_synced_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(`${GETLATE_API_URL}/conversations?profileId=${company.getlate_profile_id}&since=${since}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      result.errors.push(`GetLate DMs API returned ${response.status}`);
      return result;
    }

    const data = await response.json();
    const conversations = data.conversations || data.data || [];

    for (const conv of conversations) {
      try {
        const contactId = await upsertContact(supabase, company.id, {
          platform: conv.platform || 'unknown',
          platformUserId: conv.participantId || conv.userId || 'unknown',
          username: conv.participantUsername || conv.username,
          displayName: conv.participantName || conv.displayName,
          avatarUrl: conv.participantAvatar,
        });

        const convKey = `dm-${conv.platform}-${conv.id || conv._id}`;
        const { data: existingConv } = await supabase
          .from('inbox_conversations')
          .select('id')
          .eq('company_id', company.id)
          .eq('platform_conversation_id', convKey)
          .maybeSingle();

        let conversationId: string;
        const latestMsg = conv.lastMessage || conv.messages?.[0];

        if (existingConv) {
          conversationId = existingConv.id;
          if (latestMsg) {
            await supabase
              .from('inbox_conversations')
              .update({
                last_message_at: latestMsg.createdAt || new Date().toISOString(),
                last_message_preview: (latestMsg.text || '').slice(0, 200),
              })
              .eq('id', conversationId);
          }
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('inbox_conversations')
            .insert({
              company_id: company.id,
              platform: conv.platform || 'unknown',
              platform_conversation_id: convKey,
              type: 'dm',
              status: 'open',
              subject: conv.participantName || conv.participantUsername || 'DM',
              contact_id: contactId,
              last_message_at: latestMsg?.createdAt || new Date().toISOString(),
              last_message_preview: latestMsg ? (latestMsg.text || '').slice(0, 200) : '',
            })
            .select('id')
            .single();

          if (convError) { result.errors.push(`DM conv insert: ${convError.message}`); continue; }
          conversationId = newConv.id;
        }

        // Insert messages
        const messages = conv.messages || (latestMsg ? [latestMsg] : []);
        for (const msg of messages) {
          const platformMsgId = msg.id || msg._id || `${conv.id}-${msg.createdAt}`;
          const { data: existingMsg } = await supabase
            .from('inbox_messages')
            .select('id')
            .eq('platform_message_id', platformMsgId)
            .eq('conversation_id', conversationId)
            .maybeSingle();

          if (!existingMsg) {
            const isFromUs = msg.isFromBrand || msg.direction === 'outbound';
            const { data: insertedDmMsg } = await supabase.from('inbox_messages').insert({
              conversation_id: conversationId,
              company_id: company.id,
              platform_message_id: platformMsgId,
              contact_id: isFromUs ? null : contactId,
              sender_type: isFromUs ? 'agent' : 'contact',
              content: msg.text || msg.message || '',
              content_type: msg.mediaUrl ? 'image' : 'text',
              media_url: msg.mediaUrl,
              metadata: { raw: msg },
              created_at: msg.createdAt || new Date().toISOString(),
            }).select('id, conversation_id, company_id, content, sender_type, contact_id').single();

            result.new_items++;

            // Check auto-respond for inbound DMs
            if (insertedDmMsg && !isFromUs) {
              try {
                const dmConv = { id: conversationId, platform: conv.platform || 'unknown', type: 'dm' as const, platform_conversation_id: convKey, post_id: null, contact_id: contactId };
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
    // Update display info
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
