# Architecture Overview

## Overview

Social Suite is a multi-tenant social media management platform built for media companies. It handles content scheduling, cross-platform analytics, an AI-powered unified inbox, and company hierarchy management. The system runs as a React SPA backed by Supabase (Postgres + Auth + Edge Functions + Realtime), deployed to Vercel.

## System Architecture

```
                            Vercel CDN
                               |
                        React SPA (Vite)
                     /        |         \
                    /         |          \
           Supabase Auth   Supabase DB    Edge Functions (Deno)
               |           (Postgres)         |
               |              |               |
               |         RLS + RPCs      GetLate API
               |              |          (social aggregator)
               |              |               |
               |         pg_cron ------> cron-dispatcher
               |              |          (fan-out per company)
               |              |               |
               |              |          +----+----+----+
               |              |          |    |    |    |
               |              |       inbox analytics rss  ...
               |              |       sync   sync   poll
               |              |
               |         Vault (secrets)
               |
           PostHog (analytics)
           Courier (notifications)
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18, TypeScript, Vite 5 | SPA, deployed to Vercel |
| Routing | React Router v6 | All app routes under `/app/*` (protected) |
| State | TanStack Query v5 | Server state; React Context for auth/company/theme |
| UI | Tailwind CSS v3, Shadcn/ui (Radix) | Lucide icons |
| Charts | Recharts (primary), Nivo (secondary) | Nivo for premium analytics widgets |
| Tables | AG Grid Community Edition | Shadcn `<Table>` only for tiny static displays |
| Backend | Supabase | Postgres + Auth + Edge Functions + Realtime |
| Social API | GetLate | Aggregation layer for all social platforms |
| AI | Google Gemini | Used in inbox-ai edge function |
| Observability | PostHog | Page views, feature flags |
| Notifications | Courier | In-app + push notifications |

## Deployment Model

- **Frontend**: Vercel (static build from `vite build`)
- **Backend**: Supabase (hosted Postgres + Deno edge functions)
- **CI/CD**: `.github/workflows/supabase-deploy.yml` deploys migrations + edge functions on push to `main`
- **Secrets**: Production secrets in Supabase Secrets (`supabase secrets set`); local dev uses `.env.local`

## Key Architectural Decisions

1. **Multi-tenancy via RLS**: Every table has `company_id`. All RLS policies use `user_is_member(auth.uid(), company_id)`. No row is accessible without company membership.

2. **Fan-out cron dispatcher**: Instead of one edge function processing all companies sequentially, `cron-dispatcher` queries companies and fires one HTTP request per company. This scales to thousands of companies without timeouts.

3. **Dual ingestion for inbox**: Messages arrive via both polling (`inbox-sync` cron) and real-time webhooks (`getlate-webhook`). Both paths use the same `_shared/inbox-processing.ts` module for identical dedup logic.

4. **Lazy loading for heavy routes**: Analytics, admin, and showcase routes use `React.lazy()`. Core routes (dashboard, inbox, content) are eagerly imported.

5. **Demo data system**: A built-in "Longtale Demo" company provides deterministic client-side mock data via `DemoDataProvider`, enabling demos without a Supabase connection.

6. **Edge functions use service role**: Cron-triggered functions authenticate with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). User-triggered functions validate JWT via `authorize.ts`.

## Provider Nesting (App.tsx)

The provider hierarchy in `src/App.tsx` matters. Outer providers are available to inner ones:

```
QueryClientProvider
  PlatformProvider
    AuthProvider
      SelectedCompanyProvider
        DemoDataProvider
          CourierTokenProvider
            ThemeProvider
              TooltipProvider
                BrowserRouter
                  Routes
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route definitions, provider hierarchy |
| `src/contexts/AuthContext.tsx` | Auth state, superadmin check, impersonation |
| `src/contexts/SelectedCompanyContext.tsx` | Active company (localStorage-persisted) |
| `supabase/functions/_shared/authorize.ts` | RBAC authorization for all edge functions |
| `supabase/functions/cron-dispatcher/index.ts` | Fan-out cron dispatch |
| `supabase/functions/_shared/cron-monitor.ts` | Health tracking for cron jobs |
| `src/integrations/supabase/types.ts` | Auto-generated DB types (do not edit) |

## Related Architecture Docs

- [Auth and Multi-tenancy](./auth-and-multitenancy.md) -- Authentication, RBAC, company isolation
- [Inbox Pipeline](./inbox-pipeline.md) -- Dual ingestion, AI classification, auto-respond
- [Analytics Pipeline](./analytics-pipeline.md) -- Snapshot sync, metric calculation, charting
- [Cron and Webhooks](./cron-and-webhooks.md) -- pg_cron, dispatcher pattern, webhook verification
