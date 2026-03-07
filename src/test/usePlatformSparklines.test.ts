import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: vi.fn(() => ({ selectedCompanyId: 'test-company-id' })),
}));

describe('usePlatformSparklines', () => {
  it('exports a hook function', async () => {
    const mod = await import('@/hooks/usePlatformSparklines');
    expect(typeof mod.usePlatformSparklines).toBe('function');
  });

  it('query key includes platform and company_id', async () => {
    const mod = await import('@/hooks/usePlatformSparklines');
    expect(mod.platformSparklinesQueryKey('twitter', 'test-id')).toEqual(['platform-sparklines', 'twitter', 'test-id']);
  });

  it('staleTime is 10 minutes', async () => {
    const mod = await import('@/hooks/usePlatformSparklines');
    expect(mod.SPARKLINES_STALE_TIME).toBe(10 * 60 * 1000);
  });
});
