# Product Requirements Document: Auth & Onboarding Flow Fixes

## 🎯 **Overview**
Fix two critical bugs in the Social Suite authentication and onboarding flows: (1) the invite link drops query parameters during a React Router redirect, leaving invited users on a blank signup form with no context, and (2) the discovery flow dead-ends after email entry by showing a "check your email" message instead of signing the user in immediately.

## 👥 **Target Users**
- **Primary User**: New users arriving via invite link from an existing company member
- **Secondary Users**: Discovery flow users who entered their email after browsing the platform
- **User Personas**: SMB owners, local business operators, community organization staff being onboarded by a team admin or discovering the platform organically

## 🚀 **Business Objectives**
- [ ] Eliminate 100% of invite-link signup failures caused by query param stripping
- [ ] Remove the discovery flow dead-end — users who enter an email should land in the app immediately
- [ ] Reduce onboarding drop-off by removing the "check your email" friction step
- [ ] Ensure invited users bypass company setup (they already have one) and land directly in the onboarding wizard

---

## 📋 **Features & User Stories**

### **Feature 1: Fix Invite Link URL Routing**
**User Story**: As an invited user, I want to click the invite link and land on a signup form with my email pre-filled and the invite context preserved, so that I can set a password and join the company immediately.

**Acceptance Criteria**:
- [ ] Invite link URL points to `/auth/signup?invite=${token}&email=${email}` (not `/signup?...`)
- [ ] The `SignupForm` receives the `invite` and `email` query params and pre-fills/locks the email field
- [ ] After signup, invited users are redirected to `/app/onboarding/wizard` (not `/app/onboarding/setup`)
- [ ] Non-invited users still redirect to `/app/onboarding/setup` after signup
- [ ] The invite token is consumed and the user is associated with the correct company

**Priority**: High
**Estimated Effort**: Small

### **Feature 2: Instant Signup from Discovery Flow**
**User Story**: As a discovery user, I want to enter my email and be immediately signed into the app and taken to the onboarding wizard, so that I don't hit a dead-end waiting for a magic link email.

**Acceptance Criteria**:
- [ ] After entering email in the discovery drawer, the new `instant-signup` edge function is called (replaces `signInWithOtp`)
- [ ] The edge function creates (or fetches) the user via Supabase Admin API with `email_confirm: true`
- [ ] A session (`access_token`, `refresh_token`) is returned to the client
- [ ] Client calls `supabase.auth.setSession()` to log the user in
- [ ] `AuthContext` fires `SIGNED_IN` event → auto-claims `pendingCompanyId` from localStorage
- [ ] User is redirected to `/app/onboarding/wizard` automatically
- [ ] The "Check your email to continue" dead-end UI is completely removed
- [ ] A loading spinner with "Creating your account..." is shown during the process
- [ ] A "set your password" email is sent asynchronously so the user can log in with a password later

**Priority**: High
**Estimated Effort**: Medium

---

## 🛠️ **Implementation Spec**

### **Bug 1 Root Cause Analysis**
The invite link is currently built in `InviteUserDialog.tsx` as:
```
${appOrigin}/signup?invite=${token}&email=${email}
```
The `/signup` route in `App.tsx` is a redirect to `/auth/signup` via `<Navigate to="/auth/signup" replace />`. React Router's `replace` redirect **drops the query string**, so `?invite=token&email=...` is lost. The user lands on a blank signup form with no pre-filled email and no invite context.

The `SignupForm` component already reads `?invite` and `?email` query params and pre-fills/locks the email field — that logic is correct and does not need changes. The only issue is the params never arrive.

### **Fix 1 — Exact Changes**

**File 1: `src/components/company/InviteUserDialog.tsx` (line ~54)**
```typescript
// BEFORE:
const signupUrl = `${appOrigin}/signup?invite=${invitation.token}&email=${inviteeEmail}`;

// AFTER:
const signupUrl = `${appOrigin}/auth/signup?invite=${invitation.token}&email=${inviteeEmail}`;
```
This bypasses the React Router redirect entirely, hitting the correct route directly.

