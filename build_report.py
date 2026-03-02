#!/usr/bin/env python3
"""Build script to append Phase 1-3 to report.html"""

def row(status, feature, files, notes):
    badge_map = {
        "complete": "badge-complete",
        "partial": "badge-partial",
        "stubbed": "badge-stubbed",
        "missing": "badge-missing"
    }
    bc = badge_map.get(status, "badge-partial")
    return f'\n<tr data-status="{status}"><td class="td-feature">{feature}</td><td class="td-mono">{files}</td><td><span class="badge {bc}">{status.capitalize()}</span></td><td class="td-notes">{notes}</td></tr>'

def cat(title, count, badges_html, rows_html):
    return f"""
  <div class="cat-card">
    <button class="cat-header" onclick="toggleCat(this)">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.9375rem;color:#f4f4f5;">{title}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--text-muted);">{count} features</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        {badges_html}
        <svg class="cat-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>
    <div class="cat-body">
      <div style="overflow-x:auto;padding:0 0.5rem 1rem;">
        <table class="report-table">
          <thead><tr><th style="width:22%">Feature</th><th style="width:35%">Files / Components</th><th style="width:11%">Status</th><th>Notes</th></tr></thead>
          <tbody>{rows_html}
          </tbody>
        </table>
      </div>
    </div>
  </div>"""

# ── PHASE 1 ─────────────────────────────────────
r1 = (row("complete","Email/Password Login","src/components/auth/LoginForm.tsx","Supabase Auth integration") +
      row("complete","Email/Password Signup","src/components/auth/SignupForm.tsx","Supports invite tokens via URL params") +
      row("complete","Password Reset","src/pages/ResetPassword.tsx","Hash &amp; query-based recovery links") +
      row("complete","OAuth Callback","src/pages/OAuthCallback.tsx","Popup + redirect mode for GetLate") +
      row("complete","Protected Routes","src/components/auth/ProtectedRoute.tsx","Auto-redirect to onboarding if needed") +
      row("complete","Superadmin Check","src/contexts/AuthContext.tsx","Via is_superadmin RPC — no hardcoded emails") +
      row("complete","User Impersonation","src/contexts/AuthContext.tsx + ImpersonationBanner.tsx","Magic link tokens, session save/restore") +
      row("complete","Magic Links","edge fn: impersonate-user","Used for impersonation flow") +
      row("partial","PostHog Tracking","src/contexts/AuthContext.tsx:73","Auto-identify on auth; no event taxonomy"))

r2 = (row("complete","URL Discovery","src/pages/GetStarted.tsx + Discover.tsx","Full crawl: RSS, social channels, AI posts") +
      row("complete","Discovery Board","src/components/onboarding/DiscoveryBoard.tsx","Business info, RSS feeds, social channels") +
      row("complete","Discovery Progress Modal","src/components/onboarding/DiscoveryProgressModal.tsx","Real-time phase tracking") +
      row("complete","Sample Post Previews","src/components/onboarding/SocialPostPreviewModal.tsx","4 persona-based AI posts") +
      row("complete","Company Setup","src/pages/SetupCompany.tsx","Name/slug creation, invitation acceptance") +
      row("complete","Onboarding Wizard","src/pages/OnboardingWizard.tsx","3-step with progress tracking") +
      row("complete","Step 1: Connect Socials","src/components/onboarding/steps/ConnectSocialsStep.tsx","8 platforms, OAuth + page selection") +
      row("complete","Step 2: Brand Voice","src/components/onboarding/steps/BrandVoiceStep.tsx","Tone, length, emoji, hashtags config") +
      row("complete","Step 3: Automation","src/components/onboarding/steps/AutomationStep.tsx","Pre-filled rule wizard") +
      row("complete","Progress Widget","src/components/dashboard/OnboardingProgressWidget.tsx","Dashboard widget with step navigation") +
      row("complete","Status Tracking","src/hooks/useOnboardingStatus.ts","in_progress to wizard_complete to complete"))

r3 = (row("complete","KPI Stat Cards","src/components/dashboard/StatCard.tsx","Followers, Reach, Engagement Rate, Posts (90d)") +
      row("complete","AI Daily Briefing","src/components/dashboard/DailyBriefing.tsx","AI-generated, 4hr cache, manual refresh") +
      row("complete","Top Post Spotlight","src/components/dashboard/TopPostSpotlight.tsx","Best post from last 7 days") +
      row("complete","Trend Metrics","src/components/dashboard/TrendMetrics.tsx","WoW direction indicators") +
      row("complete","Engagement Chart","src/components/dashboard/EngagementChart.tsx","Nivo 30-day chart") +
      row("complete","Recent Posts Table","src/components/dashboard/RecentPostsTable.tsx","Multi-platform expandable rows") +
      row("complete","Upcoming Timeline","src/components/dashboard/UpcomingTimeline.tsx","Scheduled posts, pending approvals, drafts") +
      row("complete","Framer Motion Animations","src/pages/Index.tsx:16-24","Staggered fade-up entrance per widget"))

