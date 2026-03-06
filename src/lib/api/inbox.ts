import { supabase } from '@/integrations/supabase/client';
import type { Platform } from './getlate';

// ─── Types ──────────────────────────────────────────────────

export type ConversationType = 'comment' | 'dm' | 'review' | 'mention';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'snoozed';
export type MessageSenderType = 'contact' | 'agent' | 'system' | 'bot';
export type MessageContentType = 'text' | 'image' | 'video' | 'attachment' | 'note';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface InboxContact {
  id: string;
  company_id: string;
  platform: string;
  platform_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InboxLabel {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export type MessageCategory = 'editorial' | 'business' | 'support' | 'community' | 'noise' | 'general';

export interface InboxConversation {
  id: string;
  company_id: string;
  platform: string;
  platform_conversation_id: string | null;
  type: ConversationType;
  status: ConversationStatus;
  subject: string | null;
  contact_id: string | null;
  contact: InboxContact | null;
  assigned_to: string | null;
  priority: ConversationPriority;
  sentiment: Sentiment | null;
  post_id: string | null;
  post_url: string | null;
  snooze_until: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  labels: Array<{ label: InboxLabel }>;
  // AI classification columns (Phase 1)
  message_type: MessageCategory | null;
  message_subtype: string | null;
  editorial_value: number | null;
  detected_language: string | null;
  ai_classified_at: string | null;
  correction_status: 'received' | 'reviewing' | 'fixed' | null;
  article_url: string | null;
  article_title: string | null;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  platform_message_id: string | null;
  contact_id: string | null;
  contact: InboxContact | null;
  sender_type: MessageSenderType;
  sender_user_id: string | null;
  content: string;
  content_type: MessageContentType;
  media_url: string | null;
  parent_message_id: string | null;
  is_internal_note: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InboxCannedReply {
  id: string;
  company_id: string;
  title: string;
  content: string;
  shortcut: string | null;
  platform: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AutoRuleTriggerType = 'keyword' | 'regex' | 'sentiment' | 'all_new';
export type AutoRuleActionType = 'canned_reply' | 'ai_response';

export interface InboxAutoRule {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  trigger_type: AutoRuleTriggerType;
  trigger_value: string | null;
  trigger_platform: string | null;
  trigger_conversation_type: string | null;
  action_type: AutoRuleActionType;
  canned_reply_id: string | null;
  ai_prompt_template: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type ApiResponse<T> = {
  success: boolean;
  error?: string;
} & T;

// ─── API Methods ────────────────────────────────────────────

async function invokeInbox<T>(body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('getlate-inbox', { body });
  if (error) return { success: false, error: error.message } as ApiResponse<T>;
  return data as ApiResponse<T>;
}

export const inboxApi = {
  conversations: {
    async list(companyId: string, params?: {
      status?: ConversationStatus;
      platform?: string;
      type?: ConversationType;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    }) {
      return invokeInbox<{ conversations: InboxConversation[] }>({
        action: 'list-conversations', companyId, ...params,
      });
    },

    async get(companyId: string, conversationId: string) {
      return invokeInbox<{ conversation: InboxConversation }>({
        action: 'get-conversation', companyId, conversationId,
      });
    },

    async updateStatus(companyId: string, conversationId: string, status: ConversationStatus) {
      return invokeInbox<{ conversation: InboxConversation }>({
        action: 'update-status', companyId, conversationId, status,
      });
    },

    async assign(companyId: string, conversationId: string, assigneeId: string | null) {
      return invokeInbox<{ conversation: InboxConversation }>({
        action: 'assign', companyId, conversationId, assigneeId,
      });
    },

    async markRead(companyId: string, conversationId: string) {
      return invokeInbox<{ marked: boolean }>({
        action: 'mark-read', companyId, conversationId,
      });
    },

    async bulkUpdateStatus(companyId: string, conversationIds: string[], status: ConversationStatus) {
      return invokeInbox<{ updated: number }>({
        action: 'bulk-update-status', companyId, conversationIds, status,
      });
    },

    async addLabel(companyId: string, conversationId: string, labelId: string) {
      return invokeInbox<{ added: boolean }>({
        action: 'add-label', companyId, conversationId, labelId,
      });
    },

    async removeLabel(companyId: string, conversationId: string, labelId: string) {
      return invokeInbox<{ removed: boolean }>({
        action: 'remove-label', companyId, conversationId, labelId,
      });
    },
  },

  messages: {
    async list(companyId: string, conversationId: string, params?: { limit?: number; before?: string }) {
      return invokeInbox<{ messages: InboxMessage[] }>({
        action: 'get-messages', companyId, conversationId, ...params,
      });
    },

    async replyComment(companyId: string, conversationId: string, content: string, parentCommentId?: string) {
      return invokeInbox<{ message: InboxMessage }>({
        action: 'reply-comment', companyId, conversationId, content, parentCommentId,
      });
    },

    async replyDM(companyId: string, conversationId: string, content: string, mediaUrl?: string) {
      return invokeInbox<{ message: InboxMessage }>({
        action: 'reply-dm', companyId, conversationId, content, mediaUrl,
      });
    },

    async addNote(companyId: string, conversationId: string, content: string) {
      return invokeInbox<{ note: InboxMessage }>({
        action: 'add-note', companyId, conversationId, content,
      });
    },

    async likeComment(companyId: string, commentId: string, platform: string, unlike?: boolean) {
      return invokeInbox<Record<string, unknown>>({
        action: 'like-comment', companyId, commentId, platform, unlike,
      });
    },
  },

  labels: {
    async list(companyId: string) {
      return invokeInbox<{ labels: InboxLabel[] }>({
        action: 'list-labels', companyId,
      });
    },

    async create(companyId: string, name: string, color?: string) {
      return invokeInbox<{ label: InboxLabel }>({
        action: 'create-label', companyId, name, color,
      });
    },
  },

  cannedReplies: {
    async list(companyId: string) {
      return invokeInbox<{ cannedReplies: InboxCannedReply[] }>({
        action: 'list-canned-replies', companyId,
      });
    },

    async create(companyId: string, params: { title: string; content: string; shortcut?: string; platform?: string }) {
      return invokeInbox<{ cannedReply: InboxCannedReply }>({
        action: 'create-canned-reply', companyId, ...params,
      });
    },

    async update(companyId: string, id: string, params: { title?: string; content?: string; shortcut?: string; platform?: string }) {
      return invokeInbox<{ cannedReply: InboxCannedReply }>({
        action: 'update-canned-reply', companyId, id, ...params,
      });
    },

    async delete(companyId: string, id: string) {
      return invokeInbox<{ deleted: boolean }>({
        action: 'delete-canned-reply', companyId, id,
      });
    },
  },

  automationRules: {
    async list(companyId: string) {
      return invokeInbox<{ rules: InboxAutoRule[] }>({
        action: 'list-auto-rules', companyId,
      });
    },

    async create(companyId: string, params: Omit<InboxAutoRule, 'id' | 'company_id' | 'created_by' | 'created_at' | 'updated_at'>) {
      return invokeInbox<{ rule: InboxAutoRule }>({
        action: 'create-auto-rule', companyId, ...params,
      });
    },

    async update(companyId: string, id: string, params: Partial<InboxAutoRule>) {
      return invokeInbox<{ rule: InboxAutoRule }>({
        action: 'update-auto-rule', companyId, id, ...params,
      });
    },

    async delete(companyId: string, id: string) {
      return invokeInbox<{ deleted: boolean }>({
        action: 'delete-auto-rule', companyId, id,
      });
    },
  },

  search: {
    async messages(companyId: string, query: string) {
      return invokeInbox<{ results: InboxMessage[] }>({
        action: 'search', companyId, query,
      });
    },
  },
};
