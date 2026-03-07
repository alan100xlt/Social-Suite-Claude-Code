# Admin API Reference

Internal administration functions. All require **superadmin** privileges unless otherwise noted. These are operational tools, not part of the public API.

---

## Authentication

All admin functions (except bootstrap endpoints) use the shared `authorize()` helper with `superadminOnly: true`:

```
Authorization: Bearer <superadmin-jwt>
```

Superadmin status is checked via the `is_superadmin` RPC function, which queries the `superadmins` table.

Bootstrap endpoints use a separate `BOOTSTRAP_SECRET` for initial platform setup.

---

## POST `/functions/v1/admin-companies`

Lists all companies with aggregated stats.

### Auth

Superadmin only.

### Request

No body required.

### Response

```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "website_url": "https://acme.com",
      "onboarding_status": "complete",
      "onboarding_step": 4,
      "created_at": "2026-01-15T...",
      "has_getlate": true,
      "last_login": "2026-03-06T...",
      "verified_users": 3,
      "pending_invitations": 1,
      "connections_active": 4,
      "connections_total": 6,
      "connections_found": 8,
      "posts_last_7_days": 12,
      "posts_total": 145
    }
  ]
}
```

### Source

`supabase/functions/admin-companies/index.ts`

---

## POST `/functions/v1/admin-users`

Multi-action user management endpoint. Dispatches based on the `action` field.

### Auth

Superadmin only.

### Actions

#### `action: "list"`

Lists all users with profiles, memberships, and superadmin status.

**Request:**
```json
{ "action": "list" }
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2026-01-15T...",
      "last_sign_in_at": "2026-03-06T...",
      "is_superadmin": false,
      "company_memberships": [
        { "company_id": "uuid", "role": "owner", "company_name": "Acme Corp" }
      ],
      "media_memberships": [
        { "media_company_id": "uuid", "role": "admin", "is_active": true, "media_company_name": "Media Group" }
      ]
    }
  ]
}
```

#### `action: "create"`

Creates a new user with a temporary password and sends a branded set-password email.

**Request:**
```json
{
  "action": "create",
  "email": "newuser@example.com",
  "full_name": "Jane Doe",
  "make_superadmin": false
}
```

**Response:**
```json
{ "success": true, "user_id": "uuid" }
```

#### `action: "reset_password"`

Generates a password reset link and sends a branded email.

**Request:**
```json
{
  "action": "reset_password",
  "email": "user@example.com"
}
```

**Response:**
```json
{ "success": true }
```

#### `action: "toggle_superadmin"`

Grants or revokes superadmin status.

**Request:**
```json
{
  "action": "toggle_superadmin",
  "user_id": "uuid",
  "is_superadmin": true
}
```

#### `action: "update_company_membership"`

Adds, updates, or removes a user's company membership.

**Request:**
```json
{
  "action": "update_company_membership",
  "user_id": "uuid",
  "company_id": "uuid",
  "role": "admin",
  "remove": false
}
```

#### `action: "update_media_membership"`

Adds, updates, or removes a user's media company membership.

**Request:**
```json
{
  "action": "update_media_membership",
  "user_id": "uuid",
  "media_company_id": "uuid",
  "role": "member",
  "remove": false
}
```

#### `action: "delete_user"`

Permanently deletes a user from Supabase Auth.

**Request:**
```json
{
  "action": "delete_user",
  "user_id": "uuid"
}
```

### Source

`supabase/functions/admin-users/index.ts`

---

## POST `/functions/v1/admin-set-password`

Directly sets a user's password by email.

### Auth

Superadmin only.

### Request

```json
{
  "targetEmail": "user@example.com",
  "newPassword": "newSecurePassword123"
}
```

Password must be at least 6 characters.

### Response

```json
{
  "success": true,
  "message": "Password updated for user@example.com"
}
```

### Source

`supabase/functions/admin-set-password/index.ts`

---

## POST `/functions/v1/admin-delete-companies`

Bulk-deletes companies and all related data (memberships, posts, analytics, feeds, etc.).

### Auth

Superadmin only.

### Request

```json
{
  "companyIds": ["uuid-1", "uuid-2"]
}
```

### Response

Success:
```json
{ "success": true, "deleted": 2 }
```

