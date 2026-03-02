# Duplicate Features & Functions Audit

> Generated 2026-03-02 — Full codebase review of overlapping features

---

## Summary

There are **12 major areas** of duplication across the app (9 frontend, 3 backend). Some are clear V1/V2 experiments that should be consolidated; others are features that were split across pages but are functionally identical. The biggest wins come from consolidating pages that share the same underlying components and removing vestigial pages that already redirect elsewhere.

---

## 1. Analytics V1 vs Analytics V2 (HIGH IMPACT)

**Files:**
- `src/pages/Analytics.tsx` — 450-line page with 5 tabs, 12+ chart components from `components/analytics/`
- `src/pages/AnalyticsV2.tsx` — 238-line single-view page using 6 Nivo-based widgets from `components/analytics-v2/`

**What's duplicated:**
- Both pages fetch from the **exact same hooks**: `useHistoricalAnalytics`, `useAccountGrowth`, `usePlatformBreakdown`, `useFollowersByPlatform`, `useAnalyticsByPlatform`
- Both show follower distribution donuts, performance-over-time charts, platform comparison bars, and stat KPI cards
- Both share the same `DateRangeFilter` component
- V1 uses Recharts-based components (`components/analytics/charts/`), V2 uses Nivo-based widgets (`components/analytics-v2/widgets/`)

**Sidebar links:**
- "Analytics" → `/app/analytics` (V1)
- "Insights" → `/app/analytics-v2` (V2)

**Recommendation:** Pick one charting library and merge into a single Analytics page. Retire the other. Currently two separate chart libraries (Recharts + Nivo) are bundled, increasing bundle size.

---

## 2. Posts Page vs Content Page (HIGH IMPACT)

**Files:**
- `src/pages/Posts.tsx` — 2 tabs: Compose + Calendar
- `src/pages/Content.tsx` — 6 tabs: Articles, **Social Posts**, **Calendar**, Feeds, Automations, Logs

**What's duplicated:**
- Content's "Social Posts" tab renders `<ComposeTab />` — the **exact same component** used by Posts
- Content's "Calendar" tab renders `<CalendarTab />` — the **exact same component** used by Posts
- Posts page is already redirected from `/app/posts` → `/app/content?tab=posts` in the router

**Sidebar links:** Only "Content" appears in the sidebar. The Posts page is a dead route accessed only via legacy redirects.

**Recommendation:** Delete `src/pages/Posts.tsx` entirely. It's already fully subsumed by Content. The redirect in the router is already correct.

---

## 3. Automations Page vs Content Automations Tab (HIGH IMPACT)

**Files:**
- `src/pages/Automations.tsx` — 546-line standalone page with Rules + Logs tabs
- `src/components/content/AutomationsContent.tsx` — Content page's "Automations" tab
- `src/components/content/AutomationLogsContent.tsx` — Content page's "Logs" tab

**What's duplicated:**
- The standalone Automations page has its own full Rules + Logs implementation
- Content page has separate Automations and Logs tabs that provide the same functionality
- Router already redirects `/app/automations` → `/app/content?tab=automations`

