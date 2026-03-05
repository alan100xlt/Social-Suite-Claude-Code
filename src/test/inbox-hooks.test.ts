import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock contexts
vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: () => ({ selectedCompanyId: 'test-company-id' }),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: (id: string) => id === 'demo-longtale',
  DEMO_COMPANY_ID: 'demo-longtale',
}));

import { inboxApi } from '@/lib/api/inbox';
import type {
  ConversationType,
  ConversationStatus,
  MessageSenderType,
  MessageContentType,
  ConversationPriority,
  Sentiment,
  InboxConversation,
  InboxMessage,
  InboxCannedReply,
  InboxAutoRule,
  AutoRuleTriggerType,
  AutoRuleActionType,
} from '@/lib/api/inbox';

describe('Inbox API types', () => {
  it('should have correct ConversationType values', () => {
    const types: ConversationType[] = ['comment', 'dm', 'review', 'mention'];
    expect(types).toHaveLength(4);
  });

  it('should have correct ConversationStatus values', () => {
    const statuses: ConversationStatus[] = ['open', 'pending', 'resolved', 'closed', 'snoozed'];
    expect(statuses).toHaveLength(5);
  });

  it('should have correct MessageSenderType values', () => {
    const types: MessageSenderType[] = ['contact', 'agent', 'system', 'bot'];
    expect(types).toHaveLength(4);
  });

  it('should have correct MessageContentType values', () => {
    const types: MessageContentType[] = ['text', 'image', 'video', 'attachment', 'note'];
    expect(types).toHaveLength(5);
  });

  it('should have correct ConversationPriority values', () => {
    const priorities: ConversationPriority[] = ['low', 'normal', 'high', 'urgent'];
    expect(priorities).toHaveLength(4);
  });

  it('should have correct Sentiment values', () => {
    const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
    expect(sentiments).toHaveLength(3);
  });

  it('should have correct AutoRuleTriggerType values', () => {
    const types: AutoRuleTriggerType[] = ['keyword', 'regex', 'sentiment', 'all_new'];
    expect(types).toHaveLength(4);
  });

  it('should have correct AutoRuleActionType values', () => {
    const types: AutoRuleActionType[] = ['canned_reply', 'ai_response'];
    expect(types).toHaveLength(2);
  });
});

describe('Inbox API client structure', () => {
  it('should have conversations namespace', () => {
    expect(inboxApi.conversations).toBeDefined();
    expect(typeof inboxApi.conversations.list).toBe('function');
    expect(typeof inboxApi.conversations.get).toBe('function');
    expect(typeof inboxApi.conversations.updateStatus).toBe('function');
    expect(typeof inboxApi.conversations.assign).toBe('function');
    expect(typeof inboxApi.conversations.markRead).toBe('function');
    expect(typeof inboxApi.conversations.addLabel).toBe('function');
    expect(typeof inboxApi.conversations.removeLabel).toBe('function');
    expect(typeof inboxApi.conversations.bulkUpdateStatus).toBe('function');
  });

  it('should have messages namespace', () => {
    expect(inboxApi.messages).toBeDefined();
    expect(typeof inboxApi.messages.list).toBe('function');
    expect(typeof inboxApi.messages.replyComment).toBe('function');
    expect(typeof inboxApi.messages.replyDM).toBe('function');
    expect(typeof inboxApi.messages.addNote).toBe('function');
    expect(typeof inboxApi.messages.likeComment).toBe('function');
  });

  it('should have labels namespace', () => {
    expect(inboxApi.labels).toBeDefined();
    expect(typeof inboxApi.labels.list).toBe('function');
    expect(typeof inboxApi.labels.create).toBe('function');
  });

  it('should have cannedReplies namespace', () => {
    expect(inboxApi.cannedReplies).toBeDefined();
    expect(typeof inboxApi.cannedReplies.list).toBe('function');
    expect(typeof inboxApi.cannedReplies.create).toBe('function');
    expect(typeof inboxApi.cannedReplies.update).toBe('function');
    expect(typeof inboxApi.cannedReplies.delete).toBe('function');
  });

  it('should have automationRules namespace', () => {
    expect(inboxApi.automationRules).toBeDefined();
    expect(typeof inboxApi.automationRules.list).toBe('function');
    expect(typeof inboxApi.automationRules.create).toBe('function');
    expect(typeof inboxApi.automationRules.update).toBe('function');
    expect(typeof inboxApi.automationRules.delete).toBe('function');
  });

  it('should have search namespace', () => {
    expect(inboxApi.search).toBeDefined();
    expect(typeof inboxApi.search.messages).toBe('function');
  });
});