**File 2: `src/pages/Signup.tsx`**
Update post-signup redirect so invited users skip company setup (they already have a company):
```typescript
// BEFORE:
navigate('/app/onboarding/setup');

// AFTER:
navigate(inviteToken ? '/app/onboarding/wizard' : '/app');
```

**File 3: `src/components/auth/SignupForm.tsx`**
Post-signup redirect must also respect the invite token:
```typescript
// BEFORE (always goes to setup regardless of invite):
navigate('/app/onboarding/setup');

// AFTER:
navigate(inviteToken ? '/app/onboarding/wizard' : '/app/onboarding/setup');
```

---

### **Bug 2 Root Cause Analysis**
Current flow: user enters email in the discovery drawer → `signInWithOtp` is called → magic link sent → UI shows "Check your email to continue. You can close this and browse your results." → **user is stuck and confused**.

The problem is that `signInWithOtp` sends a magic link email and requires the user to leave the app, check their inbox, click the link, and come back. This is a dead end for users in a discovery flow who expected immediate access.

### **Approaches Evaluated and Rejected**

**Approach 1 — `supabase.auth.signUp()` with random password (client-side)**
Would create the account and sign them in immediately since Supabase returns a session on `signUp` when `autoconfirm` is enabled. **Rejected** because `autoconfirm` may not be on and enabling it globally applies to all signup paths, which is undesirable.

**Approach 2 — `signInWithOtp` + immediate `verifyOtp`**
Would bypass the email step. **Rejected** because we don't have the OTP token client-side — it's in the email.

**Approach 3 — `signUp` with random password + Edge Function using admin API (selected)**
The edge function uses the Supabase service role to create the user server-side with `email_confirm: true`, which bypasses email confirmation for this specific path only without changing global settings. This is the cleanest approach because:
- Account is created server-side with the service role (bypasses email confirmation)
- Returns a session token to the client
- Client calls `supabase.auth.setSession()` to log them in instantly
- No global config changes needed
- A "set your password" email sent separately lets them log in properly later

### **Existing Infrastructure Being Leveraged**
- `admin-set-password` edge function — already exists, pattern for service-role user management
- `send-auth-email` edge function — already exists, will be used to send "set your password" email after instant signup
- `create-discovery-company` — already creates an anonymous company record and stores `pendingCompanyId` in localStorage
- `AuthContext` `SIGNED_IN` handler — already auto-claims `pendingCompanyId` from localStorage when a user signs in. No changes needed here.

### **Fix 2 — Exact Changes**

**File 4 (NEW): `supabase/functions/instant-signup/index.ts`**

Edge function implementation:
```
Request:  POST { email: string }
Response: { access_token: string, refresh_token: string, user: User }
```

Internal logic:
1. Validate email format
2. Generate a cryptographically strong random password: `const randomPassword = crypto.randomUUID()`
3. Create user via admin API:
   ```typescript
   const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
     email,
     email_confirm: true,    // bypasses email verification
     password: randomPassword
   })
   ```
4. Handle edge case — if user already exists, fetch existing user or return appropriate error
5. Sign in with the newly created credentials:
   ```typescript
   const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
     email,
     password: randomPassword
   })
   ```
6. Trigger "set your password" email via existing `send-auth-email` function (async, non-blocking)
7. Return `{ access_token: sessionData.session.access_token, refresh_token: sessionData.session.refresh_token, user: sessionData.user }`

The random password is generated, used once server-side for the sign-in call, and **never returned to the client or stored in plaintext**.

**File 5: `src/components/onboarding/DiscoveryProgressModal.tsx`**

Changes:
- **Remove**: The `signInWithOtp` call entirely
- **Remove**: The `emailSent` state and its UI branch ("Check your email to continue")
- **Add**: New `accountCreating` state (boolean)
- **Add**: Call to the `instant-signup` edge function when user submits email
- **Add**: On success, call `supabase.auth.setSession({ access_token, refresh_token })`
- **Result**: `AuthContext` fires `SIGNED_IN` → auto-claims `pendingCompanyId` → navigates to `/app/onboarding/wizard`

