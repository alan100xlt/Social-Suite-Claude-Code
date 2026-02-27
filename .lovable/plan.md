
## Understanding the two bugs

### Bug 1 — Invited user flow
The invite link is built in `InviteUserDialog.tsx` as:
```
${appOrigin}/signup?invite=${token}&email=${email}
```
`/signup` in `App.tsx` is a redirect to `/auth/signup` via `<Navigate to="/auth/signup" replace />`. React Router's `replace` redirect **drops the query string**, so `?invite=token&email=...` is lost. The user lands on a blank signup form with no pre-filled email and no invite context.

**Expected behaviour:** User clicks invite link → lands on `/auth/signup` with email pre-filled and locked, password field visible, invite context shown → they set a password → land in the onboarding wizard for the company they were invited to.

**Fix:** Change the URL built in `InviteUserDialog.tsx` from `/signup?...` to `/auth/signup?...` so it hits the correct route directly without any redirect stripping params. The `SignupForm` already reads `?invite` and `?email` params and pre-fills/locks the email field — this part is already correct. No other changes needed.

---

### Bug 2 — Discovery flow dead end after email
Currently: user enters email → magic link sent → UI shows "Check your email to continue. You can close this and browse your results." → user is stuck and confused.

**Expected new behaviour:** After the user enters their email in the discovery drawer, instead of sending a magic link and waiting, the system should:
1. Create an account for them immediately using `signUp` (email + a temp auto-generated password, or using Supabase's `signInWithOtp` but immediately dropping them into the app without waiting for email verification).
2. Drop them directly into `/app/onboarding/wizard`.

The cleanest approach that avoids email verification friction: use `supabase.auth.signUp()` with the email and a strong random password. This creates the account and signs them in immediately (Supabase returns a session on signUp even before email confirmation when `autoconfirm` is on, or we can configure it). However, auto-confirm may not be on.

**Better approach**: Use `supabase.auth.signInWithOtp` but ALSO immediately call `supabase.auth.verifyOtp` — but we don't have the OTP token client-side.

**Cleanest approach**: Use `signUp` with a random password + disable email confirmation requirement for this specific path by using an Edge Function that creates the user via the admin API (service role) and immediately logs them in. This way:
- Account is created server-side with the service role (bypasses email confirmation)
- Returns a session token
- Client calls `supabase.auth.setSession()` to log them in
- Redirect to `/app/onboarding/wizard`
- The magic link email that was already sent (or we send a "set your password" email later) lets them set a proper password on next login

Actually, looking at existing infrastructure: there's already `admin-set-password` edge function and `send-auth-email` edge function. We also have `create-discovery-company` which already creates an anonymous company record. 

The approach:
1. Create a new edge function `create-discovery-user` that uses the Supabase admin API to create the user (bypassing email confirmation) and returns a session
2. Client calls `supabase.auth.setSession()` with the returned tokens
3. The `pendingCompanyId` in localStorage will then be auto-claimed by `AuthContext` on `SIGNED_IN`
4. User is navigated to `/app/onboarding/wizard`

OR simpler — we can use the existing `signUp` flow but configure Supabase to auto-confirm new users. But that applies globally which may not be desired.

**The simplest safe approach**: Create a lightweight edge function `instant-signup` that:
- Uses `supabase.admin.createUser({ email, email_confirm: true, password: randomPassword })` 
- Then calls `supabase.auth.signInWithPassword({ email, password: randomPassword })`
- Returns `{ access_token, refresh_token }`
- Client does `supabase.auth.setSession(...)` and redirects to `/app/onboarding/wizard`

We also send a "set your password" email via `send-auth-email` after creation so they can later log in properly.

---

## Plan

### Fix 1 — Invite link URL (1 file, 1 line change)
**File:** `src/components/company/InviteUserDialog.tsx` line 54

Change:
```typescript
const signupUrl = `${appOrigin}/signup?invite=${invitation.token}&email=${inviteeEmail}`;
```
To:
```typescript
const signupUrl = `${appOrigin}/auth/signup?invite=${invitation.token}&email=${inviteeEmail}`;
```

Also update `Signup.tsx` to redirect invited users to `/app/onboarding/wizard` instead of `/app/onboarding/setup`, since invited users already have a company and don't need SetupCompany:
```typescript
navigate(inviteToken ? '/app/onboarding/wizard' : '/app');
```
And in `SignupForm.tsx`, the post-signup redirect should also be:
```typescript
navigate(inviteToken ? '/app/onboarding/wizard' : '/app/onboarding/setup');
```
(Currently it always navigates to `/app/onboarding/setup` regardless of invite token.)

---

### Fix 2 — Instant signup from discovery drawer
**New edge function:** `supabase/functions/instant-signup/index.ts`

Uses the Supabase Admin API to:
1. Create or fetch the user by email (`createUser` with `email_confirm: true`)
2. Generate a session by signing in with a one-time random password (set at creation)
3. Return `{ access_token, refresh_token, user }`

**Updated** `DiscoveryProgressModal.tsx`:
- Replace the `signInWithOtp` call with a call to the new `instant-signup` edge function
- On success: call `supabase.auth.setSession({ access_token, refresh_token })`
- The `AuthContext` `SIGNED_IN` event fires → auto-claims `pendingCompanyId` → redirects to `/app/onboarding/wizard`
- Remove the "Check your email" dead-end state entirely
- Show a loading spinner while the account is being created, then automatically navigate

The `emailSent` state and its UI branch can be removed. Replace with `accountCreating` state.

**UI flow after change:**
```
User enters email → clicks Continue →
  [spinner: "Creating your account..."] →
  Account created, session set →
  AuthContext fires SIGNED_IN →
  pendingCompanyId auto-claimed →
  Redirect to /app/onboarding/wizard
```

No dead end. No "check your email". They go straight in.

The magic link / password reset email can be sent separately (or they can use "Forgot password" to set one later).

---

### Files to change:
1. `src/components/company/InviteUserDialog.tsx` — `/signup?` → `/auth/signup?`
2. `src/pages/Signup.tsx` — redirect invite users to `/app/onboarding/wizard`
3. `src/components/auth/SignupForm.tsx` — post-signup redirect respects invite token
4. `src/components/onboarding/DiscoveryProgressModal.tsx` — replace magic link with instant-signup call + auto-redirect
5. `supabase/functions/instant-signup/index.ts` — new edge function (admin user creation + session)
