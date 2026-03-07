# RPC Functions Reference

All Postgres RPC functions callable via `supabase.rpc('function_name', { args })`. Grouped by domain.

**Type source:** The `Functions` section of `src/integrations/supabase/types.ts`.

---

## Analytics

### `get_post_analytics_by_publish_date`

Returns daily aggregated post analytics grouped by publish date. **This is the correct function for date-range analytics** (uses `published_at`, not `snapshot_date`).

```typescript
const { data } = await supabase.rpc('get_post_analytics_by_publish_date', {
  _company_id: companyId,
  _start_date: '2026-01-01',
  _end_date: '2026-03-01',
  _platform: 'twitter'  // optional
});
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `_company_id` | string | Yes | Company UUID |
| `_start_date` | string | Yes | ISO date (YYYY-MM-DD) |
| `_end_date` | string | Yes | ISO date |
| `_platform` | string | No | Filter to one platform |

**Returns:** `Array<{ publish_date, post_count, impressions, views, likes, comments, shares, clicks, reach, avg_engagement_rate }>`

**Used by:**
- `src/hooks/useAnalyticsByPublishDate.ts`
- `src/pages/Index.tsx` (dashboard)
- `src/components/dashboard/EngagementChart.tsx`

---

### `get_post_analytics_totals`

Returns aggregate totals for a date range. Used for KPI cards and period-over-period comparisons.

```typescript
const { data } = await supabase.rpc('get_post_analytics_totals', {
  _company_id: companyId,
  _start_date: '2026-01-01',
  _end_date: '2026-03-01',
  _platform: 'linkedin'  // optional
});
```

**Parameters:** Same as `get_post_analytics_by_publish_date`.

**Returns:** `Array<{ total_posts, total_impressions, total_views, total_likes, total_comments, total_shares, total_clicks, total_reach, avg_engagement_rate }>` (always a single-element array)

**Used by:**
- `src/hooks/useDashboardStats.ts`
- `src/hooks/useDashboardTrends.ts` (calls twice for current vs. previous period)

---

### `get_post_analytics_by_date`

Returns daily aggregated analytics using `snapshot_date`. Primarily for internal use -- prefer `get_post_analytics_by_publish_date` for user-facing charts.

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_company_id` | string | Yes |
| `_start_date` | string | Yes |
| `_end_date` | string | Yes |
| `_platform` | string | No |

**Returns:** `Array<{ snapshot_date, post_count, impressions, views, likes, comments, shares, clicks, reach, avg_engagement_rate }>`

---

### `get_post_analytics_by_date_platform`

Returns daily analytics broken down by platform.

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_company_id` | string | Yes |
| `_start_date` | string | Yes |
| `_end_date` | string | Yes |

**Returns:** `Array<{ snapshot_date, platform, impressions, views, clicks }>`

---

### `get_post_analytics_by_platform`

Returns aggregate totals grouped by platform.

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_company_id` | string | Yes |
| `_start_date` | string | Yes |
| `_end_date` | string | Yes |

**Returns:** `Array<{ platform, total_posts, total_impressions, total_views, total_engagement }>`

**Used by:**
- `src/components/dashboard/EngagementChart.tsx`

---

### `get_followers_by_date_platform`

Returns follower counts by date and platform from `account_analytics_snapshots`.

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_company_id` | string | Yes |
| `_start_date` | string | Yes |
| `_end_date` | string | Yes |

**Returns:** `Array<{ snapshot_date, platform, followers }>`

---

### `get_optimal_posting_windows`

Analyzes historical post performance to find the best times to publish.

```typescript
const { data } = await supabase.rpc('get_optimal_posting_windows', {
  _company_id: companyId,
  _platform: 'twitter',   // optional
  _timezone: 'America/New_York'  // optional
});
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `_company_id` | string | Yes | |
| `_platform` | string | No | Filter to one platform |
| `_timezone` | string | No | Timezone for hour conversion |

**Returns:** `Array<{ day_of_week, hour, platform, avg_engagement, post_count, confidence_level }>`

`confidence_level`: `"low"`, `"medium"`, `"high"` based on `post_count`.

**Used by:**
- `src/hooks/useBestTimeToPost.ts`
- `src/hooks/useOptimalPostingWindows.ts`

---

### `get_posting_frequency_analysis`

Analyzes the relationship between posting frequency and engagement.

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_company_id` | string | Yes |
| `_platform` | string | No |

**Returns:** `Array<{ platform, posts_per_week, average_engagement_rate }>`

---

## Media Companies

### `get_media_company_hierarchy`

Returns the full company tree under a media company with optional analytics.

```typescript
const { data } = await supabase.rpc('get_media_company_hierarchy', {
  _media_company_id: mediaCompanyId,
  _include_analytics: true,
  _period_days: 30
});
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `_media_company_id` | string | Yes | |
| `_include_analytics` | boolean | No | Include engagement/follower data (default: false) |
| `_period_days` | number | No | Analytics lookback period (default: 30) |