The client-side flow becomes:
```
User enters email → clicks Continue →
  [accountCreating = true, spinner: "Creating your account..."] →
  POST /functions/v1/instant-signup { email } →
  Response: { access_token, refresh_token, user } →
  supabase.auth.setSession({ access_token, refresh_token }) →
  AuthContext SIGNED_IN event fires →
  pendingCompanyId auto-claimed from localStorage →
  navigate('/app/onboarding/wizard')
```

No dead end. No "check your email". They go straight in.

---

## 🔧 **Technical Requirements**

### **Frontend Requirements**
- [ ] `InviteUserDialog.tsx` (line ~54): Change invite URL from `/signup?...` to `/auth/signup?...`
- [ ] `Signup.tsx`: Add conditional redirect — `inviteToken ? '/app/onboarding/wizard' : '/app'`
- [ ] `SignupForm.tsx`: Add conditional post-signup redirect — `inviteToken ? '/app/onboarding/wizard' : '/app/onboarding/setup'`
- [ ] `DiscoveryProgressModal.tsx`: Remove `signInWithOtp` call and `emailSent` state + UI
- [ ] `DiscoveryProgressModal.tsx`: Add `accountCreating` state, spinner UI, and `instant-signup` edge function call
- [ ] `DiscoveryProgressModal.tsx`: On success, call `supabase.auth.setSession()` and let `AuthContext` handle navigation

### **Backend Requirements**
- [ ] New edge function: `supabase/functions/instant-signup/index.ts`
- [ ] Uses `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, password: randomPassword })`
- [ ] Then calls `supabaseAdmin.auth.signInWithPassword({ email, password: randomPassword })`
- [ ] Returns `{ access_token, refresh_token, user }` to client
- [ ] Calls `send-auth-email` to send "set your password" email asynchronously
- [ ] Handles existing user edge case (user already exists with that email)
- [ ] Requires `SUPABASE_SERVICE_ROLE_KEY` in environment variables

### **Performance Requirements**
- [ ] Instant signup flow (create user + sign in + set session) completes in under 3 seconds
- [ ] No perceptible delay between invite link click and landing on pre-filled signup form

## 🔐 **Security & Privacy**
- [ ] Random password generated via `crypto.randomUUID()` — cryptographically strong
- [ ] Random password is never returned to the client or stored in plaintext — used once server-side
- [ ] `instant-signup` edge function authenticates via Supabase service role key (server-side only)
- [ ] Rate-limit the `instant-signup` endpoint (e.g. max 5 signups per IP per minute)
- [ ] Validate email format server-side before user creation
- [ ] Invite tokens are single-use and expire after consumption

## 📊 **Success Metrics**
- **Primary KPI**: Invite link signup completion rate (target: >95%)
- **Secondary KPIs**: Discovery-to-onboarding conversion rate; time from email entry to wizard landing
- **Success Threshold**: Zero instances of users hitting the "check your email" dead-end; all invite links correctly preserve query params

## 🚫 **Out of Scope**
- Redesigning the full onboarding wizard UX
- Adding OAuth/social login providers
- Changing Supabase global auto-confirm settings (this is specifically why we use the admin API approach)
- Email verification enforcement for discovery users (deferred — they get a "set password" email instead)
- Admin dashboard for managing pending invites

## 🔗 **Dependencies**
- **Internal Dependencies**:
  - `AuthContext` — `SIGNED_IN` event handler that auto-claims `pendingCompanyId` from localStorage (no changes needed)
  - `send-auth-email` edge function — used to send "set your password" email after instant signup
  - `admin-set-password` edge function — pattern reference for service-role user management
  - `create-discovery-company` — creates anonymous company record + stores `pendingCompanyId` in localStorage
  - `SignupForm` — already reads `?invite` and `?email` query params and pre-fills/locks email (no changes needed to this logic)
- **External Dependencies**: Supabase Auth Admin API (service role), Supabase Edge Functions runtime
- **Technical Dependencies**: `SUPABASE_SERVICE_ROLE_KEY` available in edge function environment variables

## 📅 **Timeline & Milestones**
- **Phase 1**: Fix 1 — Invite link URL fix (3 files, small changes) — immediate
- **Phase 2**: Fix 2 — `instant-signup` edge function + `DiscoveryProgressModal` rewrite — 1-2 days
- **Launch**: Both fixes deployed and tested end-to-end

