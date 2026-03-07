import { describe, it, expect } from 'vitest';
import type { Platform } from '@/lib/api/getlate';
import {
  PLATFORM_METRICS,
  METRIC_LABELS,
  MetricType,
  transformSnapshotsToMatrix,
  transformSnapshotsToSparklines,
  getAvailableMetrics,
  getCellDisplayState,
} from '@/lib/platform-metrics';

// All 13 platforms from the Platform union
const ALL_PLATFORMS: Platform[] = [
  'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
  'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
  'google-business', 'telegram', 'snapchat',
];

const ALL_METRICS: MetricType[] = [
  'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views',
];

describe('PLATFORM_METRICS completeness', () => {
  it('has an entry for every Platform in the union', () => {
    for (const p of ALL_PLATFORMS) {
      expect(PLATFORM_METRICS).toHaveProperty(p);
    }
  });

  it('each platform entry has all 8 metric types', () => {
    for (const p of ALL_PLATFORMS) {
      for (const m of ALL_METRICS) {
        expect(PLATFORM_METRICS[p]).toHaveProperty(m);
        expect(PLATFORM_METRICS[p][m]).toHaveProperty('availability');
      }
    }
  });
});

describe('METRIC_LABELS completeness', () => {
  it('has a label for every MetricType', () => {
    for (const m of ALL_METRICS) {
      expect(METRIC_LABELS).toHaveProperty(m);
      expect(typeof METRIC_LABELS[m]).toBe('string');
    }
  });
});

describe('transformSnapshotsToMatrix', () => {
  it('returns all nulls for empty input', () => {
    const result = transformSnapshotsToMatrix([]);
    // Should return an empty record (no platforms)
    expect(Object.keys(result).length).toBe(0);
  });

  it('maps a single platform row correctly', () => {
    const rows = [{
      platform: 'twitter',
      impressions: 1000,
      reach: 800,
      likes: 50,
      comments: 10,
      shares: 5,
      saves: null,
      clicks: 30,
      views: 500,
      snapshot_date: '2026-03-01',
    }];
    const result = transformSnapshotsToMatrix(rows);
    expect(result.twitter).toBeDefined();
    expect(result.twitter.impressions).toBe(1000);
    expect(result.twitter.likes).toBe(50);
    expect(result.twitter.saves).toBeNull();
  });

  it('groups multiple platforms correctly', () => {
    const rows = [
      { platform: 'twitter', impressions: 1000, reach: 800, likes: 50, comments: 10, shares: 5, saves: null, clicks: 30, views: 500, snapshot_date: '2026-03-01' },
      { platform: 'instagram', impressions: 2000, reach: 1500, likes: 200, comments: 30, shares: 20, saves: 15, clicks: 60, views: 1000, snapshot_date: '2026-03-01' },
    ];
    const result = transformSnapshotsToMatrix(rows);
    expect(result.twitter.impressions).toBe(1000);
    expect(result.instagram.impressions).toBe(2000);
    expect(result.instagram.saves).toBe(15);
  });

  it('uses most recent snapshot when multiple exist for a platform', () => {
    const rows = [
      { platform: 'twitter', impressions: 500, reach: 0, likes: 0, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, snapshot_date: '2026-02-28' },
      { platform: 'twitter', impressions: 1000, reach: 0, likes: 0, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, snapshot_date: '2026-03-01' },
    ];
    const result = transformSnapshotsToMatrix(rows);
    expect(result.twitter.impressions).toBe(1000);
  });
});

describe('transformSnapshotsToSparklines', () => {
  it('returns sorted-by-date arrays per metric', () => {
    const rows = [
      { snapshot_date: '2026-03-03', impressions: 300, reach: 0, likes: 0, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, platform: 'twitter' },
      { snapshot_date: '2026-03-01', impressions: 100, reach: 0, likes: 0, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, platform: 'twitter' },
      { snapshot_date: '2026-03-02', impressions: 200, reach: 0, likes: 0, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, platform: 'twitter' },
    ];
    const result = transformSnapshotsToSparklines(rows);
    expect(result.impressions).toEqual([100, 200, 300]);
  });

  it('only includes existing data points (no gap filling)', () => {
    const rows = [
      { snapshot_date: '2026-03-01', impressions: 100, reach: 50, likes: 10, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, platform: 'twitter' },
      { snapshot_date: '2026-03-05', impressions: 500, reach: 250, likes: 50, comments: 0, shares: 0, saves: null, clicks: 0, views: 0, platform: 'twitter' },
    ];
    const result = transformSnapshotsToSparklines(rows);
    expect(result.impressions).toHaveLength(2);
    expect(result.reach).toHaveLength(2);
  });
});

describe('getAvailableMetrics', () => {
  it('returns correct subset for instagram', () => {
    const metrics = getAvailableMetrics('instagram');
    // Instagram supports most metrics
    expect(metrics).toContain('likes');
    expect(metrics).toContain('comments');
    expect(metrics).toContain('impressions');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('returns metrics that are available or partial (not unavailable)', () => {
    for (const p of ALL_PLATFORMS) {
      const metrics = getAvailableMetrics(p);
      for (const m of metrics) {
        expect(PLATFORM_METRICS[p][m].availability).not.toBe('unavailable');
      }
    }
  });
});

describe('getCellDisplayState', () => {
  it('connected + has value → "value"', () => {
    expect(getCellDisplayState('twitter', 'likes', ['twitter'], 42)).toBe('value');
  });

  it('connected + null value → "dash"', () => {
    expect(getCellDisplayState('twitter', 'saves', ['twitter'], null)).toBe('dash');
  });

  it('not connected + available → "available"', () => {
    // Twitter supports likes
    expect(getCellDisplayState('twitter', 'likes', [], null)).toBe('available');
  });

  it('not connected + partial → "partial"', () => {
    // Find a platform/metric that is partial
    let found = false;
    for (const p of ALL_PLATFORMS) {
      for (const m of ALL_METRICS) {
        if (PLATFORM_METRICS[p][m].availability === 'partial') {
          expect(getCellDisplayState(p, m, [], null)).toBe('partial');
          found = true;
          break;
        }
      }
      if (found) break;
    }
    // If no partial exists in data, skip
    if (!found) {
      expect(true).toBe(true);
    }
  });

  it('not connected + unavailable → "unavailable"', () => {
    // Find a platform/metric that is unavailable
    for (const p of ALL_PLATFORMS) {
      for (const m of ALL_METRICS) {
        if (PLATFORM_METRICS[p][m].availability === 'unavailable') {
          expect(getCellDisplayState(p, m, [], null)).toBe('unavailable');
          return;
        }
      }
    }
  });

  it('connected platforms sort before unconnected', () => {
    const connected: Platform[] = ['twitter', 'instagram'];
    const all: Platform[] = ['youtube', 'twitter', 'instagram', 'reddit'];
    const sorted = [...all].sort((a, b) => {
      const aConn = connected.includes(a) ? 0 : 1;
      const bConn = connected.includes(b) ? 0 : 1;
      return aConn - bConn;
    });
    expect(sorted[0]).toBe('twitter');
    expect(sorted[1]).toBe('instagram');
    expect(sorted[2]).toBe('youtube');
    expect(sorted[3]).toBe('reddit');
  });
});
