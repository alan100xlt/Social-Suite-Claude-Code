# Longtale.ai — Social Suite

Social media management platform for media companies. Handles multi-tenant company hierarchies, AI-powered content generation from RSS feeds, cross-platform scheduling, and analytics.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite 5, React Router v6
- **UI:** Tailwind CSS v3, Shadcn/ui (Radix primitives), Lucide icons
- **State:** TanStack Query v5 for server state, React Context for auth/company/theme
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Realtime)
- **Analytics:** PostHog (`phc_VGfw8iKfFpDImNWKfjyulFmebM5G7bUeHUI8pzhm5bA`)
- **Notifications:** Courier (token via `courier-token` edge function)
- **Charts:** Recharts (primary), Nivo (secondary — analytics-v2)

## Environment Variables

All Vite env vars use `import.meta.env.VITE_*` — never `process.env.*`.

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

## Project Structure

```
src/
  pages/            # Route-level components (flat, one per route — 40+ pages)
  components/
    ui/             # Shadcn primitives — do not modify directly
    layout/         # DashboardLayout, Sidebar, banners
    auth/           # ProtectedRoute, LoginForm
    admin/          # Admin-specific components
    dashboard/      # Widgets, charts, briefing
    posts/          # Compose, Calendar, Drafts tabs
    content/        # Automations, Feeds, RSS rules
    analytics/      # Charts, metric widgets, top posts
    analytics-v2/   # Nivo-based widget system (widgets/ + widgets-v2/)
    settings/       # Profile, Company, BrandVoice tabs
    onboarding/     # DiscoveryBoard, wizard steps
    company/        # CompanySwitcher, InviteUser
    connections/    # Platform OAuth connection management
    media-company/  # Media company hierarchy features
    collaboration/  # Collaboration features
    landing/        # VersionSwitcher (landing page nav)
  contexts/         # AuthContext, SelectedCompanyContext, ThemeContext, PlatformContext, CourierContext
  hooks/            # 45+ React Query hooks wrapping Supabase calls
  services/         # Client-side service classes (security)
  integrations/
    supabase/       # Auto-generated client + types
  lib/              # posthog.ts, utils.ts, nivo-theme.ts
    api/            # API helpers
    charts/         # Chart utilities + presets
    metrics/        # Metric calculation helpers
  test/             # Unit tests (vitest, jsdom)
  tests/            # Integration, smoke, and e2e tests
```

## Routing

All app routes are under `/app/*` (protected). Marketing/landing at `/`. Auth at `/auth/*`.

Key routes:

**Public / Marketing:**
- `/` — LandingPage (V1, default)
- `/v2` `/v3` `/v4` — Landing page variants
- `/get-started` — GetStarted page
- `/discover` — Discover page
- `/design-preview` — DesignPreview (demo)
- `/nivo-showcase` — Nivo chart showcase (demo)
- `/analytics-showcase` — Analytics widget showcase (demo)

**Auth:**
- `/auth/login` `/auth/signup` `/auth/reset-password` `/auth/callback`

**Standalone:**
- `/approve/:token` — External post approval (no auth required)

**App (protected):**
- `/app` — Dashboard (Index.tsx)
- `/app/content` — Posts, Calendar, Drafts, Automations, Feeds tabs
- `/app/analytics` — Recharts analytics
- `/app/analytics-v2` — Nivo analytics (premium widgets)
- `/app/analytics-v3` `/app/analytics-v4` — Experimental analytics views
- `/app/connections` — OAuth platform connections
- `/app/settings` — Profile, Company, BrandVoice, Notifications
- `/app/media-company/:id` — Media company dashboard
- `/app/media-company/:id/workspace` — Media company workspace

**Onboarding (protected):**
- `/app/onboarding/setup` — SetupCompany
- `/app/onboarding/wizard` — OnboardingWizard

**Admin (protected):**
- `/app/admin/api-logs` — API log viewer
- `/app/admin/mapping` — GetLate mapping tool
- `/app/admin/email-branding` — Email branding settings
- `/app/admin/platform` — Platform settings
- `/app/admin/companies` — Superadmin company management
- `/app/admin/users` — User management
- `/app/admin/cron-health` — Cron job health dashboard
- `/app/admin/wizard` — Wizard variations
- `/app/admin/progress` — Progress tracking

**Redirects:** Many legacy paths (`/login`, `/posts`, `/automations`, etc.) redirect to their `/app/*` equivalents.

All pages are **eagerly imported** in App.tsx — no lazy loading yet.

## Key Patterns