## 🧪 **Testing Requirements**
- [ ] **Invite flow happy path**: Click invite link → lands on `/auth/signup` with email pre-filled and locked → set password → lands in `/app/onboarding/wizard` for the correct company
- [ ] **Invite flow — expired token**: Expired or invalid invite token shows appropriate error
- [ ] **Invite flow — redirect logic**: Invited users go to `/app/onboarding/wizard`, non-invited users go to `/app/onboarding/setup`
- [ ] **Discovery flow happy path**: Enter email in discovery drawer → spinner shows "Creating your account..." → account created → session set → redirected to `/app/onboarding/wizard` with `pendingCompanyId` claimed
- [ ] **Discovery flow — existing user**: Email already registered → handled gracefully (fetch existing user or show login prompt)
- [ ] **Discovery flow — AuthContext chain**: Verify `SIGNED_IN` event fires → `pendingCompanyId` is claimed from localStorage → company association is correct
- [ ] **Password recovery**: Discovery user can later use "Forgot password" to set a real password
- [ ] **Edge function**: Returns valid session tokens; handles duplicate emails; respects rate limits
- [ ] **Edge function — security**: Random password is not present in response payload; service role key is not exposed

## 📚 **Documentation Requirements**
- [ ] Update internal onboarding flow diagram to reflect the new instant-signup path
- [ ] Document the `instant-signup` edge function API contract (request: `{ email }`, response: `{ access_token, refresh_token, user }`)
- [ ] Add inline code comments explaining the invite vs. discovery redirect logic in `Signup.tsx` and `SignupForm.tsx`

## 🎨 **Design & UX Requirements**
- **Design System**: Use existing spinner/loading components for the "Creating your account..." state
- **Accessibility**: Loading state must be announced to screen readers; form fields must maintain existing label associations
- **Mobile Considerations**: Discovery drawer and signup form must remain functional on mobile viewports (no changes needed if existing responsive behavior is intact)

## 📁 **Files to Change**
| # | File | Type | Change |
|---|------|------|--------|
| 1 | `src/components/company/InviteUserDialog.tsx` | Edit | `/signup?` → `/auth/signup?` (line ~54) |
| 2 | `src/pages/Signup.tsx` | Edit | Conditional redirect: `inviteToken ? '/app/onboarding/wizard' : '/app'` |
| 3 | `src/components/auth/SignupForm.tsx` | Edit | Conditional post-signup redirect respects invite token |
| 4 | `src/components/onboarding/DiscoveryProgressModal.tsx` | Edit | Remove `signInWithOtp` + `emailSent` UI; add `instant-signup` call + `accountCreating` spinner |
| 5 | `supabase/functions/instant-signup/index.ts` | **New** | Admin user creation + sign-in + session return |

## 💬 **Notes & Assumptions**
- Supabase `email_confirm: true` in the admin `createUser` call bypasses the need for email verification — this is why we chose the admin API approach over client-side `signUp` (which would require global `autoconfirm`)
- The `pendingCompanyId` localStorage mechanism already works correctly in `AuthContext` on `SIGNED_IN` — no changes needed there
- The existing `signInWithOtp` / magic link flow can be fully removed from the discovery path
- Users created via instant-signup will receive a "set your password" email so they can log in again later without needing another instant-signup
- The random password used during instant-signup is ephemeral — generated server-side, used once for `signInWithPassword`, never exposed to the client
- `SignupForm` already handles `?invite` and `?email` query params correctly — the only issue was that these params were being stripped by the React Router redirect

---
---

# Feature Addendum

---

## 📋 **Feature 3: Optimal Posting Time**

### 🎯 **Overview**
Analyse a company's historical `post_analytics_snapshots` to identify peak engagement windows per platform and surface recommendations or auto-schedule posts accordingly. This adds a data-driven "Smart Schedule" capability that replaces guesswork with engagement-based timing.

### **User Story**
As a company admin, I want the platform to analyse my past post performance and recommend (or automatically use) the best times to publish on each platform, so that my content gets maximum engagement without manual scheduling research.

