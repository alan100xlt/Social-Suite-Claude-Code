import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let action = 'unknown';
  let companyId = '';
  let userId = '';

  try {
    const body = await req.json();
    ({ action, companyId } = body);
    const params = { ...body };
    delete params.action;
    delete params.companyId;

    // Authorize user for this company
    const auth = await authorize(req, { companyId });
    userId = auth.userId;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get company's GetLate profile ID
    const { data: company } = await supabase
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', companyId)
      .single();

    const profileId = company?.getlate_profile_id;

    let result: unknown;

    switch (action) {
      case 'list-conversations':
        result = await listConversations(supabase, companyId, params);
        break;
      case 'get-conversation':
        result = await getConversation(supabase, companyId, params.conversationId);
        break;
      case 'get-messages':
        result = await getMessages(supabase, companyId, params.conversationId, params);
        break;
      case 'reply-comment':
        result = await replyToComment(supabase, companyId, profileId, getlateApiKey, params);
        break;
      case 'reply-dm':
        result = await replyToDM(supabase, companyId, profileId, getlateApiKey, params);
        break;
      case 'like-comment':
        result = await likeComment(profileId, getlateApiKey, params);
        break;
      case 'update-status':
        result = await updateConversationStatus(supabase, companyId, params.conversationId, params.status);
        break;
      case 'assign':
        result = await assignConversation(supabase, companyId, params.conversationId, params.assigneeId);
        break;
      case 'mark-read':
        result = await markRead(supabase, auth.userId, params.conversationId);
        break;
      case 'add-label':
        result = await addLabel(supabase, companyId, params.conversationId, params.labelId);
        break;
      case 'remove-label':
        result = await removeLabel(supabase, companyId, params.conversationId, params.labelId);
        break;
      case 'add-note':
        result = await addInternalNote(supabase, companyId, params.conversationId, auth.userId, params.content);
        break;
      case 'search':
        result = await searchMessages(supabase, companyId, params.query);
        break;
      case 'list-labels':
        result = await listLabels(supabase, companyId);
        break;
      case 'create-label':
        result = await createLabel(supabase, companyId, params.name, params.color);
        break;
      case 'list-canned-replies':
        result = await listCannedReplies(supabase, companyId);
        break;
      case 'create-canned-reply':
        result = await createCannedReply(supabase, companyId, auth.userId, params);
        break;
      case 'update-canned-reply':
        result = await updateCannedReply(supabase, companyId, params.id, params);
        break;
      case 'delete-canned-reply':
        result = await deleteCannedReply(supabase, companyId, params.id);
        break;
      case 'bulk-update-status':
        result = await bulkUpdateStatus(supabase, companyId, params.conversationIds, params.status);
        break;
      case 'list-auto-rules':
        result = await listAutoRules(supabase, companyId);
        break;
      case 'create-auto-rule':
        result = await createAutoRule(supabase, companyId, auth.userId, params);
        break;
      case 'update-auto-rule':
        result = await updateAutoRule(supabase, companyId, params.id, params);
        break;
      case 'delete-auto-rule':
        result = await deleteAutoRule(supabase, companyId, params.id);
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Log successful action
    try {
      await supabase.from('api_call_logs' as any).insert({
        function_name: 'getlate-inbox',
        action,
        request_summary: JSON.stringify({ action, companyId, params: Object.keys(params) }).slice(0, 500),
        response_summary: JSON.stringify(result).slice(0, 500),
        success: true,
        duration_ms: Date.now() - startTime,
        company_id: companyId,
        user_id: userId,
        platform: params.platform || null,
      });
    } catch (logErr) {
      console.error('Failed to log api call:', logErr);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('getlate-inbox error:', error);

    // Log failed action
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const logClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await logClient.from('api_call_logs' as any).insert({
        function_name: 'getlate-inbox',
        action,
        request_summary: JSON.stringify({ action, companyId }).slice(0, 500),
        response_summary: String(error).slice(0, 500),
        success: false,
        duration_ms: Date.now() - startTime,
        company_id: companyId || null,
        user_id: userId || null,
      });
    } catch (logErr) {
      console.error('Failed to log api call error:', logErr);
    }

    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Actions ────────────────────────────────────────────────

async function listConversations(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  params: { status?: string; platform?: string; type?: string; assignedTo?: string; limit?: number; offset?: number }
) {
  let query = supabase
    .from('inbox_conversations')
    .select('*, contact:inbox_contacts(*), labels:inbox_conversation_labels(label:inbox_labels(*))')
    .eq('company_id', companyId)
    .order('last_message_at', { ascending: false });

  if (params.status) query = query.eq('status', params.status);
  if (params.platform) query = query.eq('platform', params.platform);
  if (params.type) query = query.eq('type', params.type);
  if (params.assignedTo) query = query.eq('assigned_to', params.assignedTo);

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  return { conversations: data || [] };
}

async function getConversation(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string
) {
  const { data, error } = await supabase
    .from('inbox_conversations')
    .select('*, contact:inbox_contacts(*), labels:inbox_conversation_labels(label:inbox_labels(*))')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .single();

  if (error) throw error;
  return { conversation: data };
}

async function getMessages(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  params: { limit?: number; before?: string }
) {
  let query = supabase
    .from('inbox_messages')
    .select('*, contact:inbox_contacts(*)')
    .eq('conversation_id', conversationId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (params.before) query = query.lt('created_at', params.before);
  const limit = params.limit || 100;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return { messages: data || [] };
}

async function replyToComment(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  profileId: string | null,
  apiKey: string,
  params: { conversationId: string; content: string; parentCommentId?: string }
) {
  // Get conversation to find platform info — verify it belongs to this company
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('platform, platform_conversation_id, post_id')
    .eq('id', params.conversationId)
    .eq('company_id', companyId)
    .single();

  if (!conv) throw new Error('Conversation not found or does not belong to this company');

  // Send reply via GetLate API
  const response = await fetch(`${GETLATE_API_URL}/inbox/comments/reply`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      postId: conv.post_id,
      text: params.content,
      parentCommentId: params.parentCommentId,
      platform: conv.platform,
    }),
  });

  const apiResult = await response.json();

  // Store the reply in our messages table
  const { data: message, error } = await supabase
    .from('inbox_messages')
    .insert({
      conversation_id: params.conversationId,
      company_id: companyId,
      platform_message_id: apiResult.commentId || apiResult.id,
      sender_type: 'agent',
      content: params.content,
      content_type: 'text',
      metadata: { apiResponse: apiResult },
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation
  await supabase
    .from('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: params.content.slice(0, 200),
    })
    .eq('id', params.conversationId);

  return { message, apiResult };
}

async function replyToDM(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  profileId: string | null,
  apiKey: string,
  params: { conversationId: string; content: string; mediaUrl?: string }
) {
  // Verify conversation belongs to this company
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('platform, platform_conversation_id')
    .eq('id', params.conversationId)
    .eq('company_id', companyId)
    .single();

  if (!conv) throw new Error('Conversation not found or does not belong to this company');

  const dmConvId = conv.platform_conversation_id?.replace(`dm-${conv.platform}-`, '');

  const response = await fetch(`${GETLATE_API_URL}/inbox/conversations/${dmConvId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      conversationId: dmConvId,
      text: params.content,
      mediaUrl: params.mediaUrl,
      platform: conv.platform,
    }),
  });

  const apiResult = await response.json();

  const { data: message, error } = await supabase
    .from('inbox_messages')
    .insert({
      conversation_id: params.conversationId,
      company_id: companyId,
      platform_message_id: apiResult.messageId || apiResult.id,
      sender_type: 'agent',
      content: params.content,
      content_type: params.mediaUrl ? 'image' : 'text',
      media_url: params.mediaUrl,
      metadata: { apiResponse: apiResult },
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: params.content.slice(0, 200),
      status: 'pending',
    })
    .eq('id', params.conversationId);

  return { message, apiResult };
}

async function likeComment(
  profileId: string | null,
  apiKey: string,
  params: { commentId: string; platform: string; unlike?: boolean }
) {
  const url = params.unlike
    ? `${GETLATE_API_URL}/inbox/comments/${params.commentId}/unlike`
    : `${GETLATE_API_URL}/inbox/comments/${params.commentId}/like`;
  const method = params.unlike ? 'DELETE' : 'POST';
  const response = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, commentId: params.commentId, platform: params.platform }),
  });

  return await response.json();
}

async function updateConversationStatus(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('inbox_conversations')
    .update({ status })
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return { conversation: data };
}

async function assignConversation(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  assigneeId: string | null
) {
  const { data, error } = await supabase
    .from('inbox_conversations')
    .update({ assigned_to: assigneeId })
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return { conversation: data };
}

async function markRead(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  conversationId: string
) {
  const { error } = await supabase
    .from('inbox_read_status')
    .upsert({
      user_id: userId,
      conversation_id: conversationId,
      last_read_at: new Date().toISOString(),
    });

  if (error) throw error;
  return { marked: true };
}

async function addLabel(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  labelId: string
) {
  // Verify label belongs to company
  const { data: label } = await supabase
    .from('inbox_labels')
    .select('id')
    .eq('id', labelId)
    .eq('company_id', companyId)
    .single();

  if (!label) throw new Error('Label not found');

  const { error } = await supabase
    .from('inbox_conversation_labels')
    .insert({ conversation_id: conversationId, label_id: labelId });

  if (error && !error.message.includes('duplicate')) throw error;
  return { added: true };
}

async function removeLabel(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  labelId: string
) {
  // Verify conversation belongs to this company before removing label
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .single();

  if (!conv) throw new Error('Conversation not found or does not belong to this company');

  const { error } = await supabase
    .from('inbox_conversation_labels')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('label_id', labelId);

  if (error) throw error;
  return { removed: true };
}

async function addInternalNote(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  userId: string,
  content: string
) {
  const { data, error } = await supabase
    .from('inbox_messages')
    .insert({
      conversation_id: conversationId,
      company_id: companyId,
      sender_type: 'system',
      sender_user_id: userId,
      content,
      content_type: 'note',
      is_internal_note: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { note: data };
}

async function searchMessages(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  query: string
) {
  const { data, error } = await supabase
    .from('inbox_messages')
    .select('*, conversation:inbox_conversations(id, platform, type, subject, contact:inbox_contacts(*))')
    .eq('company_id', companyId)
    .textSearch('fts', query, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return { results: data || [] };
}

async function listLabels(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data, error } = await supabase
    .from('inbox_labels')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return { labels: data || [] };
}

async function createLabel(supabase: ReturnType<typeof createClient>, companyId: string, name: string, color?: string) {
  const { data, error } = await supabase
    .from('inbox_labels')
    .insert({ company_id: companyId, name, color: color || '#6c7bf0' })
    .select()
    .single();

  if (error) throw error;
  return { label: data };
}

async function listCannedReplies(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data, error } = await supabase
    .from('inbox_canned_replies')
    .select('*')
    .eq('company_id', companyId)
    .order('title');

  if (error) throw error;
  return { cannedReplies: data || [] };
}

async function createCannedReply(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  params: { title: string; content: string; shortcut?: string; platform?: string }
) {
  const { data, error } = await supabase
    .from('inbox_canned_replies')
    .insert({
      company_id: companyId,
      title: params.title,
      content: params.content,
      shortcut: params.shortcut,
      platform: params.platform,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return { cannedReply: data };
}

async function updateCannedReply(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  id: string,
  params: { title?: string; content?: string; shortcut?: string; platform?: string }
) {
  const updates: Record<string, unknown> = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.content !== undefined) updates.content = params.content;
  if (params.shortcut !== undefined) updates.shortcut = params.shortcut;
  if (params.platform !== undefined) updates.platform = params.platform;

  const { data, error } = await supabase
    .from('inbox_canned_replies')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return { cannedReply: data };
}

async function deleteCannedReply(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  id: string
) {
  const { error } = await supabase
    .from('inbox_canned_replies')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) throw error;
  return { deleted: true };
}

async function bulkUpdateStatus(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationIds: string[],
  status: string
) {
  const { error } = await supabase
    .from('inbox_conversations')
    .update({ status })
    .eq('company_id', companyId)
    .in('id', conversationIds);

  if (error) throw error;
  return { updated: conversationIds.length };
}

async function listAutoRules(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data, error } = await supabase
    .from('inbox_auto_rules')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return { rules: data || [] };
}

async function createAutoRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  params: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('inbox_auto_rules')
    .insert({
      company_id: companyId,
      name: params.name,
      enabled: params.enabled ?? true,
      trigger_type: params.trigger_type,
      trigger_value: params.trigger_value,
      trigger_platform: params.trigger_platform,
      trigger_conversation_type: params.trigger_conversation_type,
      action_type: params.action_type,
      canned_reply_id: params.canned_reply_id,
      ai_prompt_template: params.ai_prompt_template,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return { rule: data };
}

async function updateAutoRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  id: string,
  params: Record<string, unknown>
) {
  const updates: Record<string, unknown> = {};
  const fields = ['name', 'enabled', 'trigger_type', 'trigger_value', 'trigger_platform',
    'trigger_conversation_type', 'action_type', 'canned_reply_id', 'ai_prompt_template'];
  for (const f of fields) {
    if (params[f] !== undefined) updates[f] = params[f];
  }

  const { data, error } = await supabase
    .from('inbox_auto_rules')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return { rule: data };
}

async function deleteAutoRule(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  id: string
) {
  const { error } = await supabase
    .from('inbox_auto_rules')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) throw error;
  return { deleted: true };
}
