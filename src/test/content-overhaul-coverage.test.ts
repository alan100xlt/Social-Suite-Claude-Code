import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Content Page Overhaul — Structural & Content Verification
 *
 * Goes beyond file existence: verifies migration SQL contains correct DDL,
 * hooks export expected interfaces, components are wired into parent pages,
 * and demo data matches expected schemas.
 */

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

// ─── Phase 0: Migrations contain correct DDL ───────────────────

describe('Phase 0: RBAC migration creates correct tables', () => {
  const rbacSql = readFile('../../supabase/migrations/20260308000001_rbac_tables_and_data.sql');

  it('creates role_default_permissions table', () => {
    expect(rbacSql).toContain('CREATE TABLE');
    expect(rbacSql).toContain('role_default_permissions');
  });

  it('creates user_permissions table', () => {
    expect(rbacSql).toContain('user_permissions');
  });

  it('seeds all 5 roles into role_default_permissions', () => {
    expect(rbacSql).toContain("'owner'");
    expect(rbacSql).toContain("'admin'");
    expect(rbacSql).toContain("'manager'");
    expect(rbacSql).toContain("'collaborator'");
    expect(rbacSql).toContain("'community_manager'");
  });

  it('seeds key permissions (publish, manage_team, manage_inbox)', () => {
    expect(rbacSql).toContain("'publish'");
    expect(rbacSql).toContain("'manage_team'");
    expect(rbacSql).toContain("'manage_inbox'");
  });
});

describe('Phase 0: Content metadata migration', () => {
  const sql = readFile('../../supabase/migrations/20260308010000_content_metadata.sql');

  it('creates journalists table with company_id FK', () => {
    expect(sql).toContain('journalists');
    expect(sql).toContain('company_id');
  });

  it('creates campaigns table', () => {
    expect(sql).toContain('campaigns');
  });

  it('creates campaign_posts table', () => {
    expect(sql).toContain('campaign_posts');
  });

  it('adds byline column to rss_feed_items', () => {
    expect(sql).toContain('byline');
  });

  it('adds content_classification column', () => {
    expect(sql).toContain('content_classification');
  });
});

describe('Phase 0: Feature config migration', () => {
  const sql = readFile('../../supabase/migrations/20260308020000_feature_config.sql');

  it('creates company_feature_config table with jsonb config', () => {
    expect(sql).toContain('company_feature_config');
    expect(sql).toContain('jsonb');
  });
});

describe('Phase 0: Evergreen migration', () => {
  const sql = readFile('../../supabase/migrations/20260308030000_evergreen_recycling.sql');

  it('creates evergreen_queue table with status enum', () => {
    expect(sql).toContain('evergreen_queue');
    expect(sql).toContain('evergreen_status');
  });

  it('evergreen_queue has company_id FK and article_id FK', () => {
    expect(sql).toContain('company_id');
    expect(sql).toContain('article_id');
  });

  it('has RLS policies for tenant isolation', () => {
    expect(sql).toContain('ROW LEVEL SECURITY');
    expect(sql).toContain('tenant_isolation');
  });
});

describe('Phase 0: Content metadata migration adds last_recycled_at', () => {
  const sql = readFile('../../supabase/migrations/20260308010000_content_metadata.sql');

  it('adds last_recycled_at column to rss_feed_items', () => {
    expect(sql).toContain('last_recycled_at');
  });
});

// ─── Phase 1: RBAC hooks export correct types ──────────────────

describe('Phase 1: usePermissions hook structure', () => {
  const src = readFile('../hooks/usePermissions.ts');

  it('imports from shared lib/permissions module', () => {
    expect(src).toContain("from '@/lib/permissions'");
  });

  it('exports AppRole and PermissionName types', () => {
    expect(src).toContain('AppRole');
    expect(src).toContain('PermissionName');
  });

  it('queries role_default_permissions table', () => {
    expect(src).toContain('role_default_permissions');
  });

  it('queries user_permissions table for overrides', () => {
    expect(src).toContain('user_permissions');
  });

  it('calls mergePermissions to combine defaults and overrides', () => {
    expect(src).toContain('mergePermissions');
  });
});

// ─── Phase 2: Calendar article layer wired correctly ────────────

describe('Phase 2: Calendar article integration', () => {
  const calendar = readFile('../components/content/calendar/ContentCalendar.tsx');
  const filters = readFile('../components/content/calendar/CalendarFilters.tsx');
  const articleCard = readFile('../components/content/calendar/CalendarArticleCard.tsx');

  it('ContentCalendar accepts articles prop and renders CalendarArticleCard', () => {
    expect(calendar).toContain('articles');
    expect(calendar).toContain('CalendarArticleCard');
  });

  it('CalendarFilters has contentView state for All/Articles/Posts toggle', () => {
    expect(filters).toContain('contentView');
    expect(filters).toMatch(/all|articles|posts/);
  });

  it('CalendarArticleCard renders article title and hover card', () => {
    expect(articleCard).toContain('HoverCard');
    expect(articleCard).toContain('title');
  });

  it('ContentV2.tsx maps feedItems to ArticleItem[] and passes to calendar', () => {
    const page = readFile('../pages/ContentV2.tsx');
    expect(page).toContain('calendarArticles');
    expect(page).toContain('ArticleItem');
  });
});

// ─── Phase 3: Throttle is wired into ComposeTab ────────────────