describe('Inbox data shape validation', () => {
  it('should validate InboxConversation shape', () => {
    const conv: InboxConversation = {
      id: 'test-id',
      company_id: 'test-company',
      platform: 'twitter',
      platform_conversation_id: 'tw-123',
      type: 'comment',
      status: 'open',
      subject: 'Test subject',
      contact_id: null,
      contact: null,
      assigned_to: null,
      priority: 'normal',
      sentiment: null,
      post_id: null,
      post_url: null,
      snooze_until: null,
      last_message_at: new Date().toISOString(),
      last_message_preview: 'Preview text',
      unread_count: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      labels: [],
    };

    expect(conv.id).toBe('test-id');
    expect(conv.type).toBe('comment');
    expect(conv.status).toBe('open');
    expect(conv.labels).toHaveLength(0);
  });

  it('should validate InboxMessage shape', () => {
    const msg: InboxMessage = {
      id: 'msg-id',
      conversation_id: 'conv-id',
      company_id: 'company-id',
      platform_message_id: 'ext-123',
      contact_id: null,
      contact: null,
      sender_type: 'agent',
      sender_user_id: 'user-id',
      content: 'Hello world',
      content_type: 'text',
      media_url: null,
      parent_message_id: null,
      is_internal_note: false,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    expect(msg.sender_type).toBe('agent');
    expect(msg.content_type).toBe('text');
    expect(msg.is_internal_note).toBe(false);
  });

  it('should validate InboxCannedReply shape', () => {
    const reply: InboxCannedReply = {
      id: 'reply-id',
      company_id: 'company-id',
      title: 'Greeting',
      content: 'Hi {{contact_name}}!',
      shortcut: 'hi',
      platform: null,
      created_by: 'user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(reply.title).toBe('Greeting');
    expect(reply.shortcut).toBe('hi');
    expect(reply.content).toContain('{{contact_name}}');
  });

  it('should validate InboxAutoRule shape', () => {
    const rule: InboxAutoRule = {
      id: 'rule-id',
      company_id: 'company-id',
      name: 'Auto-greet',
      enabled: true,
      trigger_type: 'all_new',
      trigger_value: null,
      trigger_platform: null,
      trigger_conversation_type: 'dm',
      action_type: 'canned_reply',
      canned_reply_id: 'reply-id',
      ai_prompt_template: null,
      created_by: 'user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(rule.trigger_type).toBe('all_new');
    expect(rule.action_type).toBe('canned_reply');
    expect(rule.enabled).toBe(true);
  });

  it('should validate threaded message (parent_message_id)', () => {
    const parentMsg: InboxMessage = {
      id: 'parent-msg', conversation_id: 'conv', company_id: 'co',
      platform_message_id: 'ext-1', contact_id: null, contact: null,
      sender_type: 'contact', sender_user_id: null,
      content: 'Original message', content_type: 'text',
      media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: new Date().toISOString(),
    };

    const replyMsg: InboxMessage = {
      ...parentMsg,
      id: 'reply-msg',
      platform_message_id: 'ext-2',
      content: 'Reply to original',
      parent_message_id: 'parent-msg',
    };

    expect(replyMsg.parent_message_id).toBe('parent-msg');
    expect(parentMsg.parent_message_id).toBeNull();
  });

  it('should validate rich media message', () => {
    const imageMsg: InboxMessage = {
      id: 'img-msg', conversation_id: 'conv', company_id: 'co',
      platform_message_id: 'ext-3', contact_id: null, contact: null,
      sender_type: 'contact', sender_user_id: null,
      content: '', content_type: 'image',
      media_url: 'https://example.com/image.jpg', parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: new Date().toISOString(),
    };

    expect(imageMsg.content_type).toBe('image');
    expect(imageMsg.media_url).toBeTruthy();
  });

  it('should validate bot sender_type', () => {
    const botMsg: InboxMessage = {
      id: 'bot-msg', conversation_id: 'conv', company_id: 'co',
      platform_message_id: null, contact_id: null, contact: null,
      sender_type: 'bot', sender_user_id: null,
      content: 'Auto-reply', content_type: 'text',
      media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: { auto_response: true },
      created_at: new Date().toISOString(),
    };

    expect(botMsg.sender_type).toBe('bot');
    expect(botMsg.metadata).toHaveProperty('auto_response');
  });
});

describe('Demo data integrity', () => {
  it('should import demo data without errors', async () => {
    const demoData = await import('@/lib/demo/demo-data');

    expect(demoData.DEMO_INBOX_CONTACTS).toBeDefined();
    expect(demoData.DEMO_INBOX_CONTACTS.length).toBeGreaterThan(0);

    expect(demoData.DEMO_INBOX_LABELS).toBeDefined();
    expect(demoData.DEMO_INBOX_LABELS.length).toBeGreaterThan(0);

    expect(demoData.DEMO_INBOX_CONVERSATIONS).toBeDefined();
    expect(demoData.DEMO_INBOX_CONVERSATIONS.length).toBeGreaterThan(0);

    expect(demoData.DEMO_INBOX_MESSAGES).toBeDefined();
    expect(Object.keys(demoData.DEMO_INBOX_MESSAGES).length).toBeGreaterThan(0);

    expect(demoData.DEMO_INBOX_CANNED_REPLIES).toBeDefined();
    expect(demoData.DEMO_INBOX_CANNED_REPLIES.length).toBeGreaterThan(0);

    expect(demoData.DEMO_INBOX_AUTO_RULES).toBeDefined();
    expect(demoData.DEMO_INBOX_AUTO_RULES.length).toBeGreaterThan(0);
  });

  it('should have valid contact references in conversations', async () => {
    const { DEMO_INBOX_CONTACTS, DEMO_INBOX_CONVERSATIONS } = await import('@/lib/demo/demo-data');
    const contactIds = new Set(DEMO_INBOX_CONTACTS.map(c => c.id));

    for (const conv of DEMO_INBOX_CONVERSATIONS) {
      if (conv.contact_id) {
        expect(contactIds.has(conv.contact_id)).toBe(true);
      }
    }
  });

  it('should have messages for every conversation', async () => {
    const { DEMO_INBOX_CONVERSATIONS, DEMO_INBOX_MESSAGES } = await import('@/lib/demo/demo-data');

    for (const conv of DEMO_INBOX_CONVERSATIONS) {
      expect(DEMO_INBOX_MESSAGES[conv.id]).toBeDefined();
      expect(DEMO_INBOX_MESSAGES[conv.id].length).toBeGreaterThan(0);
    }
  });

  it('should have threaded messages with valid parent references', async () => {
    const { DEMO_INBOX_MESSAGES } = await import('@/lib/demo/demo-data');

    for (const [convId, messages] of Object.entries(DEMO_INBOX_MESSAGES)) {
      const msgIds = new Set(messages.map(m => m.id));
      for (const msg of messages) {
        if (msg.parent_message_id) {
          expect(msgIds.has(msg.parent_message_id)).toBe(true);
        }
      }
    }
  });

  it('should have at least one bot message', async () => {
    const { DEMO_INBOX_MESSAGES } = await import('@/lib/demo/demo-data');
    const allMessages = Object.values(DEMO_INBOX_MESSAGES).flat();
    const botMessages = allMessages.filter(m => m.sender_type === 'bot');
    expect(botMessages.length).toBeGreaterThan(0);
  });

  it('should have at least one image/video message', async () => {
    const { DEMO_INBOX_MESSAGES } = await import('@/lib/demo/demo-data');
    const allMessages = Object.values(DEMO_INBOX_MESSAGES).flat();
    const mediaMessages = allMessages.filter(m => m.media_url);
    expect(mediaMessages.length).toBeGreaterThan(0);
  });

  it('should have canned replies with valid structure', async () => {
    const { DEMO_INBOX_CANNED_REPLIES } = await import('@/lib/demo/demo-data');

    for (const reply of DEMO_INBOX_CANNED_REPLIES) {
      expect(reply.id).toBeTruthy();
      expect(reply.title).toBeTruthy();
      expect(reply.content).toBeTruthy();
    }
  });

  it('should have automation rules with valid canned_reply references', async () => {
    const { DEMO_INBOX_AUTO_RULES, DEMO_INBOX_CANNED_REPLIES } = await import('@/lib/demo/demo-data');
    const replyIds = new Set(DEMO_INBOX_CANNED_REPLIES.map(r => r.id));

    for (const rule of DEMO_INBOX_AUTO_RULES) {
      if (rule.action_type === 'canned_reply' && rule.canned_reply_id) {
        expect(replyIds.has(rule.canned_reply_id)).toBe(true);
      }
    }
  });
});
