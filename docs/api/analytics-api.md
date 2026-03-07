# Analytics API

Edge functions for syncing post/account analytics from GetLate and the Facebook Graph API, querying analytics data, and computing optimal posting windows.

---

## analytics-sync

**Purpose:** Sync post-level and account-level analytics from the GetLate API (and Facebook Graph API for thumbnail discovery) into local Supabase snapshot tables.
**Auth:** JWT required | Service role: yes (used by cron)
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/analytics-sync`
**Cron:** `analytics-sync-hourly` - dispatched hourly per company

### Request

```json
{
  "companyId": "string (optional) - Specific company UUID. Omit for legacy all-companies mode.",
  "fromDate": "string (optional) - ISO date 'YYYY-MM-DD'. Defaults to 90 days ago.",
  "toDate": "string (optional) - ISO date 'YYYY-MM-DD'. Defaults to today."
}
```

### Response (200)

```json
{
  "success": true,
  "companiesSynced": 1,
  "totalCompanies": 1,
  "accountSnapshots": 3,
  "postSnapshots": 45,
  "postsSkippedNoAccount": 2,
  "postsDiscovered": 12,
  "postsSynced": 12,
  "contentDecayCached": 1,
  "bailedEarly": false,
  "durationMs": 8500,
  "errors": []
}
```

### Notes

- **Pipeline steps per company:**
  1. Fetch all connected accounts from GetLate (`GET /accounts?profileId=...`)
  2. Discover Facebook posts via the Graph API (for thumbnail URLs)
  3. Fetch post analytics with pagination (`GET /analytics?profileId=...&limit=100&page=N&fromDate=...&toDate=...`)
  4. Batch upsert post snapshots into `post_analytics_snapshots` (chunks of 50, conflict key: `company_id,post_id,snapshot_date`)
  5. Aggregate and upsert account snapshots into `account_analytics_snapshots` (conflict key: `company_id,account_id,snapshot_date`)
  6. Mark orphaned accounts (no longer in GetLate) as `is_active = false`
  7. Cache content decay data from `GET /analytics/get-content-decay`

- **Deadline guard:** The function enforces a 50-second deadline (Supabase edge functions timeout at 60s). If the deadline is reached mid-processing, it stops gracefully and sets `bailedEarly: true`.
- **Per-request timeout:** Individual API calls have a 15-second timeout to prevent hanging fetches.
- **CronMonitor:** Reports to `cron_health` table. When `companyId` is provided, the monitor name is `analytics-sync:<company-id-prefix>`.
- **Facebook thumbnails:** For Facebook accounts with a `pageAccessToken` and `selectedPageId` in metadata, the function fetches posts from the Graph API (`/v21.0/{pageId}/posts`) to collect `full_picture` URLs and attach them to analytics snapshots as `thumbnail_url`.

**CRITICAL:** When querying `post_analytics_snapshots` on the client, always filter by `published_at` (when the post was published), never by `snapshot_date` (when the sync ran). See the `analytics-data` skill for details.

---

## getlate-analytics

**Purpose:** Proxy for querying various GetLate analytics endpoints (post metrics, overview, best posting times, content decay, daily metrics, and more).
**Auth:** JWT required | Service role: yes
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/getlate-analytics`

This function uses a registry-based action dispatch pattern. Each action maps to a specific GetLate API endpoint.

### Action: get

Fetch analytics for a specific post or set of posts.

```json
{
  "action": "get",
  "postId": "string (optional) - Single GetLate post ID",
  "postIds": "string[] (optional) - Multiple post IDs"
}
```

**Response (200):**

```json
{
  "success": true,
  "analytics": {
    "impressions": 1200,
    "reach": 980,
    "likes": 45,
    "comments": 12,
    "shares": 8,
    "clicks": 32,
    "engagementRate": 0.054
  }
}
```

### Action: sync

Trigger an on-demand analytics refresh for a specific post or account.

```json
{
  "action": "sync",
  "accountId": "string (optional) - GetLate account ID",
  "postUrl": "string (optional) - Post URL to sync"
}
```

**Response (200):**

```json
{ "success": true, "analytics": { "...": "refreshed metrics" } }
```

### Action: overview

Aggregated analytics overview across accounts.

```json
{
  "action": "overview",
  "accountIds": "string[] (optional) - Filter to specific accounts",
  "startDate": "string (optional) - ISO date",
  "endDate": "string (optional) - ISO date"
}
```

**Response (200):**

```json
{
  "success": true,
  "overview": {
    "impressions": 45000,
    "reach": 32000,
    "likes": 1200,
    "comments": 340,
    "shares": 180,
    "clicks": 890,
    "views": 5600,
    "engagementRate": 0.042
  }
}
```

