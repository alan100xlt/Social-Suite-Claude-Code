# Multi-tenancy & RBAC

## Core Model

- `company_memberships` table: `user_id` ↔ `company_id` with `role` (owner/admin/member)
- `user_is_member(uuid, uuid)` function: checks both direct membership AND media company hierarchy
- All RLS policies follow the pattern: `user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'`

## Media Company Hierarchy

- `media_companies` — parent entity that owns child companies
- `media_company_members` — user ↔ media_company with role + `is_active`
- `media_company_children` — media_company ↔ company (`parent_company_id`, `child_company_id`)

### Access Resolution

Access flows through two paths:
1. **Direct membership:** `company_memberships` row exists
2. **Media company:** user is active member of media company → media company has child → child company accessible

This is implemented as a `UNION ALL` in `user_is_member()`.

## `user_belongs_to_company()`

Legacy function used by analytics RPCs. Now delegates to `user_is_member()` (fixed in platform restoration — previously checked `profiles.company_id` which was always NULL).

## Session Approach (Removed)

The session-variable approach (`set_session_context()`, `session_accessible_companies()`, etc.) was removed in the platform restoration. It required every client to call `set_session_context()` before queries, which the frontend never did.
