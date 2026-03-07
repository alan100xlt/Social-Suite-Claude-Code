import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: () => ({ selectedCompanyId: 'test-company-id' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => ({
    data: { id: 'test-company-id', name: 'Test Co' },
    isLoading: false,
  }),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: (id: string) => id === 'demo-longtale',
  DEMO_COMPANY_ID: 'demo-longtale',
  DEMO_COMPANY: { id: 'demo-longtale', name: 'Longtale Demo' },
}));

// ─── API Client Tests ───────────────────────────────────────
describe('googleAnalyticsApi', () => {
  it('should export all required methods', async () => {
    const { googleAnalyticsApi } = await import('@/lib/api/google-analytics');
    expect(typeof googleAnalyticsApi.startAuth).toBe('function');
    expect(typeof googleAnalyticsApi.handleCallback).toBe('function');
    expect(typeof googleAnalyticsApi.selectProperty).toBe('function');
    expect(typeof googleAnalyticsApi.disconnect).toBe('function');
    expect(typeof googleAnalyticsApi.syncNow).toBe('function');
  });
});

// ─── Hook Export Tests ──────────────────────────────────────
describe('useGAConnections', () => {
  it('should export connection management hooks', async () => {
    const mod = await import('@/hooks/useGoogleAnalytics');
    expect(typeof mod.useGAConnections).toBe('function');
    expect(typeof mod.useConnectGA).toBe('function');
    expect(typeof mod.useSyncGA).toBe('function');
    expect(typeof mod.useDisconnectGA).toBe('function');
  });
});

describe('useGAPageMetrics', () => {
  it('should export useGAPageMetrics', async () => {
    const { useGAPageMetrics } = await import('@/hooks/useGAPageMetrics');
    expect(typeof useGAPageMetrics).toBe('function');
  });
});

describe('useGATrafficSources', () => {
  it('should export useGATrafficSources', async () => {
    const { useGATrafficSources } = await import('@/hooks/useGATrafficSources');
    expect(typeof useGATrafficSources).toBe('function');
  });
});

describe('useContentJourney', () => {
  it('should export useContentJourney', async () => {
    const { useContentJourney } = await import('@/hooks/useContentJourney');
    expect(typeof useContentJourney).toBe('function');
  });
});

// ─── URL Correlation Logic Tests ────────────────────────────
describe('URL-to-page-path correlation', () => {
  it('should extract page path from full URL', () => {
    const url = 'https://example.com/blog/my-article?utm_source=twitter';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/blog/my-article');
  });

  it('should handle URLs without path', () => {
    const url = 'https://example.com';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/');
  });

  it('should handle URLs with trailing slash', () => {
    const url = 'https://example.com/blog/';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/blog/');
  });

  it('should extract first URL from post content', () => {
    const content = 'Check out our latest article https://example.com/blog/post-1 and let us know!';
    const match = content.match(/https?:\/\/[^\s"'<>]+/);
    expect(match?.[0]).toBe('https://example.com/blog/post-1');
  });

  it('should return null for content without URLs', () => {
    const content = 'Just a regular post with no links';
    const match = content.match(/https?:\/\/[^\s"'<>]+/);
    expect(match).toBeNull();
  });
});