r4 = (row("complete","Content Hub (6 tabs)","src/pages/Content.tsx","Articles, Posts, Calendar, Feeds, Automations, Logs") +
      row("complete","Multi-Step Compose","src/components/posts/ComposeTab.tsx","7-step flow, strategy-first AI — 1,653 lines") +
      row("complete","AI Strategy Generation","src/hooks/useGenerateSocialPost.ts","Strategy to Posts to Compliance pipeline") +
      row("complete","Per-Platform Editing","src/components/posts/ComposeTab.tsx","Platform-specific editing and preview") +
      row("complete","Draft Management","src/hooks/usePostDrafts.ts","Auto-save, resume, CRUD") +
      row("complete","Calendar View (week only)","src/components/posts/CalendarTab.tsx","Week view only — month view missing") +
      row("complete","Post Scheduling","src/components/posts/ComposeTab.tsx","Date/time picker, future validation") +
      row("complete","Multi-Platform Preview","src/components/content/MultiPlatformPreview.tsx","FB/IG/TW/LI previews") +
      row("complete","Approval Workflow","src/pages/ApprovePost.tsx","Token-based, 7-day expiry, public route") +
      row("complete","Articles Browser","src/components/content/ArticlesTab.tsx","RSS articles with status filters") +
      row("complete","Contextual Card Actions","src/components/content/ContextualCardActions.tsx","State-dependent action buttons") +
      row("partial","Flyout Editor","src/components/content/FlyoutEditor.tsx","Split-panel editor/preview — basic impl"))

r5 = (row("complete","Feed Management","src/components/content/FeedsTab.tsx","CRUD, activation toggle, scraping config") +
      row("complete","Feed Form Dialog","src/components/content/FeedFormDialog.tsx","URL, polling interval, Firecrawl toggle") +
      row("complete","Automation Rules","src/components/content/AutomationsContent.tsx","Full CRUD with rule wizard") +
      row("complete","Automation Rule Wizard","src/components/automations/AutomationRuleWizard.tsx","Feed to platform to action to objective config") +
      row("complete","Automation Logs","src/components/content/AutomationLogsContent.tsx","Filtering, pagination, detail modal") +
      row("complete","RSS Polling","edge fn: rss-poll","XML/Atom/JSON + Firecrawl scraping") +
      row("complete","Article Processing","edge fn: run-automation-article","AI content generation per rule") +
      row("complete","Feed Discovery","edge fn: discover-rss-feeds","Auto-discover RSS from any URL"))

r6 = (row("complete","Analytics Dashboard V1","src/pages/Analytics.tsx","5 tabs: Overview, Platforms, Engagement, Audience, Posts") +
      row("partial","Analytics V2","src/pages/AnalyticsV2.tsx","Separate v2 — in-progress") +
      row("complete","12+ Nivo Chart Types","src/components/analytics/charts/","Area, Bar, Donut, Line, Stacked, Heatmap, Radar") +
      row("complete","Date Range Filter","src/components/analytics/DateRangeFilter.tsx","7D/30D/90D presets, custom, Since Signup") +
      row("complete","Platform Breakdown Table","src/components/analytics/PlatformBreakdownTable.tsx","Per-platform metrics table") +
      row("complete","Top Posts Table","src/components/analytics/TopPostsTable.tsx","Sortable, filterable, highlight support") +
      row("complete","Sync External Posts","src/components/analytics/SyncExternalPostDialog.tsx","Import analytics for external posts") +
      row("complete","Optimal Posting Widget","src/components/analytics/OptimalPostingWidget.tsx","Best time recommendations") +
      row("stubbed","Portfolio Analytics","src/components/analytics/PortfolioAnalytics.tsx","Mock data — no real multi-company aggregation"))

