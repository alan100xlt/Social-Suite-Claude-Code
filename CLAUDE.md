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
VITE_FIGMA_ACCESS_TOKEN   (optional — Figma theme import feature)
```

## Project Structure

```
src/
  pages/          # Route-level components (flat, one per route)
  components/
    ui/           # Shadcn primitives — do not modify directly
    layout/       # DashboardLayout, Sidebar, banners
    auth/         # ProtectedRoute, LoginForm
    dashboard/    # Widgets, charts, briefing
    posts/        # Compose, Calendar, Drafts tabs
    content/      # Automations, Feeds, RSS rules
    analytics/    # Charts, metric widgets, top posts
    analytics-v2/ # Nivo-based widget system
    settings/     # Profile, Company, BrandVoice tabs
    onboarding/   # DiscoveryBoard, wizard steps
    company/      # CompanySwitcher, InviteUser
    theme/        # ThemeToggle, ThemePreview, FigmaThemeImport
    landing/      # VersionSwitcher (landing page nav)
  contexts/       # AuthContext, SelectedCompanyContext, ThemeContext, PlatformContext, CourierContext
  hooks/          # React Query hooks wrapping Supabase calls
  services/       # Client-side service classes (Figma, security)
  integrations/
    supabase/     # Auto-generated client + types
  lib/            # posthog.ts, utils.ts, nivo-theme.ts
  utils/          # figmaThemeTranslator.ts
```

## Routing

All app routes are under `/app/*` (protected). Marketing/landing at `/`. Auth at `/auth/*`.

Key routes:
- `/` — LandingPage (V1, default)
- `/auth/login` `/auth/signup` `/auth/reset-password`
- `/app` — Dashboard (Index.tsx)
- `/app/content` — Posts, Calendar, Drafts, Automations, Feeds tabs
- `/app/analytics` — Recharts analytics
- `/app/analytics-v2` — Nivo analytics
- `/app/connections` — OAuth platform connections
- `/app/settings` — Profile, Company, BrandVoice, Notifications
- `/app/theme` — Theme settings (ThemeToggle + ThemePreview)
- `/app/admin/*` — Admin tools (api-logs, mapping, email-branding, cron-health)
- `/app/admin/companies` — Superadmin company management
- `/app/media-company/:id` — Media company dashboard

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

## Known Issues / Watch Out For

- **No lazy loading** — all pages bundled eagerly. Large bundle (~2.6MB). Add `React.lazy()` for admin/analytics routes.
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

### MCP Setup (run once after installing Claude CLI)
```bash
# context7 — live docs for all major libraries used in this project
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp

# Playwright — browser automation for e2e debugging and test writing
claude mcp add --scope user playwright -- npx -y @playwright/mcp

# Figma — design-to-code (requires OAuth after adding)
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```

## Commands

```bash
npm run dev          # Start dev server (tries 8080, increments if busy)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
npx tsc --noEmit    # Type-check without building (fast error check)
```

## Slack Agent Bridge (remote approval & questions)

A bidirectional Slack integration posts to #claude-code and lets the user respond from their phone. The listener auto-starts via the `SessionStart` hook.

### Hooks (automatic — no action needed)
- **PreToolUse** on all Bash/Edit/Write/MCP tools → `notify-permission.js` checks if auto-approved, otherwise posts to Slack and blocks until Approve/Reject
- **Stop** → posts session-complete notification
- **SessionStart** → auto-starts the Slack listener + ngrok tunnel

### NEVER use `AskUserQuestion` — use Slack /ask instead
The user works remotely from their phone. `AskUserQuestion` blocks the IDE and the user can't respond unless at their computer. **Always use the Slack /ask flow for ANY question you would ask the user.**

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

## Linear Issue Generation (required before starting work)

Whenever a plan is finalized and approved and work is about to begin, **always generate Linear issues first** using the `/linear-sync <task list>` skill. Each task in the implementation plan becomes a Linear issue. This ensures all work is tracked before the first line of code is written.

## Subagents

- `security-reviewer` — reviews auth/RLS/XSS issues; invoked automatically on security-adjacent changes

## Recent Fixes (this session)

1. `ThemeContext.tsx:204` — mismatched quote in `vibrant` theme `fontFamily` string
2. `src/index.css` — moved `@import` Google Fonts above `@tailwind` directives
3. `figmaService.ts:196` — replaced `process.env.REACT_APP_FIGMA_ACCESS_TOKEN` with `import.meta.env.VITE_FIGMA_ACCESS_TOKEN`
4. Deleted `src/services/ErrorMonitor.ts` — dead Node.js-only code, never used
