import { describe, it, expect, vi } from 'vitest';

// Mock modules before imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: vi.fn(() => ({ selectedCompanyId: 'test-company-id' })),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: vi.fn((id: string) => id === 'demo-longtale'),
  DEMO_COMPANY_ID: 'demo-longtale',
}));

describe('usePlatformMetricsMatrix', () => {
  it('exports a hook function', async () => {
    const mod = await import('@/hooks/usePlatformMetricsMatrix');
    expect(typeof mod.usePlatformMetricsMatrix).toBe('function');
  });

  it('query key includes company_id', async () => {
    const mod = await import('@/hooks/usePlatformMetricsMatrix');
    expect(mod.platformMetricsQueryKey('test-id')).toEqual(['platform-metrics-matrix', 'test-id']);
  });

  it('query key includes null when no company', async () => {
    const mod = await import('@/hooks/usePlatformMetricsMatrix');
    expect(mod.platformMetricsQueryKey(null)).toEqual(['platform-metrics-matrix', null]);
  });
});