r7 = (row("complete","Connections Page","src/pages/Connections.tsx","10 platforms with OAuth flow") +
      row("complete","OAuth Connect/Disconnect","src/hooks/useGetLateAccounts.ts","Full connect/disconnect cycle via GetLate") +
      row("complete","Page Selection Dialog","src/components/connections/PageSelectionDialog.tsx","For FB/IG/LI/YT multi-page selection") +
      row("complete","Platform Cards","src/components/dashboard/PlatformCard.tsx","Connection status, followers, username") +
      row("complete","GetLate API Layer","src/lib/api/getlate.ts","Connect, Accounts, Posts, Analytics APIs") +
      row("complete","10 Platform Support","src/pages/Connections.tsx","IG, X, FB, LI, TikTok, YT, Pinterest, Reddit, Bluesky, Threads"))

r8 = (row("complete","Profile Tab","src/components/settings/ProfileTab.tsx","Name, email, password, appearance") +
      row("complete","Company Tab","src/components/settings/CompanyTab.tsx","Name, slug, GetLate profile, team management") +
      row("complete","Brand Voice V1 (legacy)","src/components/settings/BrandVoiceTab.tsx","Duplicate of V2 — candidate for removal") +
      row("complete","Brand Voice V2","src/components/settings/BrandVoiceTabV2.tsx","5 voice modes, Content Playground") +
      row("stubbed","Notifications Tab","src/components/settings/NotificationsTab.tsx","UI toggles only — no backend persistence") +
      row("complete","Email Branding","src/components/settings/EmailBrandingTab.tsx","Logo, colors, templates, test send") +
      row("complete","Content Playground","src/components/settings/ContentPlayground.tsx","Live AI post testing with voice settings"))

r9 = (row("complete","Superadmin Companies","src/pages/SuperadminCompanies.tsx","Full metrics table, bulk delete") +
      row("complete","API Logs","src/pages/ApiLogs.tsx","Filters, detail modal, AI token costs") +
      row("complete","Cron Health","src/pages/CronHealth.tsx","Job execution monitoring") +
      row("complete","GetLate Mapping","src/pages/GetLateMapping.tsx","Company to GetLate profile linking") +
      row("complete","Wizard Variations","src/pages/WizardVariations.tsx","Onboarding wizard testing/preview") +
      row("complete","Platform Settings","src/pages/PlatformSettings.tsx","Platform branding config") +
      row("complete","Progress Page","src/pages/Progress.tsx","Onboarding progress overview") +
      row("complete","Impersonation","src/contexts/AuthContext.tsx","Full flow with session restore") +
      row("partial","Advanced Admin Dashboard","src/components/admin/AdvancedAdminDashboard.tsx","UI complete — mock data, no backend"))

r10 = (row("complete","Strategy-First Content Gen","src/hooks/useGenerateSocialPost.ts","3-step: strategy to posts to compliance") +
       row("complete","Brand Voice AI (V2)","src/components/settings/BrandVoiceTabV2.tsx","5 autonomy levels — AI-decides at max") +
       row("complete","AI Daily Briefing","src/components/dashboard/DailyBriefing.tsx","Dashboard summary with metrics context") +
       row("complete","Claude Assistant","src/components/claude/ClaudeAssistant.tsx","Claude chat integration in workspace") +
       row("complete","Content Playground","src/components/settings/ContentPlayground.tsx","Live AI post testing with voice settings") +
       row("complete","Global Voice Defaults","src/components/settings/VoiceDefaultsSection.tsx","Superadmin global defaults across companies"))

r11 = (row("complete","Courier Inbox","src/components/layout/NotificationInbox.tsx","Bell icon, unread count, Courier SDK") +
       row("complete","Courier Token Provider","src/contexts/CourierContext.tsx","JWT auth, 12hr refresh cycle") +
       row("complete","Slack Notifications","src/services/notifications/SlackService.ts","Multi-type notification support") +
       row("stubbed","Notification Preferences","src/components/settings/NotificationsTab.tsx","UI toggles only — no DB persistence"))

r12 = (row("complete","Company Switcher","src/components/company/CompanySwitcher.tsx","Search, cross-tab sync") +
       row("complete","Selected Company Context","src/contexts/SelectedCompanyContext.tsx","localStorage persistence") +
       row("complete","Company Hooks","src/hooks/useCompany.ts + useCompanies.ts","CRUD, memberships, role checks") +
       row("complete","User Invitations","src/components/company/InviteUserDialog.tsx","Full invite to accept flow") +
       row("partial","Media Company Hierarchy","src/hooks/useMediaCompanyHierarchy.ts","Hooks exist — no hierarchy management UI"))