### **Acceptance Criteria**
- [ ] A new SQL RPC `get_optimal_posting_windows` returns avg engagement bucketed by platform, day-of-week, and hour
- [ ] A new edge function `get-optimal-windows` calls the RPC and generates a Gemini-powered narrative summary of top 3 windows per platform
- [ ] Results are cached per company for 24h in `company_voice_settings` (JSONB `optimal_windows_cache` column + `cached_at` timestamp)
- [ ] An `OptimalPostingWidget` renders a heatmap (7 days × 24 hours) per platform on the Analytics page
- [ ] The `AutomationRuleWizard` gains a third `scheduling` option: `"optimal"` ("Smart Schedule — AI picks best time")
- [ ] When `scheduling = "optimal"`, `run-automation-article` calls `get-optimal-windows` to fetch the next peak slot and sets `post_drafts.scheduled_at` accordingly
- [ ] Falls back to `"immediate"` if insufficient history (< 10 posts)
- [ ] Data confidence states are displayed: `no_data`, `low_confidence`, `confident`, `high_confidence`

**Priority**: Medium
**Estimated Effort**: Large

---

### 🛠️ **Implementation Spec: Optimal Posting Time**

#### **Data Model**
No new tables required. Analysis is performed against the existing `post_analytics_snapshots` table using `published_at` (hour + day-of-week) grouped by `platform`.

**New SQL RPC: `get_optimal_posting_windows`**
```sql
-- Returns avg engagement_rate bucketed by platform, day_of_week (0–6), hour (0–23)
-- Requires >= N posts (configurable threshold, default 10) to surface a recommendation
SELECT
  platform,
  EXTRACT(DOW FROM published_at AT TIME ZONE company_tz) AS day_of_week,
  EXTRACT(HOUR FROM published_at AT TIME ZONE company_tz) AS hour,
  AVG(engagement_rate) AS avg_engagement,
  COUNT(*) AS post_count
FROM post_analytics_snapshots
WHERE company_id = _company_id
  AND published_at IS NOT NULL
GROUP BY platform, day_of_week, hour
ORDER BY platform, avg_engagement DESC
```

#### **Backend: Edge Function `get-optimal-windows`**

```
Request:  POST { company_id: string, platform?: string, timezone?: string }
Response: { platform: string, topWindows: [{ dayOfWeek: number, hour: number, avgEngagement: number, postCount: number }], narrative: string }[]
```

Internal logic:
1. Accept `company_id`, optional `platform` filter, optional `timezone` override
2. Call `get_optimal_posting_windows` RPC with the provided parameters
3. Pass results to Gemini to generate a plain-English narrative summary of the top 3 windows per platform
4. Return structured JSON: `{ platform, topWindows: [{ dayOfWeek, hour, avgEngagement, postCount }], narrative }`
5. Cache the response per company for 24h using an `optimal_windows_cache` column in `company_voice_settings` (JSONB + `cached_at` timestamp)
6. On subsequent calls within 24h, return cached result without re-querying

#### **Scheduling Integration**

**`automation_rules.scheduling` gains a new value: `"optimal"`**

When `scheduling = "optimal"`:
1. `rss-poll` triggers `run-automation-article` as normal (no change)
2. `run-automation-article` calls `get-optimal-windows` to fetch the next upcoming peak slot for the target platform(s)
3. Sets `post_drafts.scheduled_at` to that slot rather than publishing immediately
4. Falls back to `"immediate"` if no sufficient history exists (< 10 posts for that platform)

The key change is in `run-automation-article`: instead of immediately publishing or using a fixed schedule, it queries the optimal windows and picks the next future slot that falls within a top-3 window for the target platform.

#### **UI Components**

**`OptimalPostingWidget.tsx`** — Settings → Brand Voice or Analytics page
- Heatmap grid: 7 days × 24 hours per platform showing engagement intensity
- Powered by `useOptimalPostingWindows` hook
- Shows data confidence badge based on post count thresholds

**`OptimalWindowBadge.tsx`** — Inline chip displayed in `AutomationRuleWizard`
- Shows "Best time: Tue 10am" when `scheduling = optimal` is selected
- Displays current recommendation and data confidence level

**`PostingTimeHeatmap.tsx`** — Nivo heatmap component
- Powered by `get_post_analytics_by_publish_date` hour/day aggregation via new RPC
- Data shape: `{ x: hour, y: dayLabel, value: avgEngagement }[]`

