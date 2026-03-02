# Duplicate Features & Functions Audit

> Updated 2026-03-02 — Full codebase re-analysis after Windsurf enterprise commits merged to main

---

## Summary

There are **20 duplication areas** across the app — the Windsurf enterprise commits introduced significant new overlap. The most critical issue: **~4,350 lines of new "enterprise" components use mock data and are disconnected from the production system**, duplicating features that already work. Combined with the pre-existing V1/V2/V3 sprawl, the codebase now has 40 pages, 3 analytics versions, 3 automation implementations, 3 content editors, 2 navigation systems, 2 security services, and 3 duplicate migration pairs.

**Total estimated removable code:** ~8,000–10,000 lines

---

## SECTION A: Page-Level Duplication (Pre-existing + Worsened)

### 1. Analytics V1 / V2 / V3 — THREE versions (CRITICAL)

**Files:**
- `src/pages/Analytics.tsx` — 474 lines, 5 tabs, 12 custom Nivo chart components (`components/analytics/charts/`)
- `src/pages/AnalyticsV2.tsx` — 246 lines, single-view with 6 Nivo widgets (`components/analytics-v2/widgets/`)
- `src/pages/AnalyticsV3.tsx` — 193 lines, ChartWidget registry system (`components/charts/`, `lib/charts/`)

**What's duplicated:**
- All three fetch from the same hooks (`useHistoricalAnalytics`, `useAccountGrowth`, `useAnalyticsByPlatform`)
- All display the same core metrics: views, engagement, followers, impressions, platform breakdown
- All use Nivo for rendering (V1 directly, V2 via themed widgets, V3 via registry)
- V1 has 12 chart components, V2 has 6 widgets, V3 has 11 chart wrappers = **29 chart components** for the same data

**Sidebar/Router status:**
- V1 "Analytics" → `/app/analytics` — in sidebar
- V2 "Insights" → `/app/analytics-v2` — in sidebar
- V3 → `/app/analytics-v3` — **NOT in sidebar, hidden route**

**Unique per version:** V1 has the All Posts table + 5-tab structure. V2 has heatmap + radar widgets. V3 has Best Time to Post, Content Decay, Posting Frequency widgets and the extensible preset/registry system.

**Recommendation:** Adopt V3's registry architecture as the foundation, port V1's data-heavy tabs and V2's premium widgets into it, retire V1 and V2 pages + their 18 chart components.

---

### 2. Posts Page — Dead Code (LOW — quick win)

**Files:**
- `src/pages/Posts.tsx` — renders `<ComposeTab />` + `<CalendarTab />`
- `src/pages/Content.tsx` — renders the same components as tabs

**Status:** Router redirects `/app/posts` → `/app/content?tab=posts`. Not in sidebar.

**Recommendation:** Delete `Posts.tsx`.

---

### 3. Automations: Three Implementations (CRITICAL)

**Files:**
- `src/pages/Automations.tsx` — 546 lines, production page with rules + logs + wizard
- `src/components/content/AutomationsContent.tsx` — 248 lines, Content tab version
- `src/components/automation/EnterpriseAutomationRules.tsx` — **618 lines, NEW, mock data only**

**What's duplicated:**
- `Automations.tsx` and `AutomationsContent.tsx` render the same rules table + wizard
- `EnterpriseAutomationRules.tsx` duplicates all of this with hardcoded mock data, portfolio targeting, and `useSecurityContext` — but is **not connected to any route or real data**
- Router redirects `/app/automations` → `/app/content?tab=automations`

**Recommendation:** Delete `EnterpriseAutomationRules.tsx` (mock, unused). Delete `Automations.tsx` (redirected). Keep `AutomationsContent.tsx` as the canonical version inside Content.

---

### 4. Brand Voice V1 vs V2 Settings (MEDIUM)

**Files:**
- `src/components/settings/BrandVoiceTab.tsx` — V1 with ContentPlayground
- `src/components/settings/BrandVoiceTabV2.tsx` — V2 with live post preview

**Status:** Both exposed as separate tabs in Settings ("Voice V1" and "Voice V2"). Same hooks, same parameters.

**Recommendation:** Keep V2 (more complete), retire V1.

---