### Action: best-time

Get optimal posting times for a platform.

```json
{
  "action": "best-time",
  "companyId": "string - Company UUID (resolved to profileId automatically)",
  "platform": "string (optional) - Filter to specific platform"
}
```

**Response (200):**

```json
{ "success": true, "...": "best time data from GetLate" }
```

### Action: content-decay

Analyze how post engagement decays over time.

```json
{
  "action": "content-decay",
  "companyId": "string - Company UUID",
  "platform": "string (optional)",
  "accountId": "string (optional)",
  "postId": "string (optional)"
}
```

**Response (200):**

```json
{ "success": true, "...": "content decay buckets" }
```

### Action: posting-frequency

Get posting frequency analysis.

```json
{
  "action": "posting-frequency",
  "companyId": "string - Company UUID",
  "platform": "string (optional)"
}
```

### Action: daily-metrics

Get daily aggregated metrics over a date range.

```json
{
  "action": "daily-metrics",
  "companyId": "string - Company UUID",
  "startDate": "string (optional) - ISO date",
  "endDate": "string (optional) - ISO date",
  "platform": "string (optional)"
}
```

**Response (200):**

```json
{
  "success": true,
  "dailyMetrics": [
    { "date": "2026-03-01", "impressions": 500, "reach": 320, "likes": 25 }
  ]
}
```

### Action: youtube-daily

Get daily YouTube view counts for a specific video post.

```json
{
  "action": "youtube-daily",
  "postId": "string - GetLate post ID for the YouTube video"
}
```

**Response (200):**

```json
{
  "success": true,
  "dailyViews": [
    { "date": "2026-03-01", "views": 150 },
    { "date": "2026-03-02", "views": 230 }
  ]
}
```

### Action: post-timeline

Get engagement timeline for a specific post.

```json
{
  "action": "post-timeline",
  "postId": "string - GetLate post ID",
  "fromDate": "string (optional) - ISO date",
  "toDate": "string (optional) - ISO date"
}
```

**Response (200):**

```json
{ "success": true, "timeline": [{ "date": "...", "impressions": 100, "likes": 5 }] }
```

### Action: account-health

Check the health status of connected accounts.

```json
{
  "action": "account-health",
  "companyId": "string - Company UUID"
}
```

**Response (200):**

```json
{ "success": true, "health": [{ "accountId": "...", "platform": "twitter", "status": "healthy" }] }
```

### Notes

- **ProfileId resolution:** Actions marked with `needsProfileId: true` (best-time, content-decay, posting-frequency, daily-metrics, account-health) automatically resolve the company's `getlate_profile_id` from the `companies` table when `companyId` is provided. You can also pass `profileId` directly.
- **All calls are logged** to `api_call_logs` with action, duration, and success/failure status.
- **Rate limiting:** 429 responses from GetLate are caught and returned as `{ errorType: "rate_limit", retryAfter: N }`.

---

## Database Tables (Analytics)

These tables are populated by `analytics-sync` and queried by the frontend:

### post_analytics_snapshots

Daily snapshots of per-post metrics. Conflict key: `(company_id, post_id, snapshot_date)`.

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | uuid | Company FK |
| `post_id` | text | External post ID from GetLate |
| `platform` | text | Social platform name |
| `account_id` | text | GetLate account ID |
| `impressions` | integer | Total impressions |
| `reach` | integer | Unique reach |
| `views` | integer | Video views |
| `likes` | integer | Like/reaction count |
| `comments` | integer | Comment count |
| `shares` | integer | Share/repost count |
| `clicks` | integer | Link clicks |
| `saves` | integer | Save/bookmark count |
| `engagement_rate` | float | Engagement rate (0-1) |
| `snapshot_date` | date | Date the sync ran |
| `published_at` | timestamptz | When the post was originally published |
| `content` | text | Post content text |
| `post_url` | text | URL to the post on the platform |
| `thumbnail_url` | text | Post thumbnail/image URL |
| `source` | text | `'getlate'` or `'direct'` |

### account_analytics_snapshots

Daily snapshots of per-account aggregate metrics. Conflict key: `(company_id, account_id, snapshot_date)`.

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | uuid | Company FK |
| `account_id` | text | GetLate account ID |
| `platform` | text | Social platform name |
| `followers` | integer | Follower count |
| `following` | integer | Following count |
| `posts_count` | integer | Number of posts in sync window |
| `impressions` | integer | Aggregate impressions |
| `engagement_rate` | float | Average engagement rate |
| `snapshot_date` | date | Date the sync ran |
| `is_active` | boolean | Whether the account is still connected |
