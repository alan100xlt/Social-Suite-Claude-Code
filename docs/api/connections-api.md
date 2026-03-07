# Connections API

Edge functions for managing social platform connections via the GetLate integration layer. Handles OAuth flows, profile management, account listing, and webhook registration.

---

## getlate-connect

**Purpose:** Manage the OAuth connection flow for social platforms (Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, etc.) and GetLate profile lifecycle.
**Auth:** JWT required | Service role: yes
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/getlate-connect`

All actions are dispatched via the `action` field in the request body.

### Action: create-profile

Create a new GetLate profile and optionally link it to a company.

```json
{
  "action": "create-profile",
  "companyName": "string - Name for the new profile",
  "companyId": "string (optional) - Company UUID to link the profile to"
}
```

**Response (200):**

```json
{
  "success": true,
  "profile": {
    "id": "getlate-profile-id",
    "name": "My Company"
  }
}
```

If `companyId` is provided, the company's `getlate_profile_id` column is updated automatically.

### Action: ensure-profile

Idempotent profile creation: returns the existing profile if one is linked, otherwise creates a new one. This is the recommended action for connection flows.

```json
{
  "action": "ensure-profile",
  "companyId": "string - Company UUID",
  "companyName": "string - Fallback name if profile needs to be created"
}
```

**Response (200, existing profile):**

```json
{
  "success": true,
  "profileId": "getlate-profile-id",
  "created": false
}
```

**Response (200, new profile):**

```json
{
  "success": true,
  "profileId": "getlate-profile-id",
  "created": true,
  "profile": { "id": "getlate-profile-id", "name": "My Company" },
  "syncJobId": "uuid-or-null"
}
```

**Side effects when creating a new profile:**
- Triggers `inbox-historical-sync` (fire-and-forget) to backfill inbox messages
- Auto-registers webhooks for real-time events (see Webhook Registration below)

### Action: update-profile

```json
{
  "action": "update-profile",
  "profileId": "string - GetLate profile ID",
  "name": "string - New profile name"
}
```

**Response (200):**

```json
{ "success": true, "profile": { "...": "updated profile data" } }
```

### Action: get-profiles

List all GetLate profiles associated with the API key.

```json
{
  "action": "get-profiles"
}
```

**Response (200):**

```json
{
  "success": true,
  "profiles": [
    { "_id": "profile-id", "name": "My Company", "description": "..." }
  ]
}
```

### Action: start

Initiate the OAuth flow for a social platform. Returns a URL to redirect the user to.

```json
{
  "action": "start",
  "platform": "string - Platform name (facebook, instagram, twitter, linkedin, tiktok, youtube, bluesky, threads, pinterest)",
  "profileId": "string (optional) - GetLate profile ID. Uses default if omitted.",
  "redirectUrl": "string - URL to redirect back to after OAuth completes"
}
```

**Response (200):**

```json
{
  "success": true,
  "authUrl": "https://facebook.com/oauth/authorize?client_id=...&redirect_uri=..."
}
```

The client should open `authUrl` in a new window or redirect the user there.

### Action: get-options

After OAuth completes, some platforms (Facebook, LinkedIn, YouTube) require the user to select a page/channel/account. This action retrieves the available options.

```json
{
  "action": "get-options",
  "platform": "string - Platform name",
  "tempToken": "string - Temporary token from OAuth callback",
  "profileId": "string (optional) - GetLate profile ID"
}
```

**Response (200):**

```json
{
  "success": true,
  "options": [
    {
      "id": "page-id-123",
      "name": "My Facebook Page",
      "pictureUrl": "https://..."
    },
    {
      "id": "page-id-456",
      "name": "My Other Page",
      "pictureUrl": "https://..."
    }
  ]
}
```

GetLate returns different field names per platform (`pages` for Facebook, `channels` for YouTube, `accounts` for others). This function normalizes them all to `options`.

### Action: select

Complete the connection by selecting a specific page/channel/account.

```json
{
  "action": "select",
  "platform": "string - Platform name",
  "tempToken": "string - Temporary token from OAuth callback",
  "profileId": "string (optional) - GetLate profile ID",
  "selection": {
    "id": "string - Selected page/channel ID",
    "name": "string - Display name"
  },
  "userProfile": "object (optional) - User profile data (required by GetLate for some platforms like LinkedIn)"
}
```

**Response (200):**

```json
{
  "success": true,
  "account": {
    "_id": "getlate-account-id",
    "platform": "facebook",
    "platformUsername": "MyPage",
    "isActive": true
  }
}
```

### Action: get-pending-data

Resolve a LinkedIn `pendingDataToken` to get the `tempToken` and user profile for the select step. LinkedIn OAuth uses a two-step flow where the callback returns a `pendingDataToken` instead of a `tempToken` directly.

```json
{
  "action": "get-pending-data",
  "pendingDataToken": "string - Token from LinkedIn OAuth callback"
}
```

**Response (200):**

```json
{
  "success": true,
  "tempToken": "string - Token to use in the 'select' action",
  "userProfile": { "...": "LinkedIn user profile data" },
  "organizations": [
    { "id": "org-id", "name": "My Company" }
  ]
}
```

**Note:** Pending data tokens expire after 10 minutes. Expired tokens return:

```json
{
  "success": false,
  "error": "Token expired. Please try connecting again (tokens are valid for 10 minutes)."
}
```

### Webhook Auto-Registration

When a new profile is created via `ensure-profile`, the function automatically registers webhooks with the GetLate API for these events:

- `message.received` - New inbox message
- `comment.received` - New comment on a post
- `post.failed` - Post publishing failed
- `post.partial` - Post partially published (some platforms failed)
- `account.disconnected` - Account OAuth token revoked or expired

Webhook details are stored in the `webhook_registrations` table with an HMAC secret for signature verification.

---

## getlate-accounts

**Purpose:** List, inspect, disconnect connected social accounts, and fetch follower statistics.
**Auth:** JWT required | Service role: yes
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/getlate-accounts`