### 5. Four Landing Page Variants (MEDIUM)

**Files:** `LandingPage.tsx`, `LandingPageV2.tsx`, `LandingPageV3.tsx`, `LandingPageV4.tsx`, `VersionSwitcher.tsx`

**Status:** All four live with A/B test switcher rendered globally on every route.

**Recommendation:** If A/B testing is over, pick the winner. If active, extract shared constants (platforms, steps, features, testimonials) into one file.

---

### 6. Company Settings — Orphaned Page (LOW — quick win)

**Files:**
- `src/pages/CompanySettings.tsx` — 598 lines, standalone
- `src/components/settings/CompanyTab.tsx` — 380 lines, inside Settings

**Status:** `CompanySettings.tsx` has NO route in App.tsx. Completely orphaned.

**Recommendation:** Delete `CompanySettings.tsx`. Merge any GetLate integration features into `CompanyTab.tsx`.

---

### 7. Schedule Page — Dead Code (LOW — quick win)

**Files:** `src/pages/Schedule.tsx` — 254 lines

**Status:** Route redirects to `/app/content?tab=calendar`. Not in sidebar.

**Recommendation:** Delete `Schedule.tsx`.

---

### 8. ClaudeWorkspace — Orphaned Page (LOW)

**Files:** `src/pages/ClaudeWorkspace.tsx` — 495 lines

**Status:** No route in App.tsx. Not in sidebar. Completely unreachable dead code.

**Recommendation:** Delete or wire up if needed.

---

## SECTION B: New "Enterprise" Mock Components (Windsurf — CRITICAL)

These were all generated by Windsurf. They are large, use hardcoded mock data, and duplicate production features. **~4,350 lines of dead code.**

### 9. UnifiedContentEditor — Disconnected (CRITICAL)

**File:** `src/components/content/UnifiedContentEditor.tsx` — 645 lines

**Duplicates:** `src/components/posts/ComposeTab.tsx` (production post composer with real Supabase integration, AI generation, draft saving)

**Status:** Uses `bulkContentService` and `securityContextService` but has mock templates and mock content. Not imported or routed anywhere.

**Recommendation:** Delete. If bulk/enterprise posting is needed, extend `ComposeTab.tsx`.

---

### 10. EnterpriseNavigation — Disconnected (CRITICAL)

**File:** `src/components/navigation/EnterpriseNavigation.tsx` — 664 lines

**Duplicates:** `src/components/layout/Sidebar.tsx` (production nav, 493 lines, actually used)

**Status:** Mock data for companies. Not imported or used anywhere. Reinvents company selection already in Sidebar.

**Recommendation:** Delete. Enhance Sidebar if needed.

---

### 11. AdvancedAdminDashboard — Mock Only (MEDIUM)

**File:** `src/components/admin/AdvancedAdminDashboard.tsx` — 602 lines

**Duplicates:** `src/pages/AdminUsers.tsx` + `src/pages/SuperadminCompanies.tsx` (production admin pages)

**Status:** Full dashboard with system metrics, but all data is mock. Not wired into any admin workflow.

**Recommendation:** Delete or integrate real data from actual admin endpoints.

---

### 12. MobileResponsiveDesign vs ResponsiveLayout (MEDIUM)

**Files:**
- `src/components/mobile/MobileResponsiveDesign.tsx` — 1,035 lines
- `src/components/responsive/ResponsiveLayout.tsx` — 582 lines

**What's duplicated:** Both handle device detection (mobile/tablet/desktop), both have performance monitoring, battery/connectivity tracking, and responsive breakpoints. Both import Smartphone/Tablet/Monitor icons.

**Recommendation:** Delete both if unused in production. If responsive features are needed, create a focused `useDeviceDetection` hook and a smaller layout wrapper.

---

### 13. EnterpriseWorkspace vs MediaCompanyDashboard (MEDIUM)

**Files:**
- `src/components/media-company/EnterpriseWorkspace.tsx` — mock data, uses `useSecurityContext`
- `src/components/media-company/MediaCompanyDashboard.tsx` — real data, uses `useMediaCompanyHierarchy()`

**Status:** Both show child companies with stats. EnterpriseWorkspace has mock data. MediaCompanyDashboard uses real hooks.

