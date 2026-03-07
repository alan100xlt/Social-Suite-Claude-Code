// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('Platform Metrics Matrix — Smoke Tests', () => {
  it('platform-metrics.ts exports all expected constants and functions', async () => {
    const mod = await import('@/lib/platform-metrics');
    expect(mod.PLATFORM_METRICS).toBeDefined();
    expect(mod.METRIC_LABELS).toBeDefined();
    expect(typeof mod.transformSnapshotsToMatrix).toBe('function');
    expect(typeof mod.transformSnapshotsToSparklines).toBe('function');
    expect(typeof mod.getAvailableMetrics).toBe('function');
    expect(typeof mod.getCellDisplayState).toBe('function');
  });

  it('usePlatformMetricsMatrix hook can be imported', async () => {
    const mod = await import('@/hooks/usePlatformMetricsMatrix');
    expect(typeof mod.usePlatformMetricsMatrix).toBe('function');
  });

  it('usePlatformSparklines hook can be imported', async () => {
    const mod = await import('@/hooks/usePlatformSparklines');
    expect(typeof mod.usePlatformSparklines).toBe('function');
  });

  it('PlatformMetricsMatrix component can be imported', async () => {
    const mod = await import('@/components/shared/PlatformMetricsMatrix');
    expect(typeof mod.PlatformMetricsMatrix).toBe('function');
  });
});
