import { describe, it, expect, vi } from 'vitest';

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

describe('Google Analytics smoke tests', () => {
  it('should import ContentJourney page without errors', async () => {
    const module = await import('@/pages/ContentJourney');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import GA API client with all methods', async () => {
    const { googleAnalyticsApi } = await import('@/lib/api/google-analytics');
    expect(typeof googleAnalyticsApi.startAuth).toBe('function');
    expect(typeof googleAnalyticsApi.handleCallback).toBe('function');
    expect(typeof googleAnalyticsApi.selectProperty).toBe('function');
    expect(typeof googleAnalyticsApi.disconnect).toBe('function');
    expect(typeof googleAnalyticsApi.syncNow).toBe('function');
  });

  it('should import all GA hooks without errors', async () => {
    const hooks = await Promise.all([
      import('@/hooks/useGoogleAnalytics'),
      import('@/hooks/useGAPageMetrics'),
      import('@/hooks/useGATrafficSources'),
      import('@/hooks/useContentJourney'),
    ]);
    hooks.forEach((mod) => {
      const exported = Object.values(mod);
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  it('should export useGAConnections from useGoogleAnalytics', async () => {
    const mod = await import('@/hooks/useGoogleAnalytics');
    expect(typeof mod.useGAConnections).toBe('function');
    expect(typeof mod.useConnectGA).toBe('function');
    expect(typeof mod.useSyncGA).toBe('function');
    expect(typeof mod.useDisconnectGA).toBe('function');
  });

  it('should export useGAPageMetrics', async () => {
    const mod = await import('@/hooks/useGAPageMetrics');
    expect(typeof mod.useGAPageMetrics).toBe('function');
  });

  it('should export useGATrafficSources', async () => {
    const mod = await import('@/hooks/useGATrafficSources');
    expect(typeof mod.useGATrafficSources).toBe('function');
  });

  it('should export useContentJourney', async () => {
    const mod = await import('@/hooks/useContentJourney');
    expect(typeof mod.useContentJourney).toBe('function');
  });

  it('should import GAPropertySelectionDialog', async () => {
    const mod = await import('@/components/connections/GAPropertySelectionDialog');
    expect(mod.default || mod.GAPropertySelectionDialog).toBeDefined();
  });

  it('should load demo data with GA datasets', async () => {
    const demoData = await import('@/lib/demo/demo-data');
    expect(demoData.DEMO_GA_CONNECTIONS).toBeDefined();
    expect(demoData.DEMO_GA_CONNECTIONS.length).toBeGreaterThanOrEqual(1);
    expect(demoData.DEMO_GA_PAGE_SNAPSHOTS).toBeDefined();
    expect(demoData.DEMO_GA_PAGE_SNAPSHOTS.length).toBeGreaterThanOrEqual(5);
    expect(demoData.DEMO_GA_REFERRAL_SNAPSHOTS).toBeDefined();
    expect(demoData.DEMO_GA_CONTENT_JOURNEY).toBeDefined();
  });
});
