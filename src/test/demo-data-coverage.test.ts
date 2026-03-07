import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Demo Data Coverage Tests
 *
 * Ensures every analytics hook has corresponding demo data fixtures
 * and DemoDataProvider cache entries.
 */

const DEMO_DATA_PATH = path.resolve(__dirname, '../lib/demo/demo-data.ts');
const PROVIDER_PATH = path.resolve(__dirname, '../lib/demo/DemoDataProvider.tsx');

const demoSource = fs.readFileSync(DEMO_DATA_PATH, 'utf8');
const providerSource = fs.readFileSync(PROVIDER_PATH, 'utf8');

describe('demo data fixtures exist', () => {
  const fixtures = [
    'DEMO_POST_TIMELINE',
    'DEMO_YOUTUBE_DAILY_VIEWS',
    'DEMO_FOLLOWER_STATS',
    'DEMO_ACCOUNT_HEALTH',
  ];

  for (const fixture of fixtures) {
    it(`exports ${fixture}`, () => {
      expect(demoSource).toContain(`export const ${fixture}`);
    });
  }
});

describe('DemoDataProvider sets query data', () => {
  const queryKeys = [
    'post-timeline',
    'youtube-daily-views',
    'follower-stats',
    'account-health',
  ];

  for (const key of queryKeys) {
    it(`sets '${key}' query data`, () => {
      expect(providerSource).toContain(`'${key}'`);
    });
  }

  it('imports all new fixtures', () => {
    expect(providerSource).toContain('DEMO_POST_TIMELINE');
    expect(providerSource).toContain('DEMO_YOUTUBE_DAILY_VIEWS');
    expect(providerSource).toContain('DEMO_FOLLOWER_STATS');
    expect(providerSource).toContain('DEMO_ACCOUNT_HEALTH');
  });
});