### Data Fetching
Use TanStack Query. All Supabase calls go through hooks in `src/hooks/`.
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['key', dependency],
  queryFn: async () => { /* supabase call */ }
})
```

### Auth
`useAuth()` from `AuthContext` — provides `user`, `session`, `signOut`.
Protected routes wrap with `<ProtectedRoute>`.

### Multi-tenancy
`useSelectedCompany()` from `SelectedCompanyContext` — persisted to localStorage.
Company ID flows into all Supabase queries for RLS enforcement.

### Theme System
Custom `ThemeContext` with 6 variants: `professional` (default), `modern`, `minimal`, `vibrant`, `dark-pro`, `aurora`.
Sets CSS custom properties on `:root` and `theme-{variant}` class on `body`.
Do NOT use `next-themes` — it's in package.json but unused.

### CSS / Styling
`@import` for Google Fonts must come BEFORE `@tailwind` directives in index.css.
Use `import.meta.env.*` not `process.env.*` — this is Vite, not CRA.

## Bug-Fixing Discipline

When fixing a bug, always ask **"why does this failure mode exist?"** before writing a fix. If the answer is "because we designed it with unnecessary complexity," simplify the design rather than patching the symptom. Treat the root cause, not the surface error. A band-aid that makes tests pass is not a fix — it's tech debt with a green checkmark.

## Known Issues / Watch Out For

- **No lazy loading** — all pages bundled eagerly. Large bundle (~4MB after Nivo additions). Add `React.lazy()` for admin/analytics routes.
- **`SecurityContextService`** in `src/services/security/` imports `ioredis` — this is server-only code. Never import it in client components. Only used by `MediaCompanyWorkspace.tsx` currently.
- **`securityContextService.ts`** (lowercase, different file) also imports ioredis via the security service — same warning.
- **HMR overlay** is enabled (`vite.config.ts`) — runtime errors show as red overlay in browser, not silent white screen.
- **Slack webhook** was hardcoded in `.windsurf/workflows/autonomous-development.md` — redacted. Rotate the webhook at https://api.slack.com/apps if it was ever committed to git history.

## Connected Integrations (MCP)

Claude Code has live access to:
- **Linear** — create/manage issues, projects, labels, milestones
- **Slack** — send messages, search channels
- **Gmail** — read/draft emails
- **Google Calendar** — events, scheduling
- **HubSpot** — CRM objects
- **Otter** — meeting transcripts
- **Figma** — read design context, screenshots, assets (`https://mcp.figma.com/mcp`)
- **context7** — live library docs for React, Radix, TanStack Query, Nivo, Recharts
- **Supabase** — direct schema inspection, table browsing, query execution

### MCP Setup (run once after installing Claude CLI)
```bash
# context7 — live docs for all major libraries used in this project
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp

# Playwright — browser automation for e2e debugging and test writing
claude mcp add --scope user playwright -- npx -y @playwright/mcp

# Figma — design-to-code (requires OAuth after adding)
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp

# Supabase — schema inspection, table browsing, query execution
claude mcp add --scope user supabase -- npx -y @supabase/mcp-server
```

## Commands

```bash
# Core
npm run dev              # Start dev server (port 8080, increments if busy)
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit        # Type-check without building (fast error check)

# Testing
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:smoke       # Smoke tests (src/tests/smoke/)
npm run test:integration # Integration tests (src/tests/integration/)
npm run test:e2e         # Playwright e2e tests
npm run test:e2e:ui      # Playwright with UI
npm run test:coverage    # Coverage report

# Database
npm run db:migrate       # Run Supabase migrations
npm run db:reset         # Reset local Supabase database

# Deploy
npm run deploy:preview   # Vercel preview deployment
npm run deploy:prod      # Vercel production deployment
```

## Testing

