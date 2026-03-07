/**
 * Shared inbox processing module.
 * Used by: inbox-sync (polling), getlate-webhook (real-time)
 *
 * Ensures identical contact upsert, conversation upsert, message dedup,
 * and article linking logic across both ingestion paths.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SupabaseClient = ReturnType<typeof createClient>;

// ─── Contact Upsert ──────────────────────────────────────────

export interface ContactData {
  platform: string;
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export async function upsertContact(
  supabase: SupabaseClient,
  companyId: string,
  contact: ContactData
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

// ─── Conversation Upsert ─────────────────────────────────────

export interface ConversationData {
  platform: string;
  platformConversationId: string;
  type: 'dm' | 'comment' | 'review';
  subject?: string;
  contactId: string;
  postId?: string | null;
  postUrl?: string | null;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export interface UpsertConversationResult {
  id: string;
  isNew: boolean;
}

export async function upsertConversation(
  supabase: SupabaseClient,
  companyId: string,
  data: ConversationData
): Promise<UpsertConversationResult> {
  const { data: existing } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('company_id', companyId)
    .eq('platform_conversation_id', data.platformConversationId)
    .maybeSingle();

  if (existing) {
    await supabase.from('inbox_conversations').update({
      last_message_at: data.lastMessageAt || new Date().toISOString(),
      last_message_preview: (data.lastMessagePreview || '').slice(0, 200),
    }).eq('id', existing.id);
    return { id: existing.id, isNew: false };
  }

  const insertData: Record<string, unknown> = {
    company_id: companyId,
    platform: data.platform,
    platform_conversation_id: data.platformConversationId,
    type: data.type,
    status: 'open',
    subject: data.subject || (data.type === 'dm' ? 'DM' : 'Comment thread'),
    contact_id: data.contactId,
    last_message_at: data.lastMessageAt || new Date().toISOString(),
    last_message_preview: (data.lastMessagePreview || '').slice(0, 200),
  };

  if (data.postId) insertData.post_id = data.postId;
  if (data.postUrl) insertData.post_url = data.postUrl;
  if (data.unreadCount != null) insertData.unread_count = data.unreadCount;

  const { data: newConv, error } = await supabase
    .from('inbox_conversations')
    .insert(insertData)
    .select('id')
    .single();

  if (error) throw error;
  return { id: newConv.id, isNew: true };
}

// ─── Message Insert (with dedup) ─────────────────────────────

export interface MessageData {
  platformMessageId: string;
  contactId: string | null;
  senderType: 'contact' | 'agent' | 'bot';
  content: string;
  contentType?: string;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface InsertMessageResult {
  id: string;
  inserted: boolean;
  message?: {
    id: string;
    conversation_id: string;
    company_id: string;
    content: string;
    sender_type: string;
    contact_id: string | null;
  };
}

export async function insertMessageIfNew(
  supabase: SupabaseClient,
  companyId: string,
  conversationId: string,
  data: MessageData
): Promise<InsertMessageResult> {
  if (!data.platformMessageId) {
    return { id: '', inserted: false };
  }

  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('platform_message_id', data.platformMessageId)
    .eq('conversation_id', conversationId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, inserted: false };
  }

  const { data: inserted, error } = await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    company_id: companyId,
    platform_message_id: data.platformMessageId,
    contact_id: data.contactId,
    sender_type: data.senderType,
    content: data.content,
    content_type: data.contentType || 'text',
    media_url: data.mediaUrl || undefined,
    metadata: data.metadata || {},
    created_at: data.createdAt || new Date().toISOString(),
  }).select('id, conversation_id, company_id, content, sender_type, contact_id').single();

  if (error) {
    // Handle race condition: unique constraint violation means another path inserted first
    if (error.code === '23505') {
      return { id: '', inserted: false };
    }
    throw error;
  }

  return { id: inserted.id, inserted: true, message: inserted };
}

// ─── Article Linking ─────────────────────────────────────────

export async function linkArticleToConversation(
  supabase: SupabaseClient,
  postId: string,
  conversationId: string,
  companyId?: string
): Promise<void> {
  try {
    // Scope to company's feeds to prevent cross-tenant article data leak
    let query = supabase
      .from('rss_feed_items')
      .select('link, title, rss_feeds!inner(company_id)')
      .eq('post_id', postId);

    if (companyId) {
      query = query.eq('rss_feeds.company_id', companyId);
    }

    const { data: feedItem } = await query.maybeSingle();

    if (feedItem?.link) {
      await supabase.from('inbox_conversations').update({
        article_url: feedItem.link,
        article_title: feedItem.title,
      }).eq('id', conversationId);
    }
  } catch {
    // Non-fatal — article linking is best-effort
  }
}