r13 = (row("complete","Theme Provider (6 variants)","src/contexts/ThemeContext.tsx","Professional, Modern, Minimal, Vibrant, Dark Pro, Aurora") +
       row("complete","Theme Toggle","src/components/theme/ThemeToggle.tsx","Selection UI with preview swatches") +
       row("complete","Theme Preview","src/components/theme/ThemePreview.tsx","Side-by-side comparison") +
       row("complete","CSS Variable Injection","src/contexts/ThemeContext.tsx","Applies 40+ CSS custom properties to document root") +
       row("complete","Figma Import UI","src/components/theme/FigmaThemeImport.tsx","Import dialog with preview") +
       row("partial","Figma Service","src/services/figmaService.ts","Placeholder extraction — not wired to real Figma API") +
       row("missing","Custom Theme Persistence","—","Imported themes don't persist to themeVariants"))

bc = lambda s: f'<span class="badge badge-{s.split()[1].lower()}">{s}</span>'

PHASE1 = """
<!-- PHASE 1 -->
<section id="phase1" style="max-width:72rem;margin:0 auto;padding:0 1.5rem 5rem;">
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
    <span class="phase-num phase-1">1</span>
    <div>
      <h2 style="font-size:1.625rem;font-weight:800;color:#f4f4f5;letter-spacing:-0.02em;">Feature Inventory</h2>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:2px;">13 categories assessed across the src/ directory</p>
    </div>
    <div class="phase-divider"></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:1.25rem;" class="no-print">
    <div style="display:flex;flex-wrap:wrap;gap:0.375rem;">
      <button class="filter-pill active" onclick="filterStatus('all')">All</button>
      <button class="filter-pill" onclick="filterStatus('complete')"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4ade80;"></span>Complete</button>
      <button class="filter-pill" onclick="filterStatus('partial')"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fbbf24;"></span>Partial</button>
      <button class="filter-pill" onclick="filterStatus('stubbed')"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#818cf8;"></span>Stubbed</button>
      <button class="filter-pill" onclick="filterStatus('missing')"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f87171;"></span>Missing</button>
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem;">
      <button onclick="expandAll()" style="font-size:0.75rem;color:var(--text-muted);background:none;border:none;cursor:pointer;">Expand All</button>
      <span style="color:#3f3f46;">|</span>
      <button onclick="collapseAll()" style="font-size:0.75rem;color:var(--text-muted);background:none;border:none;cursor:pointer;">Collapse All</button>
    </div>
  </div>
""" + \
    cat("Authentication &amp; Auth Flows", 9, '<span class="badge badge-complete">8 Complete</span><span class="badge badge-partial">1 Partial</span>', r1) + \
    cat("Onboarding", 11, '<span class="badge badge-complete">11 Complete</span>', r2) + \
    cat("Dashboard", 8, '<span class="badge badge-complete">8 Complete</span>', r3) + \
    cat("Content / Posts", 12, '<span class="badge badge-complete">11 Complete</span><span class="badge badge-partial">1 Partial</span>', r4) + \
    cat("RSS Automations", 8, '<span class="badge badge-complete">8 Complete</span>', r5) + \
    cat("Analytics", 9, '<span class="badge badge-complete">7 Complete</span><span class="badge badge-partial">1 Partial</span><span class="badge badge-stubbed">1 Stubbed</span>', r6) + \
    cat("Connections / Integrations", 6, '<span class="badge badge-complete">6 Complete</span>', r7) + \
    cat("Settings", 7, '<span class="badge badge-complete">6 Complete</span><span class="badge badge-stubbed">1 Stubbed</span>', r8) + \
    cat("Admin / Superadmin", 9, '<span class="badge badge-complete">8 Complete</span><span class="badge badge-partial">1 Partial</span>', r9) + \
    cat("AI Features", 6, '<span class="badge badge-complete">6 Complete</span>', r10) + \
    cat("Notifications", 4, '<span class="badge badge-complete">3 Complete</span><span class="badge badge-stubbed">1 Stubbed</span>', r11) + \
    cat("Multi-tenancy", 5, '<span class="badge badge-complete">4 Complete</span><span class="badge badge-partial">1 Partial</span>', r12) + \
    cat("Theme System", 7, '<span class="badge badge-complete">5 Complete</span><span class="badge badge-partial">1 Partial</span><span class="badge badge-missing">1 Missing</span>', r13) + \
    "\n</section>\n"

with open('c:/Users/alana/OneDrive/Documents/GitHub/Social-Suite-Claude-Code/report.html', 'a', encoding='utf-8') as f:
    f.write(PHASE1)

print("Phase 1 OK — chars written:", len(PHASE1))