**Unit tests** — `src/test/` (Vitest + jsdom):
- Config: `vitest.config.ts`, setup: `src/test/setup.ts`
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`

**Integration tests** — `src/tests/integration/` (Vitest):
- Test Supabase hooks, data flows, and cross-component behavior

**Smoke tests** — `src/tests/smoke/`:
- Quick sanity checks for critical paths

**E2E tests** — `src/tests/end-to-end/` (Playwright):
- Config: `playwright.config.ts`
- Browser-level user journey tests

**Supabase edge function tests** — `supabase/functions/_shared/*_test.ts`:
- Security and authorization tests for shared modules

**Contract tests** — `scripts/*-contract-tests.cjs`:
- Real API request/response shape verification (run BEFORE writing mocked unit tests)

**Test manifest** — `docs/test-manifest.json`:
- Maps every feature to test files across all 5 layers (contract, integration, smoke, unit, E2E)

## CI/CD

- `.github/workflows/supabase-deploy.yml` — deploys migrations + edge functions on push to `main`

## Slack Agent Bridge (remote approval & questions)

A bidirectional Slack integration posts to #claude-code and lets the user respond from their phone. The listener auto-starts via the `SessionStart` hook.

### Hooks (automatic — no action needed)
- **PreToolUse** on all Bash/Edit/Write/MCP tools → `notify-permission.js` checks if auto-approved, otherwise posts to Slack and blocks until Approve/Reject
- **PreToolUse** on `AskUserQuestion` → `intercept-question.js` mirrors the question to Slack (non-blocking — IDE prompt also shows)
- **PostToolUse** on `AskUserQuestion` → `resolve-question.js` marks the Slack message as resolved if answered in IDE
- **Stop** → posts session-complete notification
- **SessionStart** → auto-starts the Slack listener + ngrok tunnel

### Prefer Slack /ask for questions when working remotely
When the user is working remotely from their phone, `AskUserQuestion` blocks the IDE. **Prefer the Slack /ask flow** for questions during autonomous/remote sessions. Use `AskUserQuestion` normally when the user is actively at their computer.

```bash
node scripts/slack-agent/notify.js --event ask --context "Your question here"
node scripts/slack-agent/check-approval.js
```

`check-approval.js` blocks until the user replies in the Slack thread, then prints their response to stdout. Use their answer to continue working.

**When to use /ask:**
- Ambiguous requirements where multiple valid approaches exist
- Design/UX decisions the user should weigh in on
- Missing information that blocks progress (API keys, config values, etc.)
- Confirming destructive or high-impact changes beyond what hooks cover
- ANY time you would normally use `AskUserQuestion` — redirect to Slack instead

**When NOT to use /ask:**
- Straightforward implementation where conventions are clear
- Questions answerable from CLAUDE.md, code context, or existing patterns
- Minor style/naming choices — just pick something reasonable

## Session Hygiene (proactive warnings)

Warn the user proactively when you detect context bloat risk:
- User switches to a different topic or feature mid-conversation
- 3+ separate tasks have already completed in this session
- Large files (e.g. `types.ts`, full page components) have been read multiple times
- Session has already been compacted (summary injected at start)

**Warning format** (inline, one short paragraph):
> Session tip: We're switching topics — this session already has significant context loaded. For best results, consider starting a fresh session (`/clear`). Happy to continue here if you prefer.

Do not lecture. Offer to continue. Use the `session-hygiene` skill for full guidance.

## Skills (invoke with /skill-name)

- `/new-feature <description>` — scaffold a new feature following project conventions
- `/linear-sync` — scan for TODOs/FIXMEs and create Linear issues
- `/linear-sync <task list>` — create Linear issues from a list
- `/debug-build` — diagnose white screens, build errors, runtime crashes
- `/session-hygiene` — review session hygiene signals and advise on context management
- `/supabase-migration <description>` — scaffold and apply a new DB migration with RLS
- `/analytics-widget <description>` — scaffold a new chart widget (Recharts or Nivo)
- `/review-pr [number|url]` — review a PR: summarize changes, run security checks, post findings to Slack
- `/tdd` — project test strategy: test pyramid, what to test per component type, deployment gates

## Linear Issue Generation (required before starting work)

Whenever a plan is finalized and approved and work is about to begin, **always generate Linear issues first** using the `/linear-sync <task list>` skill. Each task in the implementation plan becomes a Linear issue. This ensures all work is tracked before the first line of code is written.

## Demo Data (required for new features)

A built-in "Longtale Demo" company (`DEMO_COMPANY_ID = 'demo-longtale'`) provides deterministic, client-side mock data for demoing the platform without a Supabase connection. When adding new features:

1. **Add demo fixtures** to `src/lib/demo/demo-data.ts` — realistic, deterministic data matching the feature's types
2. **Populate query cache** in `src/lib/demo/DemoDataProvider.tsx` — call `queryClient.setQueryData()` for every query key the feature uses
3. **Guard Supabase calls** — if a new hook is created, ensure it returns demo data when `isDemoCompany(selectedCompanyId)` is true (either via the provider's cache or an early return)

Key files:
- `src/lib/demo/demo-constants.ts` — `DEMO_COMPANY_ID`, `DEMO_COMPANY`, `isDemoCompany()`
- `src/lib/demo/demo-data.ts` — all mock fixtures (posts, accounts, feeds, stats, charts, etc.)
- `src/lib/demo/DemoDataProvider.tsx` — context + cache population, exports `useDemo()` hook

## Subagents

- `security-reviewer` — reviews auth/RLS/XSS issues; invoked automatically on security-adjacent changes
- `code-reviewer` — reviews code for Social Suite conventions, TanStack Query patterns, multi-tenancy, and TypeScript quality
- `performance-reviewer` — checks bundle size impact, unnecessary re-renders, missing lazy loading, and query efficiency
- `supabase-reviewer` — reviews migrations, RLS policies, edge functions, and database queries for correctness and security