**Automation Wizard Change:**
- `scheduling` field gains a third option: `"optimal"` — "Smart Schedule (AI picks best time)"
- When selected, show `OptimalWindowBadge` per platform with current recommendation and data confidence level
- If `no_data` state, show disabled option with tooltip: "Not enough data yet — publish more posts to unlock"

#### **React Hooks**
- `useOptimalPostingWindows(companyId, platform?)` — calls `get-optimal-windows` edge function, caches in React Query for 1h
- `usePostingHeatmapData(companyId, platform)` — calls new RPC, returns `{ x: hour, y: dayLabel, value: avgEngagement }[]` for Nivo heatmap

#### **Data Confidence States**

| State | Condition | UI Treatment |
|---|---|---|
| `no_data` | 0 posts with `published_at` | "Not enough data yet — publish more posts to unlock" |
| `low_confidence` | 1–9 posts | Show recommendation with ⚠️ badge |
| `confident` | 10–49 posts | Show recommendation, no warning |
| `high_confidence` | 50+ posts | Show recommendation with trend comparison |

#### **Files to Change / Create**

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `supabase/migrations/XXX_optimal_posting_windows.sql` | **New** | RPC `get_optimal_posting_windows` |
| 2 | `supabase/functions/get-optimal-windows/index.ts` | **New** | Edge function: RPC call + Gemini narrative + caching |
| 3 | `src/components/analytics/OptimalPostingWidget.tsx` | **New** | Heatmap grid per platform |
| 4 | `src/components/analytics/PostingTimeHeatmap.tsx` | **New** | Nivo heatmap component |
| 5 | `src/components/analytics/OptimalWindowBadge.tsx` | **New** | Inline chip for automation wizard |
| 6 | `src/hooks/useOptimalPostingWindows.ts` | **New** | React Query hook for edge function |
| 7 | `src/hooks/usePostingHeatmapData.ts` | **New** | React Query hook for heatmap RPC |
| 8 | `src/components/automation/AutomationRuleWizard.tsx` | Edit | Add `"optimal"` scheduling option + badge integration |
| 9 | `supabase/functions/run-automation-article/index.ts` | Edit | When `scheduling = "optimal"`, query optimal windows and set `scheduled_at` |
| 10 | DB migration for `company_voice_settings` | Edit | Add `optimal_windows_cache` JSONB column + `cached_at` timestamp |

#### **Implementation Phases**
1. **Phase 1 (MVP):** RPC + edge function + `OptimalPostingWidget` on Analytics page (read-only recommendations)
2. **Phase 2:** Integrate `scheduling = optimal` into `AutomationRuleWizard` + `run-automation-article`
3. **Phase 3:** Per-platform timezone awareness using company `website_url` → inferred timezone or user-set timezone in `company_voice_settings`

#### **Testing Requirements**
- [ ] RPC returns correct buckets for a company with 50+ posts across multiple platforms
- [ ] RPC returns empty results for a company with 0 posts (graceful `no_data` state)
- [ ] Edge function returns cached results within 24h window
- [ ] Edge function re-queries after cache expiry
- [ ] Gemini narrative is coherent and references the actual top windows
- [ ] `run-automation-article` with `scheduling = "optimal"` sets `scheduled_at` to a valid future time within a top-3 window
- [ ] `run-automation-article` falls back to `"immediate"` when < 10 posts exist for the platform
- [ ] Heatmap renders correctly with real data and displays correct confidence badge
- [ ] Automation wizard shows/hides `OptimalWindowBadge` based on scheduling selection

---
---

## 📋 **Feature 4: Media Company Hierarchy**

### 🎯 **Overview**
Allow a "Media Company" (parent) to manage multiple child companies, view aggregated roll-up analytics, and centrally administer brand settings — enabling agency and media group use cases. This introduces a parent-child company relationship with roll-up dashboards, member management, and cross-company analytics.

### **User Story**
As a media company administrator, I want to group multiple child companies under a single parent entity so that I can view aggregated analytics, manage all child companies from one dashboard, and control access for my team members across the portfolio.

