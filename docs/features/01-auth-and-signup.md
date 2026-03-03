# Auth & Signup

## Flow

1. User signs up with email + password (or magic link via `instant-signup` edge function)
2. `handle_new_user()` trigger creates a `profiles` row automatically
3. Profile fields: `id`, `email`, `full_name` (from signup metadata)
4. Redirect to `/app/onboarding/setup` if no `company_memberships` row exists
5. Superadmin check via `superadmins` table (not hardcoded email)

## Key Tables

- `auth.users` — Supabase Auth managed
- `profiles` — public profile data, linked 1:1 to auth.users via trigger
- `superadmins` — email-based superadmin lookup

## Impersonation

Superadmins can generate a magic link for any user via admin UI.

## RLS

- Users can read/update their own profile (`auth.uid() = id`)
- Team members in shared companies can view each other's profiles
- Service role has full access