**Returns:** `Array<{ company_id, company_name, relationship_type, total_followers, total_posts, total_engagement, platform_breakdown }>`

`platform_breakdown` is a JSON object keyed by platform with per-platform metrics.

**Used by:**
- `src/hooks/useMediaCompanyHierarchy.ts`

---

### `get_media_companies`

Returns media company IDs accessible to a user.

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

### `has_media_company_permission`

Checks if a user has the required role in a media company.

```typescript
const { data } = await supabase.rpc('has_media_company_permission', {
  _user_id: userId,
  _media_company_id: mediaCompanyId,
  _required_role: 'admin'  // optional
});
```

**Returns:** `boolean`

**Used by:**
- `src/hooks/useMediaCompanyHierarchy.ts`

---

### `is_media_company_admin`

Checks if a user is an admin of a specific media company.

**Parameters:** `{ _user_id: string, _media_company_id: string }`

**Returns:** `boolean`

---

### `user_is_media_company_admin`

Returns all media company IDs where the user is an admin.

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

### `user_media_company_ids`

Returns all media company IDs the user belongs to.

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

## Authorization & RBAC

### `is_superadmin`

Checks if the current authenticated user is a superadmin.

```typescript
const { data } = await supabase.rpc('is_superadmin');
```

**Parameters:** None.

**Returns:** `boolean`

**Used by:**
- `src/contexts/AuthContext.tsx` (on login)
- `supabase/functions/_shared/authorize.ts` (every edge function)
- RLS policies (many tables allow superadmin bypass)

---

### `user_is_member`

Checks if a user is a member of a specific company.

**Parameters:** `{ _user_id: string, _company_id: string }`

**Returns:** `boolean`

---

### `user_belongs_to_company`

Same as `user_is_member` -- checks company membership.

**Parameters:** `{ _user_id: string, _company_id: string }`

**Returns:** `boolean`

---

### `has_role`

Checks if a user has a specific role in any company.

**Parameters:** `{ _user_id: string, _role: app_role }`

**Returns:** `boolean`

---

### `user_has_company_role`

Checks if a user has one of the specified roles in a specific company.

**Parameters:** `{ _user_id: string, _company_id: string, _roles: app_role[] }`

**Returns:** `boolean`

---

### `user_has_permission`

Checks if a user has a specific named permission in a company. Checks both role defaults and user-level overrides.

**Parameters:** `{ _user_id: string, _company_id: string, _permission: string }`

**Returns:** `boolean`

**Used by:**
- `supabase/functions/_shared/authorize.ts` (when `requiredPermission` option is set)

---

### `get_accessible_companies`

Returns all company IDs a user can access (via membership or superadmin).

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

### `get_user_company_id`

Returns the user's primary (default) company ID from their profile.

**Parameters:** `{ _user_id: string }`

**Returns:** `string`

---

### `get_user_company_ids`

Returns all company IDs the user is a member of.

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

### `user_team_member_ids`

Returns all user IDs who share at least one company with the given user.

**Parameters:** `{ _user_id: string }`

**Returns:** `string[]`

---

## Cron & Infrastructure

### `update_cron_job`

Updates a cron job's schedule, enabled state, or description.

```typescript
const { data } = await supabase.rpc('update_cron_job', {
  _job_name: 'analytics-sync',
  _schedule: '0 */2 * * *',
  _enabled: true,
  _description: 'Sync analytics every 2 hours'
});
```

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `_job_name` | string | Yes |
| `_schedule` | string | No |
| `_enabled` | boolean | No |
| `_description` | string | No |

**Returns:** JSON status object

**Used by:**
- `supabase/functions/admin-cron/index.ts`

---

### `trigger_cron_job`

Manually triggers a cron job to run immediately.

**Parameters:** `{ _job_name: string }`

**Returns:** JSON status object

**Used by:**
- `supabase/functions/admin-cron/index.ts`

---

### `cron_watchdog`

Self-healing function that checks for missed cron runs and re-triggers them.

**Parameters:** None.

**Returns:** void

---

### `cron_interval_minutes`

Parses a cron schedule expression and returns the interval in minutes.

**Parameters:** `{ _schedule: string }`

**Returns:** `number`

---

### `dispatch_company_sync`

Fan-out dispatcher: invokes a given edge function once per company that needs syncing.

**Parameters:** `{ _function_name: string }`

**Returns:** JSON dispatch results

---

## Inbox

### `inbox_resurface_snoozed`

Checks for snoozed conversations whose `snooze_until` has passed and reopens them.

**Parameters:** None.

**Returns:** void

---

### `increment_ai_calls`

Increments the AI call counter for a company (usage tracking).

**Parameters:** `{ _company_id: string }`

**Returns:** void

---

## Internal / Auth Hook

### `auth_email`

Returns the email address from the current auth context. Used internally by RLS policies.

**Parameters:** None.

**Returns:** `string`