### **Acceptance Criteria**
- [ ] New `media_companies`, `media_company_members`, and `media_company_children` tables with full RLS
- [ ] Media company owners/admins can add/remove child companies by slug lookup
- [ ] Roll-up analytics (impressions, views, engagement, followers) aggregated across all child companies
- [ ] Per-child-company stats available (company name, connection health, post count, engagement rate vs. average)
- [ ] Media company switcher in `TopBar` (only shown when user belongs to ≥1 media company)
- [ ] Dedicated routes: `/app/media/:slug`, `/app/media/:slug/analytics`, `/app/media/:slug/companies`, `/app/media/:slug/settings`
- [ ] Role-based access: `owner`, `admin`, `viewer` with appropriate permissions per action

**Priority**: Medium
**Estimated Effort**: Large

---

### 🛠️ **Implementation Spec: Media Company Hierarchy**

#### **Data Model Changes**

**New table: `media_companies`**
```sql
CREATE TABLE media_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_by  uuid NOT NULL,  -- references profiles.id
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

**New table: `media_company_members`**
```sql
CREATE TABLE media_company_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_company_id uuid NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  role             text NOT NULL DEFAULT 'viewer',  -- 'owner' | 'admin' | 'viewer'
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

**New table: `media_company_children`**
```sql
CREATE TABLE media_company_children (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_company_id uuid NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(media_company_id, company_id)
);
```

**RLS Policies:**
- `media_companies`: SELECT/UPDATE/DELETE for members; INSERT for authenticated users
- `media_company_members`: SELECT for own `user_id` or same `media_company` members
- `media_company_children`: SELECT for media_company members; INSERT/DELETE for media_company owners/admins
- Superadmin: full access to all three tables

#### **New SQL RPCs**

**`get_media_company_rollup_totals`**
```
-- Aggregates get_post_analytics_totals across all child company_ids
-- Input: _media_company_id, _start_date, _end_date, _platform?
-- Returns same shape as get_post_analytics_totals plus child_company_count
```
This RPC joins `media_company_children` to get the list of child `company_id`s, then aggregates `post_analytics_snapshots` across all of them. The response shape matches `get_post_analytics_totals` so existing chart components can consume it, plus an additional `child_company_count` field.

**`get_media_company_children_stats`**
```
-- Returns per-child-company summary row:
-- company_id, company_name, total_impressions, total_views, total_engagement,
-- follower_count, post_count, onboarding_status
```
Used by `ChildCompanyHealthGrid` to render per-company cards with comparative metrics.

#### **Backend: Edge Function Updates**
- **`analytics-sync`**: No change — still runs per company. Media rollup is computed on-read via the new RPCs (not materialized).
- **`admin-companies`**: Extended to optionally filter by `media_company_id` (adds a JOIN to `media_company_children` when the param is present).

#### **Routing & Navigation**

New routes (authenticated, requires `media_company_member`):
```
/app/media/:mediaCompanySlug                → MediaDashboard (roll-up overview)
/app/media/:mediaCompanySlug/analytics      → MediaAnalytics (aggregated charts)
/app/media/:mediaCompanySlug/companies      → ChildCompanyList (manage children)
/app/media/:mediaCompanySlug/settings       → MediaCompanySettings
```

Media company switcher added to `TopBar` alongside existing company switcher. Only shown when user belongs to ≥1 media company. Clicking a media company navigates to `/app/media/:slug`.

#### **UI Components**

**`MediaDashboard.tsx`** — Roll-up KPI cards (total reach, impressions, engagement, followers across all children) + `ChildCompanyHealthGrid`

**`ChildCompanyHealthGrid.tsx`** — Card grid per child company showing:
- Company name + logo
- Connection health (active / total social accounts)
- 7-day post count
- Engagement rate vs. media company average (delta chip: green if above, red if below)
- Quick-link to open that company in the standard app context (`/app` with company switched)

**`MediaAnalytics.tsx`** — Same chart set as `AnalyticsV2` but data sourced from `get_media_company_rollup_totals` and `get_media_company_children_stats`. Adds a "By Company" breakdown tab alongside the standard "By Platform" tab.

**`ChildCompanyList.tsx`** — Table of child companies with:
- Add child company (by slug lookup + confirmation)
- Remove child company (with confirmation dialog)
- Role management for media company members
- "Switch to company" shortcut button