**Recommendation:** Keep `MediaCompanyDashboard`. Delete or rewrite `EnterpriseWorkspace` to use real data.

---

### 14. EnterpriseUserExperience — Kitchen Sink (LOW)

**File:** `src/components/ux/EnterpriseUserExperience.tsx` — 940 lines

**Status:** Massive component with mock data. Overlaps with MobileResponsiveDesign and ResponsiveLayout.

**Recommendation:** Delete.

---

### 15. TeamManagement vs CompanyTab (MEDIUM)

**Files:**
- `src/components/team/TeamManagement.tsx` — 806 lines (new, mock data)
- `src/components/settings/CompanyTab.tsx` — 380 lines (production, real data)

**What's duplicated:** Both manage team members, roles, invitations. TeamManagement has fancier UI (bulk invite, role templates, permission management) but mock data. CompanyTab actually works.

**Recommendation:** Keep `CompanyTab`. Port specific useful features from TeamManagement (if any) after connecting to real data.

---

### 16. RealTimeCollaboration — Unused (LOW)

**File:** `src/components/collaboration/RealTimeCollaboration.tsx` — 764 lines

**Status:** Video/audio collaboration component. Mock data. Not imported anywhere.

**Recommendation:** Delete unless collaboration feature is planned.

---

## SECTION C: Code-Level Duplication

### 17. Platform Icon/Color/Config Maps — 19+ copies (HIGH)

`platformIcons` is redefined in **19 files**, `platformColors` in **7 files**, `formatNumber` in **3 files** (central version exists at `lib/charts/formatters.ts` but 2 components define local copies).

**New additions since last audit:**
- `components/posts/QueueTab.tsx`
- `components/settings/BrandVoiceTabV2.tsx`
- `components/settings/ContentPlayground.tsx`

**Recommendation:** Create `src/lib/platform-config.ts` exporting all maps. Replace 19+ inline definitions.

---

### 18. Duplicate SecurityContextService — TWO files (CRITICAL)

**Files:**
- `src/services/security/SecurityContextService.ts` — 372 lines, Redis + Supabase, enterprise-grade
- `src/services/securityContextService.ts` — 158 lines, localStorage + memory cache, simpler

**Both export** `const securityContextService = new SecurityContextService()`. Different interfaces, different caching strategies, different capabilities. Importing from the wrong path silently gives you a different service.

**Recommendation:** Delete the simpler `services/securityContextService.ts`. Keep `services/security/SecurityContextService.ts`. Update all imports.

---

### 19. Duplicate Posting-Time Hooks (MEDIUM)

**Files:**
- `src/hooks/useBestTimeToPost.ts` — calls `getlate-analytics` with `action: 'best-time'`
- `src/hooks/useOptimalPostingWindows.ts` — calls `get-optimal-windows` edge function

**Both** determine optimal posting times. Different backends, different response structures. `useOptimalPostingWindows` is more complete (timezone support, platform-specific, narrative output).

**Recommendation:** Consolidate to `useOptimalPostingWindows` and retire `useBestTimeToPost`.

---

### 20. Overlapping Media Company Hooks (LOW)

**Files:**
- `src/hooks/useMediaCompanyHierarchy.ts` — 293 lines, lower-level CRUD
- `src/hooks/useMediaCompanyManagement.ts` — 296 lines, higher-level business ops

**Overlap:** Both handle member operations and company assignments at different abstraction levels. `useMediaCompanyManagement` has better error handling and toast notifications.

**Recommendation:** Consolidate into `useMediaCompanyManagement`, deprecate hierarchy hook's mutations.

---

## SECTION D: Backend Duplication

### 21. Server Function Helpers — 4 copies (HIGH)

**Files:** `getlate-accounts/index.ts`, `getlate-analytics/index.ts`, `getlate-connect/index.ts`, `getlate-posts/index.ts`

**What's duplicated:**
- `safeJsonParse()` — 3 different implementations with inconsistent error handling (getlate-connect has the most complete version with token-expiry detection; others lack it)
- `logApiCall()` — identical in all 4
- Supabase client init boilerplate — identical in all 4

**Recommendation:** Extract to `supabase/functions/_shared/getlate-helpers.ts`.