**Recommendation:** Keep the Content-embedded version (it's the canonical location per the sidebar/router). Delete the standalone `Automations.tsx` page. Ensure the Content tab components have feature parity with the standalone page (the standalone one is more complete with the wizard dialog).

---

## 4. Brand Voice V1 vs V2 Settings (MEDIUM IMPACT)

**Files:**
- `src/components/settings/BrandVoiceTab.tsx` — V1 voice settings with `ContentPlayground`
- `src/components/settings/BrandVoiceTabV2.tsx` — V2 voice settings with live post preview, feed item picker

**What's duplicated:**
- Both import from the **same hooks**: `useVoiceSettings`, `useSaveVoiceSettings`, `useGlobalVoiceDefaults`
- Both configure the same voice parameters: tone, content length, emoji style, hashtag strategy, custom instructions, voice mode
- Both are visible as separate tabs in Settings ("Voice V1" and "Voice V2")

**Recommendation:** Pick the better UX (V2 appears more complete with live preview) and consolidate into a single "Brand Voice" tab.

---

## 5. Four Landing Page Variants (MEDIUM IMPACT)

**Files:**
- `src/pages/LandingPage.tsx` — V1 (default at `/`)
- `src/pages/LandingPageV2.tsx` — V2: "Editorial / Warm Minimalist" at `/v2`
- `src/pages/LandingPageV3.tsx` — V3: "Gradient Glass / Aurora" at `/v3`
- `src/pages/LandingPageV4.tsx` — V4: "Bold Geometric / Neon" at `/v4`
- `src/components/landing/VersionSwitcher.tsx` — A/B test switcher rendered globally

**What's duplicated:**
- All four pages contain the **same content sections**: hero, platforms list, how-it-works steps, features, testimonials, pricing, CTA, footer
- All define the same `platforms`, `steps`, and feature constants inline with only cosmetic differences
- The `VersionSwitcher` is rendered on every route (even protected app routes)

**Recommendation:** If A/B testing is still active, extract shared data (platforms, steps, features, testimonials) into a single constants file and make the variants theme-only. If testing is complete, pick the winner, delete the others, and remove the `VersionSwitcher`.

---

## 6. Company Settings Page vs Settings Company Tab (MEDIUM IMPACT)

**Files:**
- `src/pages/CompanySettings.tsx` — Standalone page with company info, GetLate integration, team members
- `src/components/settings/CompanyTab.tsx` — Tab inside the unified Settings page

**What's duplicated:**
- Both manage the same company data: company name, team members, invitations
- The standalone page has additional GetLate profile linking/name editing
- The standalone page is not linked from the sidebar; only reachable via legacy redirect `/company-settings` → `/app/settings?tab=company`

**Recommendation:** Merge the GetLate integration features from the standalone page into the Settings > Company tab. Delete `CompanySettings.tsx`.

---

## 7. Platform Icon/Color Maps (CODE-LEVEL DUPLICATION)

**Duplicated across 16+ files:**

`platformIcons` maps are redefined in:
- `pages/Analytics.tsx`, `pages/Automations.tsx`, `pages/Schedule.tsx`, `pages/GetLateMapping.tsx`
- `components/posts/ComposeTab.tsx`, `components/posts/CalendarTab.tsx`
- `components/dashboard/RecentPostsTable.tsx`, `components/dashboard/TopPostSpotlight.tsx`, `components/dashboard/UpcomingTimeline.tsx`
- `components/analytics/TopPostCard.tsx`, `components/analytics/TopPostsTable.tsx`, `components/analytics/SyncExternalPostDialog.tsx`
- `components/automations/AutomationRuleWizard.tsx`
- `components/content/AutomationsContent.tsx`
- `components/onboarding/SamplePostsSidebar.tsx`
- `components/layout/IntegrationStatusMenu.tsx`

`platformColors` maps are redefined in 7 files.

`formatNumber` utility is redefined in 12 files.

`platformConfig` is defined separately in 4 files.

**Recommendation:** Create a single shared module (e.g., `src/lib/platform-utils.ts`) exporting `platformIcons`, `platformColors`, `platformNames`, `platformConfig`, and `formatNumber`. Import everywhere.

---

## 8. Schedule Page vs Calendar Tab (LOW IMPACT)

**Files:**
- `src/pages/Schedule.tsx` — Standalone weekly schedule view with calendar + upcoming posts sidebar
- `src/components/posts/CalendarTab.tsx` — Calendar component embedded in Content and (former) Posts pages

**What's duplicated:**
- Both show a calendar view of scheduled posts
- Both use the same data sources (`usePosts`, `useAccounts`)
- The Schedule page has its own `platformIcons`/`platformColors` maps
- Route `/schedule` already redirects to `/app/content?tab=calendar`

**Recommendation:** Delete `src/pages/Schedule.tsx`. The Content > Calendar tab is the canonical location.

---

## 9. Dev/Preview Pages (LOW IMPACT)

**Files:**
- `src/pages/DesignPreview.tsx` — Design system preview
- `src/pages/NivoShowcase.tsx` — Nivo chart library showcase
- `src/pages/WizardVariations.tsx` — Automation wizard variants

**Recommendation:** These are dev-only pages. Consider gating them behind a `NODE_ENV === 'development'` check or moving to a `/dev/` route prefix so they aren't accessible in production.

---

## 10. Duplicated Server Function Helpers (BACKEND — HIGH IMPACT)

**Files:**
- `supabase/functions/getlate-accounts/index.ts`
- `supabase/functions/getlate-analytics/index.ts`
- `supabase/functions/getlate-connect/index.ts`
- `supabase/functions/getlate-posts/index.ts`

**What's duplicated:**
- `safeJsonParse()` — identical implementation copy-pasted into all 4 functions
- `logApiCall()` — identical implementation in all 4 functions
- Authorization/setup boilerplate (CORS headers, Supabase client init, API key validation, user extraction from auth header) — repeated in all 4 functions

**Recommendation:** Extract to a shared helper module at `supabase/functions/_shared/getlate-helpers.ts`. This would eliminate ~400+ lines of duplicated server code.

---

## 11. Overlapping Analytics Data Hooks (BACKEND — MEDIUM IMPACT)

**10+ hooks query the same tables with overlapping logic:**
- `useHistoricalAnalytics`, `usePlatformBreakdown`, `useDashboardStats`, `useDashboardTrends`, `useAnalyticsByPublishDate`, `useFollowersByPlatform`, `useDailyPlatformMetrics`, `useViewsByPublishDate`, `useTopPerformingPosts`, `useAccountGrowth`, `useAnalyticsStats`

**What's duplicated:**
- All filter by `company_id` and active account status
- 6+ hooks independently re-fetch inactive account IDs (despite `useInactiveAccountIds` hook existing)
- Identical date-range filtering patterns (`.gte()/.lte()`)
- Same Map/reduce aggregation patterns for deduplication by `account_id` or `post_id`

**Recommendation:** Create a shared analytics data layer. Centralize inactive account filtering via the existing `useInactiveAccountIds` hook. Consider a single RPC-backed analytics hook that returns multiple metric views from one query.

---

## 12. Duplicated CRUD Mutation Patterns (BACKEND — LOW IMPACT)

**8+ hooks follow identical Create/Update/Delete patterns:**
- `useRssFeeds` (create/update/delete)
- `useAutomationRules` (create/update/delete)
- `useGetLatePosts` (create/update/delete)
- `usePostDrafts` (save/delete)
- `useCompany` (create/update)
- `useProfile` (update)
- `usePendingInvitations` (revoke)

**What's duplicated:**
- Same boilerplate: get company context → `useMutation` → `onSuccess: invalidateQueries + toast` → `onError: toast destructive`
- Settings hooks (`useVoiceSettings`, `useGlobalVoiceDefaults`) both implement identical check-then-upsert patterns

**Recommendation:** Consider a generic mutation factory or shared `useEntityMutation` helper that encapsulates the query-invalidation + toast pattern. Lower priority since the duplication is structural rather than logic.

---

## Quick-Win Consolidation Roadmap

| Priority | Action | Files to Remove | Impact |
|----------|--------|-----------------|--------|
| 1 | Delete Posts page (already superseded by Content) | `pages/Posts.tsx` | Clean up dead code |
| 2 | Delete Schedule page (already redirected) | `pages/Schedule.tsx` | Clean up dead code |
| 3 | Extract shared platform utils | Create `lib/platform-utils.ts` | Reduce ~16 duplicate maps |
| 4 | Merge Analytics V1 + V2 | Remove one of `analytics/` or `analytics-v2/` | Reduce bundle size, simplify nav |
| 5 | Merge Brand Voice V1 + V2 | Remove `BrandVoiceTab.tsx` | Simplify settings |
| 6 | Merge CompanySettings into Settings tab | Remove `pages/CompanySettings.tsx` | Reduce page count |
| 7 | Consolidate Automations into Content | Remove `pages/Automations.tsx` | Single source of truth |
| 8 | Pick landing page winner | Remove 3 of 4 landing pages + VersionSwitcher | Reduce bundle, clean public routes |
| 9 | Extract shared GetLate server helpers | Create `_shared/getlate-helpers.ts` | Eliminate ~400 lines duplicated server code |
| 10 | Centralize inactive account filtering | Use `useInactiveAccountIds` consistently | Remove 6+ redundant queries |