**`MediaCompanySettings.tsx`** — Name, slug, member management (invite/remove members, change roles)

#### **AuthContext Changes**

- Add `mediaCompanies: MediaCompany[]` array to auth state (fetched on sign-in alongside existing company data)
- Add `selectedMediaCompanyId` to `SelectedCompanyContext` or a new `SelectedMediaCompanyContext`
- `useMediaCompany(mediaCompanyId)` hook for fetching a single media company + its children list
- `useMediaCompanyRollup(mediaCompanyId, dateRange, platform?)` hook for fetching aggregated analytics
- `useMediaCompanyChildrenStats(mediaCompanyId)` hook for per-child summary data

#### **Access Control Logic**

| Action | Required Role |
|---|---|
| View roll-up analytics | `viewer` or above in media company |
| Add/remove child companies | `admin` or `owner` |
| Manage media company members | `owner` only |
| Edit child company settings | Must also be a member of that child company |
| Create new media company | Any authenticated user |

These roles are enforced at both the RLS level (database) and the UI level (conditional rendering of action buttons).

#### **Files to Change / Create**

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `supabase/migrations/XXX_media_companies.sql` | **New** | Tables: `media_companies`, `media_company_members`, `media_company_children` + RLS policies |
| 2 | `supabase/migrations/XXX_media_company_rpcs.sql` | **New** | RPCs: `get_media_company_rollup_totals`, `get_media_company_children_stats` |
| 3 | `src/pages/MediaDashboard.tsx` | **New** | Roll-up KPI cards + child grid |
| 4 | `src/pages/MediaAnalytics.tsx` | **New** | Aggregated charts with "By Company" tab |
| 5 | `src/pages/ChildCompanyList.tsx` | **New** | Table with add/remove/switch actions |
| 6 | `src/pages/MediaCompanySettings.tsx` | **New** | Name, slug, member management |
| 7 | `src/components/media/ChildCompanyHealthGrid.tsx` | **New** | Per-company health cards |
| 8 | `src/hooks/useMediaCompany.ts` | **New** | Fetch single media company + children |
| 9 | `src/hooks/useMediaCompanyRollup.ts` | **New** | Fetch aggregated analytics |
| 10 | `src/hooks/useMediaCompanyChildrenStats.ts` | **New** | Fetch per-child stats |
| 11 | `src/contexts/AuthContext.tsx` | Edit | Add `mediaCompanies` to auth state |
| 12 | `src/contexts/SelectedCompanyContext.tsx` | Edit | Add `selectedMediaCompanyId` or create new context |
| 13 | `src/components/layout/TopBar.tsx` | Edit | Add media company switcher (conditional) |
| 14 | `src/App.tsx` | Edit | Add `/app/media/:slug/*` route group |
| 15 | `supabase/functions/admin-companies/index.ts` | Edit | Add optional `media_company_id` filter param |

#### **Implementation Phases**
1. **Phase 1 (Foundation):** DB tables + RLS + `media_company_children` management UI (`ChildCompanyList`) + basic roll-up KPI cards (`MediaDashboard`)
2. **Phase 2 (Analytics):** `get_media_company_rollup_totals` RPC + `MediaAnalytics` page with aggregated charts + "By Company" breakdown tab
3. **Phase 3 (Governance):** Role management, member invitations per media company, audit trail

#### **Testing Requirements**
- [ ] Create media company → add 3 child companies → roll-up totals match sum of individual company totals
- [ ] Remove a child company → roll-up totals update immediately (computed on-read)
- [ ] `viewer` role can see analytics but cannot add/remove children
- [ ] `admin` role can add/remove children but cannot manage members
- [ ] `owner` role has full access including member management
- [ ] User who is NOT a media company member gets 403 on all `/app/media/:slug` routes
- [ ] Media company switcher only appears for users with ≥1 media company membership
- [ ] `ChildCompanyHealthGrid` correctly shows delta chips (above/below average)
- [ ] RLS policies prevent cross-media-company data leakage
- [ ] "Switch to company" from child list correctly changes `SelectedCompanyContext` and navigates to `/app`