Partial failure (HTTP 207):
```json
{
  "warning": "Some deletions had errors",
  "errors": ["post_analytics_snapshots: foreign key constraint"]
}
```

### Deletion Order

Respects foreign keys: `post_analytics_snapshots` -> `account_analytics_snapshots` -> `automation_logs` -> `automation_rules` -> `rss_feed_items` -> `rss_feeds` -> `post_approvals` -> `post_drafts` -> `api_call_logs` -> `company_voice_settings` -> `company_email_settings` -> `company_invitations` -> `company_memberships` -> `discovery_leads` -> `companies`.

### Source

`supabase/functions/admin-delete-companies/index.ts`

---

## POST `/functions/v1/impersonate-user`

Generates a magic link token hash for logging in as another user. Used for debugging.

### Auth

Superadmin only.

### Request

```json
{
  "targetEmail": "user@example.com"
}
```

### Response

```json
{
  "success": true,
  "tokenHash": "hashed-magic-link-token",
  "email": "user@example.com"
}
```

The frontend uses the `tokenHash` to verify through Supabase Auth's `/auth/v1/verify` endpoint.

### Source

`supabase/functions/impersonate-user/index.ts`

---

## POST `/functions/v1/admin-cron`

Manages cron job settings (list, update schedule, trigger manually).

### Auth

Superadmin only.

### Actions

#### `action: "list"`

```json
{ "action": "list" }
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "job_name": "analytics-sync",
      "schedule": "*/30 * * * *",
      "enabled": true,
      "description": "Sync analytics from GetLate"
    }
  ]
}
```

#### `action: "update"`

Updates a cron job's schedule, enabled state, or description. Calls the `update_cron_job` RPC.

```json
{
  "action": "update",
  "jobName": "analytics-sync",
  "schedule": "0 */2 * * *",
  "enabled": true,
  "description": "Sync analytics every 2 hours"
}
```

#### `action: "trigger"`

Manually triggers a cron job. Calls the `trigger_cron_job` RPC.

```json
{
  "action": "trigger",
  "jobName": "analytics-sync"
}
```

### Source

`supabase/functions/admin-cron/index.ts`

---

## POST `/functions/v1/webhook-admin`

Manages GetLate webhook registration, status, and cleanup.

### Auth

Superadmin only.

### Actions

#### `action: "register"`

Registers a webhook with GetLate's API for events: `message.received`, `comment.received`, `post.failed`, `post.partial`, `account.disconnected`.

```json
{ "action": "register" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "registered",
    "webhookId": "getlate-webhook-id",
    "anchorCompanyId": "uuid"
  }
}
```

#### `action: "status"`

Returns current webhook registrations, recent events, and event counts.

```json
{ "action": "status" }
```

#### `action: "deregister"`

Deactivates the GetLate webhook (both remotely and locally).

```json
{ "action": "deregister" }
```

#### `action: "test"`

Sends a test event through the active webhook.

```json
{ "action": "test" }
```

#### `action: "cleanup-stuck-cron"`

Finds cron health log entries stuck in "running" for more than 5 minutes and marks them as errored.

```json
{ "action": "cleanup-stuck-cron" }
```

### Source

`supabase/functions/webhook-admin/index.ts`

---

## Bootstrap Endpoints

These use `BOOTSTRAP_SECRET` instead of JWT auth. Intended for initial platform setup only. Disabled when `BOOTSTRAP_SECRET` is not set.

### POST `/functions/v1/bootstrap-superadmin`

Resets the password for `superadmin@getlate.dev`.

```json
{
  "secret": "bootstrap-secret-value",
  "password": "newPassword123"
}
```

**Response:**
```json
{ "success": true, "message": "Superadmin password has been reset" }
```

### POST `/functions/v1/provision-superadmins`

Creates users and grants superadmin status. Sends password reset emails.

```json
{
  "secret": "bootstrap-secret-value",
  "emails": ["admin1@example.com", "admin2@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "email": "admin1@example.com", "status": "created" },
    { "email": "admin2@example.com", "status": "existing_user" }
  ]
}
```

Possible `status` values: `created`, `existing_user`, `error`, `superadmin_insert_error`.

### Source

- `supabase/functions/bootstrap-superadmin/index.ts`
- `supabase/functions/provision-superadmins/index.ts`
