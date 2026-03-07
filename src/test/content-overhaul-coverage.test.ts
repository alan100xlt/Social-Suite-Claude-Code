import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Content Page Overhaul — Coverage Tests
 *
 * Verifies that all new components, hooks, and demo data from the
 * Content Page Overhaul plan (Phases 0-14) exist and are properly wired.
 */

// ─── File Existence Checks ─────────────────────────────────────

describe('Phase 0: Schema & Infrastructure', () => {
  const migrations = [
    '20260308000000_rbac_expansion.sql',
    '20260308000001_rbac_tables_and_data.sql',
    '20260308010000_content_metadata.sql',
    '20260308020000_feature_config.sql',
    '20260308030000_evergreen_recycling.sql',
  ];

  for (const migration of migrations) {
    it(`migration ${migration} exists`, () => {
      const migPath = path.resolve(__dirname, `../../supabase/migrations/${migration}`);
      expect(fs.existsSync(migPath)).toBe(true);
    });
  }
});

describe('Phase 1: RBAC + Feature Gating — hooks exist', () => {
  const hooks = [
    'usePermissions.ts',
    'useFeatureConfig.ts',
  ];

  for (const hook of hooks) {
    it(`${hook} exists`, () => {
      expect(fs.existsSync(path.resolve(__dirname, `../hooks/${hook}`))).toBe(true);
    });
  }
});

describe('Phase 1: RBAC + Feature Gating — components exist', () => {
  const components = [
    'auth/PermissionGate.tsx',
    'auth/FeatureGate.tsx',
  ];

  for (const comp of components) {
    it(`${comp} exists`, () => {
      expect(fs.existsSync(path.resolve(__dirname, `../components/${comp}`))).toBe(true);
    });
  }
});

describe('Phase 2: Calendar Enhancement', () => {
  it('CalendarArticleCard.tsx exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../components/content/calendar/CalendarArticleCard.tsx')
    )).toBe(true);
  });

  it('ContentCalendar.tsx references articles prop', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../components/content/calendar/ContentCalendar.tsx'),
      'utf8'
    );
    expect(content).toContain('articles');
    expect(content).toContain('CalendarArticleCard');
  });

  it('CalendarFilters.tsx has contentView toggle', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../components/content/calendar/CalendarFilters.tsx'),
      'utf8'
    );
    expect(content).toContain('contentView');
  });
});

describe('Phase 3: Throttling', () => {
  it('useThrottleCheck hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/useThrottleCheck.ts'))).toBe(true);
  });

  it('ComposeTab imports useThrottleCheck', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../components/posts/ComposeTab.tsx'),
      'utf8'
    );
    expect(content).toContain('useThrottleCheck');
  });
});

describe('Phase 5: Campaign Grouping', () => {
  it('useCampaigns hook exists with all CRUD operations', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useCampaigns.ts'),
      'utf8'
    );
    expect(content).toContain('useCampaigns');
    expect(content).toContain('useCreateCampaign');
    expect(content).toContain('useUpdateCampaign');
    expect(content).toContain('useDeleteCampaign');
    expect(content).toContain('useAddPostToCampaign');
    expect(content).toContain('useRemovePostFromCampaign');
    expect(content).toContain('useCampaignPosts');
  });
});

describe('Phase 7: AI Content Intelligence', () => {
  it('useQualityCheck hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/useQualityCheck.ts'))).toBe(true);
  });

  it('QualityCheckPanel component exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../components/posts/QualityCheckPanel.tsx')
    )).toBe(true);
  });

  it('ComposeTab imports quality check', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../components/posts/ComposeTab.tsx'),
      'utf8'
    );
    expect(content).toContain('useQualityCheck');
    expect(content).toContain('QualityCheckPanel');
  });
});

describe('Phase 8: Evergreen Recycling', () => {
  it('useEvergreenQueue hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/useEvergreenQueue.ts'))).toBe(true);
  });

  it('edge function exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../../supabase/functions/evergreen-recycler/index.ts')
    )).toBe(true);
  });
});

describe('Phase 9: Breaking News', () => {
  it('useBreakingNews hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/useBreakingNews.ts'))).toBe(true);
  });

  it('BreakingNewsDialog component exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../components/content/BreakingNewsDialog.tsx')
    )).toBe(true);
  });
});

describe('Phase 10: Performance Alerts', () => {
  it('usePerformanceAlerts hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/usePerformanceAlerts.ts'))).toBe(true);
  });

  it('edge function exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../../supabase/functions/performance-alerts/index.ts')
    )).toBe(true);
  });
});

describe('Phase 11: Cross-Outlet Analytics', () => {
  it('useCrossOutletAnalytics hook exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../hooks/useCrossOutletAnalytics.ts'))).toBe(true);
  });

  it('CrossOutletAnalytics component exists', () => {
    expect(fs.existsSync(
      path.resolve(__dirname, '../components/analytics/CrossOutletAnalytics.tsx')
    )).toBe(true);
  });

  it('Analytics.tsx includes Outlets tab', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../pages/Analytics.tsx'),
      'utf8'
    );
    expect(content).toContain('outlets');
    expect(content).toContain('CrossOutletAnalytics');
  });
});

describe('Phase 14: Demo Data', () => {
  const DEMO_DATA_PATH = path.resolve(__dirname, '../lib/demo/demo-data.ts');
  const PROVIDER_PATH = path.resolve(__dirname, '../lib/demo/DemoDataProvider.tsx');

  let demoSource: string;
  let providerSource: string;

  try {
    demoSource = fs.readFileSync(DEMO_DATA_PATH, 'utf8');
    providerSource = fs.readFileSync(PROVIDER_PATH, 'utf8');
  } catch {
    demoSource = '';
    providerSource = '';
  }

  const requiredFixtures = [
    'DEMO_CAMPAIGNS',
    'DEMO_FEATURE_CONFIG',
    'DEMO_PERMISSIONS',
    'DEMO_EVERGREEN_QUEUE',
  ];

  for (const fixture of requiredFixtures) {
    it(`demo-data.ts exports ${fixture}`, () => {
      expect(demoSource).toContain(`export const ${fixture}`);
    });
  }

  const requiredQueryKeys = [
    'campaigns',
    'feature-config',
    'user-permissions',
    'evergreen-queue',
    'performance-alerts',
    'cross-outlet-analytics',
  ];

  for (const key of requiredQueryKeys) {
    it(`DemoDataProvider sets '${key}' query data`, () => {
      expect(providerSource).toContain(`'${key}'`);
    });
  }
});

// ─── Edge Function Existence ────────────────────────────────────

describe('Edge functions for content overhaul exist', () => {
  const functions = [
    'content-quality-check',
    'brand-voice-analysis',
    'evergreen-recycler',
    'performance-alerts',
    'content-backfill',
  ];

  for (const fn of functions) {
    it(`${fn}/index.ts exists`, () => {
      expect(fs.existsSync(
        path.resolve(__dirname, `../../supabase/functions/${fn}/index.ts`)
      )).toBe(true);
    });
  }
});