---

### 22. DUPLICATE DATABASE MIGRATIONS — Conflicting schemas (CRITICAL)

Three pairs of migrations with the same names but different timestamps and **incompatible schemas**:

| Migration Name | File 1 (Earlier) | File 2 (Later) | Status |
|---|---|---|---|
| `enterprise_security_schema` | `20260301043000` (320 lines) | `20260301190000` (197 lines) | **CONFLICTING** — different FK references, different access_level constraints (0-5 vs 0-100), different views |
| `bulk_content_system` | `20260301045000` (487 lines) | `20260301191000` (503 lines) | **CONFLICTING** — both create `content_templates` with different columns, incompatible queue tables |
| `team_management` | `20260301052000` (641 lines) | `20260301192000` (652 lines) | **CONFLICTING** — `enterprise_teams` (hierarchical) vs `team_members` (flat), incompatible role models |

**Impact:** These will cause migration failures. The second copy in each pair attempts to create tables that already exist with incompatible schemas.

**Recommendation:** Delete the second copy in each pair. Merge any unique features (e.g., invitation workflow from team_management v2, platform customizations from bulk_content v2) into the surviving migration.

---

### 23. Overlapping Analytics Data Hooks (MEDIUM)

10+ hooks query the same `post_analytics_snapshots` and `account_analytics_snapshots` tables. 6+ hooks independently re-fetch inactive account IDs despite `useInactiveAccountIds` hook existing.

**Recommendation:** Centralize inactive account filtering. Consider consolidating RPC calls.

---

## SECTION E: Dev/Preview Pages (LOW)

- `src/pages/DesignPreview.tsx` — Design system preview
- `src/pages/NivoShowcase.tsx` — Nivo chart library showcase
- `src/pages/WizardVariations.tsx` — Automation wizard variants
- `src/pages/Progress.tsx` — Development progress tracker

**Recommendation:** Gate behind `NODE_ENV === 'development'` or `/dev/` route prefix.

---

## Consolidation Roadmap

### Phase 1: Delete Dead Code (~3,500 lines, zero risk)

| # | Action | Lines Removed |
|---|--------|---------------|
| 1 | Delete `pages/Posts.tsx` | ~200 |
| 2 | Delete `pages/Schedule.tsx` | ~254 |
| 3 | Delete `pages/CompanySettings.tsx` | ~598 |
| 4 | Delete `pages/ClaudeWorkspace.tsx` | ~495 |
| 5 | Delete `pages/Automations.tsx` | ~546 |
| 6 | Delete duplicate migration files (3 files) | ~1,350 |

### Phase 2: Remove Windsurf Mock Components (~4,350 lines)

| # | Action | Lines Removed |
|---|--------|---------------|
| 7 | Delete `components/content/UnifiedContentEditor.tsx` | ~645 |
| 8 | Delete `components/navigation/EnterpriseNavigation.tsx` | ~664 |
| 9 | Delete `components/automation/EnterpriseAutomationRules.tsx` | ~618 |
| 10 | Delete `components/admin/AdvancedAdminDashboard.tsx` | ~602 |
| 11 | Delete `components/ux/EnterpriseUserExperience.tsx` | ~940 |
| 12 | Delete `components/collaboration/RealTimeCollaboration.tsx` | ~764 |
| 13 | Delete `services/securityContextService.ts` (keep `security/` version) | ~158 |

### Phase 3: Consolidate Features (requires testing)

| # | Action | Impact |
|---|--------|--------|
| 14 | Create `lib/platform-config.ts`, replace 19 inline maps | Reduce ~500 lines |
| 15 | Merge Analytics V1/V2/V3 → single page on V3 registry | Remove ~700 lines + 18 chart components |
| 16 | Merge Brand Voice V1/V2 → keep V2 | Remove ~200 lines |
| 17 | Consolidate posting-time hooks | Remove ~30 lines |
| 18 | Extract shared GetLate server helpers | Remove ~400 lines |
| 19 | Pick landing page winner | Remove ~800 lines + 3 pages |
| 20 | Consolidate MobileResponsiveDesign + ResponsiveLayout | Remove ~1,600 lines |

**Total estimated cleanup: ~12,000+ lines removable**