### Action: list

List all connected social accounts for a profile.

```json
{
  "action": "list",
  "profileId": "string (optional) - GetLate profile ID. Returns all accounts if omitted."
}
```

**Response (200):**

```json
{
  "success": true,
  "accounts": [
    {
      "id": "account-id-1",
      "platform": "twitter",
      "platformUsername": "myhandle",
      "displayName": "My Handle",
      "followerCount": 1500,
      "profilePicture": "https://...",
      "isActive": true
    },
    {
      "id": "account-id-2",
      "platform": "facebook",
      "platformUsername": "MyPage",
      "followerCount": 5200,
      "isActive": true
    }
  ]
}
```

Account IDs are normalized: GetLate may return `_id` or `id`; this function always returns `id`.

### Action: get

Get details for a single account.

```json
{
  "action": "get",
  "accountId": "string - GetLate account ID"
}
```

**Response (200):**

```json
{
  "success": true,
  "account": {
    "id": "account-id-1",
    "platform": "twitter",
    "platformUsername": "myhandle",
    "displayName": "My Handle",
    "followerCount": 1500,
    "metadata": { "...": "platform-specific metadata" }
  }
}
```

### Action: disconnect

Remove a connected social account.

```json
{
  "action": "disconnect",
  "accountId": "string - GetLate account ID to disconnect"
}
```

**Response (200):**

```json
{ "success": true }
```

### Action: follower-stats

Get historical follower statistics for an account.

```json
{
  "action": "follower-stats",
  "accountId": "string - GetLate account ID"
}
```

**Response (200):**

```json
{
  "success": true,
  "stats": {
    "current": 1500,
    "history": [
      { "date": "2026-03-01", "count": 1480 },
      { "date": "2026-03-07", "count": 1500 }
    ]
  }
}
```

### Notes

- All actions are logged to `api_call_logs` with duration and success/failure tracking.
- Rate limiting from the GetLate API (429) is caught and returned as `{ errorType: "rate_limit", retryAfter: N }`.
- The `id` field is normalized from GetLate's `_id` format for consistency.

---

## Connection Flow (End-to-End)

The typical OAuth connection flow from the client:

1. **Ensure profile exists:**
   ```
   POST getlate-connect { action: "ensure-profile", companyId, companyName }
   ```

2. **Start OAuth:**
   ```
   POST getlate-connect { action: "start", platform: "facebook", profileId, redirectUrl }
   ```
   Open the returned `authUrl` in a popup/redirect.

3. **User authenticates** on the platform and is redirected back with a `tempToken` (or `pendingDataToken` for LinkedIn).

4. **For LinkedIn only -- resolve pending data:**
   ```
   POST getlate-connect { action: "get-pending-data", pendingDataToken }
   ```

5. **Get available pages/channels (if applicable):**
   ```
   POST getlate-connect { action: "get-options", platform, tempToken, profileId }
   ```

6. **Select a page/channel:**
   ```
   POST getlate-connect { action: "select", platform, tempToken, profileId, selection: { id, name }, userProfile }
   ```

7. **Verify connection:**
   ```
   POST getlate-accounts { action: "list", profileId }
   ```

For platforms that don't require page selection (e.g., Twitter/X, Bluesky), steps 5-6 are skipped and the account is connected directly after step 3.

---

## Other GetLate Edge Functions

| Function | Purpose |
|----------|---------|
| `getlate-webhook` | Receives webhook events from GetLate (message.received, comment.received, post.failed, account.disconnected). Verifies HMAC signature. |
| `getlate-inbox` | Inbox message CRUD: list conversations, send replies, mark read. |
| `getlate-changelog-monitor` | Monitors the GetLate API changelog for breaking changes. |
| `getlate-changelog-action` | Processes detected changelog changes and alerts. |
