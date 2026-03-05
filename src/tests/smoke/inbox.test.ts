import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: () => ({ selectedCompanyId: 'demo-longtale' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'demo-user', email: 'demo@test.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: (id: string) => id === 'demo-longtale',
  DEMO_COMPANY_ID: 'demo-longtale',
  DEMO_COMPANY: { id: 'demo-longtale', name: 'Longtale Demo' },
}));

describe('Inbox smoke tests', () => {
  it('should import InboxPage without errors', async () => {
    const module = await import('@/pages/Inbox');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import all inbox components without errors', async () => {
    const components = await Promise.all([
      import('@/components/inbox/ConversationList'),
      import('@/components/inbox/ConversationThread'),
      import('@/components/inbox/ConversationHeader'),
      import('@/components/inbox/MessageComposer'),
      import('@/components/inbox/InboxFilters'),
      import('@/components/inbox/InboxLayout'),
      import('@/components/inbox/ContactDetailPanel'),
      import('@/components/inbox/BulkActionBar'),
      import('@/components/inbox/SearchResults'),
      import('@/components/inbox/CannedReplyPicker'),
      import('@/components/inbox/CannedReplyManager'),
      import('@/components/inbox/AutomationRulesManager'),
      import('@/components/inbox/AISuggestionsPanel'),
      import('@/components/inbox/SentimentBadge'),
      import('@/components/inbox/ChatBubble'),
      import('@/components/inbox/ThreadedMessages'),
    ]);

    components.forEach((mod, i) => {
      const exported = Object.values(mod);
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  it('should import all inbox hooks without errors', async () => {
    const hooks = await Promise.all([
      import('@/hooks/useInboxConversations'),
      import('@/hooks/useInboxMessages'),
      import('@/hooks/useInboxLabels'),
      import('@/hooks/useInboxSearch'),
      import('@/hooks/useInboxRealtime'),
      import('@/hooks/useInboxAI'),
      import('@/hooks/useInboxAutomationRules'),
    ]);

    hooks.forEach((mod) => {
      const exported = Object.values(mod);
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  it('should have correct hook exports from useInboxConversations', async () => {
    const mod = await import('@/hooks/useInboxConversations');
    expect(typeof mod.useInboxConversations).toBe('function');
    expect(typeof mod.useInboxConversation).toBe('function');
    expect(typeof mod.useUpdateConversationStatus).toBe('function');
    expect(typeof mod.useAssignConversation).toBe('function');
    expect(typeof mod.useMarkConversationRead).toBe('function');
    expect(typeof mod.useBulkUpdateStatus).toBe('function');
  });

  it('should have correct hook exports from useInboxMessages', async () => {
    const mod = await import('@/hooks/useInboxMessages');
    expect(typeof mod.useInboxMessages).toBe('function');
    expect(typeof mod.useReplyToComment).toBe('function');
    expect(typeof mod.useReplyToDM).toBe('function');
    expect(typeof mod.useAddInternalNote).toBe('function');
    expect(typeof mod.useLikeComment).toBe('function');
  });

  it('should have correct hook exports from useInboxLabels', async () => {
    const mod = await import('@/hooks/useInboxLabels');
    expect(typeof mod.useInboxLabels).toBe('function');
    expect(typeof mod.useCreateInboxLabel).toBe('function');
    expect(typeof mod.useInboxCannedReplies).toBe('function');
    expect(typeof mod.useCreateCannedReply).toBe('function');
    expect(typeof mod.useAddConversationLabel).toBe('function');
    expect(typeof mod.useRemoveConversationLabel).toBe('function');
  });

  it('should have correct hook exports from useInboxAutomationRules', async () => {
    const mod = await import('@/hooks/useInboxAutomationRules');
    expect(typeof mod.useInboxAutoRules).toBe('function');
    expect(typeof mod.useCreateAutoRule).toBe('function');
    expect(typeof mod.useUpdateAutoRule).toBe('function');
    expect(typeof mod.useDeleteAutoRule).toBe('function');
  });

  it('should have correct hook exports from useInboxAI', async () => {
    const mod = await import('@/hooks/useInboxAI');
    expect(typeof mod.useAnalyzeSentiment).toBe('function');
    expect(typeof mod.useSuggestReply).toBe('function');
    expect(typeof mod.useSummarizeThread).toBe('function');
  });

  it('should load API client with all namespaces', async () => {
    const { inboxApi } = await import('@/lib/api/inbox');
    expect(inboxApi.conversations).toBeDefined();
    expect(inboxApi.messages).toBeDefined();
    expect(inboxApi.labels).toBeDefined();
    expect(inboxApi.cannedReplies).toBeDefined();
    expect(inboxApi.automationRules).toBeDefined();
    expect(inboxApi.search).toBeDefined();
  });

  it('should load demo data with all datasets', async () => {
    const demoData = await import('@/lib/demo/demo-data');

    // Conversations
    expect(demoData.DEMO_INBOX_CONVERSATIONS.length).toBeGreaterThanOrEqual(6);

    // Messages for each conversation
    const convIds = demoData.DEMO_INBOX_CONVERSATIONS.map(c => c.id);
    for (const id of convIds) {
      expect(demoData.DEMO_INBOX_MESSAGES[id]).toBeDefined();
    }

    // Canned replies
    expect(demoData.DEMO_INBOX_CANNED_REPLIES.length).toBeGreaterThanOrEqual(3);

    // Auto rules
    expect(demoData.DEMO_INBOX_AUTO_RULES.length).toBeGreaterThanOrEqual(2);

    // Labels
    expect(demoData.DEMO_INBOX_LABELS.length).toBeGreaterThanOrEqual(4);

    // Contacts
    expect(demoData.DEMO_INBOX_CONTACTS.length).toBeGreaterThanOrEqual(5);
  });
});