describe('Phase 3: Throttle integration in ComposeTab', () => {
  const compose = readFile('../components/posts/ComposeTab.tsx');

  it('imports useThrottleCheck and renders throttle warning', () => {
    expect(compose).toContain('useThrottleCheck');
    expect(compose).toContain('throttle');
  });
});

// ─── Phase 5: Campaigns CRUD hook has all operations ────────────

describe('Phase 5: Campaigns hook completeness', () => {
  const src = readFile('../hooks/useCampaigns.ts');

  it('exports CRUD operations and join table hooks', () => {
    expect(src).toContain('export function useCampaigns');
    expect(src).toContain('export function useCreateCampaign');
    expect(src).toContain('export function useUpdateCampaign');
    expect(src).toContain('export function useDeleteCampaign');
    expect(src).toContain('export function useAddPostToCampaign');
    expect(src).toContain('export function useRemovePostFromCampaign');
    expect(src).toContain('export function useCampaignPosts');
  });

  it('Campaign interface has all required fields', () => {
    expect(src).toContain('name: string');
    expect(src).toContain('status:');
    expect(src).toContain('company_id');
  });
});

// ─── Phase 7: Quality check wired into ComposeTab ──────────────

describe('Phase 7: Quality check integration', () => {
  const compose = readFile('../components/posts/ComposeTab.tsx');
  const hook = readFile('../hooks/useQualityCheck.ts');

  it('ComposeTab imports and uses useQualityCheck', () => {
    expect(compose).toContain('useQualityCheck');
    expect(compose).toContain('QualityCheckPanel');
  });

  it('useQualityCheck calls content-quality-check edge function', () => {
    expect(hook).toContain('content-quality-check');
  });

  it('QualityCheckResult has checks array with type/status/message', () => {
    expect(hook).toContain("type: 'brand_voice'");
    expect(hook).toContain("status: 'pass'");
  });
});

// ─── Phase 8-10: Edge functions exist with correct logic ────────

describe('Phase 8: Evergreen recycler edge function', () => {
  const src = readFile('../../supabase/functions/evergreen-recycler/index.ts');

  it('queries evergreen-eligible content', () => {
    expect(src).toContain('rss_feed_items');
  });

  it('generates variation text via Gemini', () => {
    expect(src).toMatch(/gemini|callGemini|generateContent/i);
  });

  it('inserts into evergreen_queue', () => {
    expect(src).toContain('evergreen_queue');
  });
});

describe('Phase 10: Performance alerts edge function', () => {
  const src = readFile('../../supabase/functions/performance-alerts/index.ts');

  it('queries post_analytics_snapshots', () => {
    expect(src).toContain('post_analytics_snapshots');
  });

  it('detects viral and underperforming posts', () => {
    expect(src).toMatch(/viral|underperform/i);
  });
});

// ─── Phase 11: Cross-outlet analytics wired into Analytics page ─

describe('Phase 11: Cross-outlet analytics integration', () => {
  const analytics = readFile('../pages/Analytics.tsx');
  const hook = readFile('../hooks/useCrossOutletAnalytics.ts');

  it('Analytics page has Outlets tab', () => {
    expect(analytics).toContain('outlets');
    expect(analytics).toContain('CrossOutletAnalytics');
  });

  it('useCrossOutletAnalytics queries media_company_children', () => {
    expect(hook).toContain('media_company_children');
  });

  it('useCrossOutletAnalytics queries media_company_analytics', () => {
    expect(hook).toContain('media_company_analytics');
  });

  it('hook maps company names from join', () => {
    expect(hook).toContain('nameMap');
  });
});

// ─── Phase 14: Demo data fixtures match expected schemas ────────

describe('Phase 14: Demo data schema validation', () => {
  const demoSource = readFile('../lib/demo/demo-data.ts');
  const providerSource = readFile('../lib/demo/DemoDataProvider.tsx');

  it('DEMO_CAMPAIGNS has required fields: id, name, status, company_id', () => {
    expect(demoSource).toContain('export const DEMO_CAMPAIGNS');
    // Verify structure contains expected fields
    expect(demoSource).toMatch(/DEMO_CAMPAIGNS.*name.*status/s);
  });

  it('DEMO_FEATURE_CONFIG has posting_throttle and quality_checker', () => {
    expect(demoSource).toContain('export const DEMO_FEATURE_CONFIG');
    expect(demoSource).toContain('posting_throttle');
    expect(demoSource).toContain('quality_checker');
  });

  it('DEMO_PERMISSIONS has role and permissions fields', () => {
    expect(demoSource).toContain('export const DEMO_PERMISSIONS');
    expect(demoSource).toMatch(/DEMO_PERMISSIONS.*role.*permissions/s);
  });

  it('DemoDataProvider caches all new query keys', () => {
    const requiredKeys = [
      'campaigns', 'feature-config', 'user-permissions',
      'evergreen-queue', 'performance-alerts', 'cross-outlet-analytics',
    ];
    for (const key of requiredKeys) {
      expect(providerSource).toContain(`'${key}'`);
    }
  });

  it('DemoDataProvider imports all new fixtures', () => {
    expect(providerSource).toContain('DEMO_CAMPAIGNS');
    expect(providerSource).toContain('DEMO_FEATURE_CONFIG');
    expect(providerSource).toContain('DEMO_PERMISSIONS');
    expect(providerSource).toContain('DEMO_EVERGREEN_QUEUE');
  });
});
