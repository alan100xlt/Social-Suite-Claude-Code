---
name: new-feature
description: Scaffold a new feature for the Social Suite platform following project conventions
tools: Read, Edit, Write, Bash, Glob, Grep
user-invocable: true
---

Scaffold a new feature: $ARGUMENTS

Follow these conventions:
- Page components go in `src/pages/` and must be added to `src/App.tsx` routes
- Feature components go in `src/components/<feature-name>/`
- Data fetching uses TanStack Query hooks in `src/hooks/`
- All Supabase calls go through `src/integrations/supabase/client.ts`
- Use Shadcn UI components from `src/components/ui/` — do not build primitives from scratch
- Protected routes wrap with `<ProtectedRoute>` in App.tsx
- Multi-tenant queries must include `company_id` filter for RLS
- Use `import.meta.env.VITE_*` for env vars — never `process.env`
- No Node.js-only imports (ioredis, child_process, fs) in src/ files

Steps:
1. Read CLAUDE.md for full context
2. Check existing similar features for patterns to follow
3. Create the hook(s) first, then the component(s), then wire into routing
4. Run `npx tsc --noEmit` to verify no type errors before finishing
