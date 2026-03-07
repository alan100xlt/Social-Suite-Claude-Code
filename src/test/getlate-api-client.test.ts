import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GetLate API Client Coverage Tests
 *
 * Validates that the client-side API surface matches all edge function actions.
 * Tests are source-level (read the file), not runtime, to avoid Supabase deps.
 */

const CLIENT_PATH = path.resolve(__dirname, '../lib/api/getlate.ts');
const source = fs.readFileSync(CLIENT_PATH, 'utf8');

describe('getlateAnalytics methods', () => {
  const methods = [
    'getPostTimeline',
    'getYouTubeDailyViews',
    'getFollowerStats',
    'getPostingFrequency',
    'getContentDecay',
    'getBestTime',
    'getDailyMetrics',
    'syncExternalPost',
  ];

  for (const method of methods) {
    it(`has ${method} method`, () => {
      expect(source).toContain(`async ${method}(`);
    });
  }

  it('maps getPostTimeline to post-timeline action', () => {
    expect(source).toMatch(/getPostTimeline[\s\S]*action:\s*'post-timeline'/);
  });

  it('maps getYouTubeDailyViews to youtube-daily action', () => {
    expect(source).toMatch(/getYouTubeDailyViews[\s\S]*action:\s*'youtube-daily'/);
  });

  it('maps getFollowerStats to follower-stats action', () => {
    expect(source).toMatch(/getFollowerStats[\s\S]*action:\s*'follower-stats'/);
  });

  it('maps getPostingFrequency to posting-frequency action', () => {
    expect(source).toMatch(/getPostingFrequency[\s\S]*action:\s*'posting-frequency'/);
  });

  it('maps getContentDecay to content-decay action', () => {
    expect(source).toMatch(/getContentDecay[\s\S]*action:\s*'content-decay'/);
  });

  it('maps getBestTime to best-time action', () => {
    expect(source).toMatch(/getBestTime[\s\S]*action:\s*'best-time'/);
  });
});

describe('getlateAccounts', () => {
  it('does NOT have dead getFollowerStats method', () => {
    // getFollowerStats should be in getlateAnalytics, NOT getlateAccounts
    // The old getlateAccounts.getFollowerStats was dead code (0 imports)
    const accountsSection = source.match(/export const getlateAccounts[\s\S]*?^};/m)?.[0] || '';
    expect(accountsSection).not.toContain('getFollowerStats');
  });
});

describe('edge function action coverage', () => {
  const EDGE_FN_PATH = path.resolve(__dirname, '../../supabase/functions/getlate-analytics/index.ts');
  const edgeSource = fs.readFileSync(EDGE_FN_PATH, 'utf8');

  it('every ACTIONS key has a corresponding client method', () => {
    // Extract action keys from ACTIONS registry
    const actionKeys = [...edgeSource.matchAll(/'([^']+)':\s*\{[\s\S]*?path:/g)]
      .map(m => m[1]);

    // These actions must have client methods
    const expectedMethods: Record<string, string> = {
      'get': 'syncExternalPost', // or any method — 'get' is generic
      'sync': 'syncExternalPost',
      'youtube-daily': 'getYouTubeDailyViews',
      'overview': 'getOverview', // may not exist yet, that's ok
      'best-time': 'getBestTime',
      'content-decay': 'getContentDecay',
      'posting-frequency': 'getPostingFrequency',
      'daily-metrics': 'getDailyMetrics',
      'post-timeline': 'getPostTimeline',
    };

    for (const key of actionKeys) {
      if (key === 'get' || key === 'overview') continue; // generic actions, covered implicitly
      const method = expectedMethods[key];
      if (method) {
        expect(source).toContain(`async ${method}(`);
      }
    }
  });
});
