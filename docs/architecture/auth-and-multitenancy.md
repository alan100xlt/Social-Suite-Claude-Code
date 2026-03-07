# Auth and Multi-tenancy

## Overview

Social Suite uses Supabase Auth for authentication and a company membership model for multi-tenancy. Every data table is scoped by `company_id` and protected by Row Level Security (RLS). Users can belong to multiple companies; media companies add a hierarchical layer where a parent organization owns child companies.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| AuthProvider | `src/contexts/AuthContext.tsx` | Wraps Supabase Auth; exposes `user`, `session`, `isSuperAdmin`, sign-in/up/out, impersonation |
| SelectedCompanyProvider | `src/contexts/SelectedCompanyContext.tsx` | Persists active company ID to localStorage; syncs across tabs |
| ProtectedRoute | `src/components/auth/ProtectedRoute.tsx` | Gate component: redirects to login, onboarding setup, or onboarding wizard as needed |
| SuperAdminRoute | `src/components/auth/SuperAdminRoute.tsx` | Wraps admin routes; requires `isSuperAdmin` from AuthContext |
| authorize.ts | `supabase/functions/_shared/authorize.ts` | Central RBAC for all edge functions: JWT validation, superadmin check, company membership, role check, permission check |
| user_is_member() | DB function (migrations) | Checks company membership via direct membership OR media company hierarchy |
| is_superadmin() | DB function (via `superadmins` table) | Returns true if current user's email is in the `superadmins` table |

## Auth Flow

```
1. User signs up (email+password or magic link)
        |
2. handle_new_user() trigger creates `profiles` row
        |
3. Supabase Auth issues JWT, onAuthStateChange fires
        |
4. AuthProvider sets user/session state
        |
5. checkSuperAdmin() calls supabase.rpc('is_superadmin')
        |
6. ProtectedRoute evaluates:
   - No user? --> /auth/login
   - No membership & not superadmin? --> /app/onboarding/setup
   - Company onboarding_status = 'in_progress'? --> /app/onboarding/wizard
   - Otherwise --> render children
```

## Session Management

- **Client**: Supabase JS client handles token refresh automatically via `onAuthStateChange`
- **Superadmin check**: Runs via `setTimeout(0)` to avoid deadlocking Supabase's auth listener callback (the listener blocks further Supabase calls when awaited)
- **PostHog identify**: Called on auth state change to link analytics to user
- **Cross-tab sync**: `SelectedCompanyContext` listens for `storage` events to sync company selection across tabs

## Company Isolation (RLS)

Every data table includes a `company_id` column. The standard RLS pattern is:

```sql
CREATE POLICY "Company members can access"
  ON some_table FOR ALL
  USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );
```

### user_is_member(user_id, company_id)

This function checks two access paths via `UNION ALL`:

1. **Direct membership**: Row exists in `company_memberships` with matching `user_id` and `company_id`
2. **Media company hierarchy**: User is an active member of a `media_companies` entity that has the target company as a child (via `media_company_children`)

### Frontend enforcement

Every Supabase query in `src/hooks/` includes `.eq('company_id', companyId)`. The `companyId` comes from `useSelectedCompany()`. This is belt-and-suspenders: RLS enforces it server-side, but the filter ensures correct data even if the user has access to multiple companies.

## Role Hierarchy

Roles are stored in `company_memberships.role`:

| Role | Typical Permissions |
|------|-------------------|
| `owner` | Full access, billing, can delete company |
| `admin` | Manage members, settings, all content |
| `manager` | Manage content, approve posts |
| `collaborator` | Create content, limited settings |
| `community_manager` | Inbox access, reply to messages |
| `member` | Read-only access |

### Edge function RBAC (authorize.ts)

Edge functions use `authorize(req, options)` which:

1. Extracts JWT from `Authorization: Bearer <token>` header
2. Validates token via `supabase.auth.getUser()`
3. Checks `is_superadmin()` -- superadmins bypass all company/role checks
4. If `options.companyId` is set, verifies `company_memberships` row exists
5. If `options.requiredRoles` is set, checks the membership role is in the list
6. If `options.requiredPermission` is set, calls `user_has_permission()` DB function
7. If `options.allowServiceRole` is set, accepts `SUPABASE_SERVICE_ROLE_KEY` as bearer token (for cron jobs)

On failure, `authorize()` throws a `Response` object (401 or 403). Callers catch it and return it directly.

## Superadmin System

- **Table**: `superadmins` (email-based lookup, no hardcoded emails in code)
- **Check**: `is_superadmin()` DB function, cached in AuthContext as `isSuperAdmin`
- **Powers**: Bypass all RLS, access all companies, impersonate users, access admin routes
- **Admin routes**: Wrapped in `<SuperAdminRoute>` which checks `isSuperAdmin` from context

## Impersonation

Superadmins can impersonate any user:

1. Current session tokens saved to `localStorage` under `impersonation_original_session`
2. Edge function `impersonate-user` generates a magic link token hash
3. `supabase.auth.verifyOtp()` establishes a session as the target user
4. `isSuperAdmin` is set to `false` during impersonation (hides admin UI)
5. `stopImpersonating()` restores original tokens via `supabase.auth.setSession()`

## Media Company Hierarchy

```
media_companies (parent entity)
  |
  +-- media_company_members (user <-> media_company, with role + is_active)
  |
  +-- media_company_children (media_company <-> company)
        |
        +-- companies (child entities, each with their own data)
```

A user who is an active member of a media company can access all child companies without needing direct `company_memberships` rows. This is resolved in `user_is_member()`.

## Gotchas

- **Never call Supabase inside `onAuthStateChange` synchronously**: The listener blocks further Supabase calls. Use `setTimeout(0)` to schedule async work outside the callback. See `AuthContext.tsx` line 77.
- **`user_belongs_to_company()` is legacy**: It exists for analytics RPCs but just delegates to `user_is_member()`. Don't use it in new code.
- **Session variables were removed**: The old `set_session_context()` / `session_accessible_companies()` pattern was abandoned because the frontend never called the setup function.
- **Impersonation hides superadmin status**: If `localStorage` has `impersonation_original_session`, `checkSuperAdmin()` returns false. This prevents impersonated sessions from accidentally having admin access.
- **Company selection persists across sessions**: `selectedCompanyId` is in localStorage. If a user loses access to a company, stale selection can cause empty data until they switch.
