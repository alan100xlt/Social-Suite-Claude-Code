# Notifications API Reference

Social Suite uses two notification providers: **Resend** for transactional email and **Courier** for in-app notifications. Most notification edge functions use Resend as primary with Courier as fallback or supplement.

---

## Authentication Patterns

All notification functions use the shared `authorize()` helper from `supabase/functions/_shared/authorize.ts`. The auth pattern varies per function:

| Function | Auth Requirement |
|----------|-----------------|
| `courier-token` | Any authenticated user (manual JWT check) |
| `send-in-app-notification` | Any authenticated user or service role |
| `send-post-approval` | Any authenticated user |
| `send-invite-email` | Any authenticated user |
| `send-auth-email` | Webhook signature (Supabase Auth hook) |
| `send-test-email` | Superadmin only |

All authenticated endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt>
```

---

## POST `/functions/v1/courier-token`

Issues a scoped Courier JWT for the authenticated user, used by the frontend to initialize the Courier in-app inbox.

### Request

No body required. Auth header only.

### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

The token is scoped to the user's ID with permissions: `read:messages write:events inbox:read:messages inbox:write:events`. Expires in 2 days.

### Errors

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "COURIER_AUTH_TOKEN is not configured" }` |

### Source

`supabase/functions/courier-token/index.ts`

---

## POST `/functions/v1/send-in-app-notification`

Sends an in-app notification to a specific user via Courier's inbox channel.

### Auth

Authenticated user **or** service role (`allowServiceRole: true`). Other edge functions call this internally using the service role key.

### Request

```json
{
  "userId": "uuid-of-target-user",
  "title": "New Assignment",
  "body": "You've been assigned a conversation in the inbox.",
  "actionUrl": "https://social.longtale.ai/app/inbox"  // optional
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Supabase user UUID to notify |
| `title` | string | Yes | Notification title |
| `body` | string | Yes | Notification body text |
| `actionUrl` | string | No | Click-through URL |

### Response

```json
{
  "success": true,
  "requestId": "1-abc123..."
}
```

### Errors

| Status | Body |
|--------|------|
| 400 | `{ "error": "userId, title, and body are required" }` |
| 401 | `{ "error": "Unauthorized: missing auth header" }` |
| 502 | `{ "error": "Courier error: 429" }` |

### Source

`supabase/functions/send-in-app-notification/index.ts`

---

## POST `/functions/v1/send-post-approval`

Creates a post approval record and sends a branded email (+ in-app notification) to a reviewer.

### Auth

Any authenticated user (`authorize(req)`).

### Request

```json
{
  "recipientEmail": "reviewer@example.com",
  "platformContents": {
    "twitter": "Check out our latest article on AI trends!",
    "linkedin": "We're excited to share our insights on AI..."
  },
  "articleTitle": "How AI is Transforming Content Marketing",
  "articleLink": "https://example.com/article",
  "articleImageUrl": "https://example.com/image.jpg",
  "objective": "engagement",
  "imageUrl": "https://example.com/post-image.jpg",
  "selectedAccountIds": ["acc-1", "acc-2"],
  "linkAsComment": { "twitter": true }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipientEmail` | string | Yes | Reviewer's email address |
| `platformContents` | `Record<string, string>` | Yes | Platform-keyed post content map |
| `articleTitle` | string | No | Source article title |
| `articleLink` | string | No | Source article URL |
| `articleImageUrl` | string | No | Article thumbnail |
| `objective` | string | No | Post objective (e.g. "engagement") |
| `imageUrl` | string | No | Post image URL |
| `selectedAccountIds` | string[] | No | Account IDs to publish to |
| `linkAsComment` | `Record<string, boolean>` | No | Per-platform link-as-comment flags |

### Response

```json
{
  "success": true,
  "approvalId": "uuid-of-approval-record"
}
```

### Behavior

1. Inserts a row into `post_approvals` (generates a unique token).
2. Builds a branded HTML email with post previews per platform.
3. Sends via Resend (primary) or Courier (fallback).
4. If both Resend and Courier are configured, sends email via Resend and in-app notification via Courier.
5. The approval link (`/approve/:token`) is a public route -- no auth required.

### Source

`supabase/functions/send-post-approval/index.ts`

---

## POST `/functions/v1/send-invite-email`

Sends a branded team invitation email.

### Auth

Any authenticated user (`authorize(req)`). Company-level RBAC (owner/admin) is enforced by the frontend.

### Request

```json
{
  "email": "newuser@example.com",
  "companyName": "Acme Corp",
  "companyId": "uuid-of-company",
  "inviterName": "Sarah Johnson",
  "role": "member",
  "signupUrl": "https://social.longtale.ai/auth/signup?invite=abc123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Invitee email |
| `companyName` | string | Yes | Company display name |
| `companyId` | string | No | Company UUID |
| `inviterName` | string | Yes | Name of the person inviting |
| `role` | string | Yes | Role being assigned |
| `signupUrl` | string | Yes | Signup link with invite token |

### Response

```json
{
  "success": true,
  "data": { "id": "resend-message-id" }
}
```

### Source

`supabase/functions/send-invite-email/index.ts`

---

## POST `/functions/v1/send-auth-email` (Webhook)

Supabase Auth hook -- **not called directly by clients**. Intercepts auth emails (signup confirmation, password reset, magic link, email change, invite) and sends branded versions via Resend.

### Auth

Webhook signature verification using `SEND_EMAIL_HOOK_SECRET` (standardwebhooks library). No JWT auth.

### Webhook Payload (from Supabase Auth)

```json
{
  "user": {
    "email": "user@example.com"
  },
  "email_data": {
    "token": "abc123",
    "token_hash": "hashed-token",
    "redirect_to": "https://social.longtale.ai/app",
    "email_action_type": "signup"
  }
}
```

Supported `email_action_type` values: `signup`, `recovery`, `magiclink`, `email_change`, `invite`.

### Response

Returns `200 {}` on success, signaling to Supabase Auth that the email was handled. On error, returns `500` so Auth falls back to its default email behavior.

### Source

`supabase/functions/send-auth-email/index.ts`

---

## POST `/functions/v1/send-test-email`

Sends a test email to preview email branding. **Superadmin only.**

### Auth

Superadmin required (`authorize(req, { superadminOnly: true })`).

### Request

```json
{
  "recipientEmail": "admin@example.com",
  "template": "generic",
  "branding": {
    "sender_name": "Longtale.ai",
    "from_email": "noreply@longtale.ai",
    "accent_color": "#667eea",
    "accent_color_end": "#764ba2",
    "header_text_color": "#ffffff",
    "body_background_color": "#ffffff",
    "body_text_color": "#333333",
    "logo_url": null,
    "reply_to_email": null,
    "footer_text": null
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipientEmail` | string | Yes | Where to send the test |
| `template` | string | Yes | `"generic"`, `"approval"`, or `"invitation"` |
| `branding` | object | No | Override branding (defaults used if omitted) |

### Response

```json
{
  "success": true,
  "data": { "id": "resend-message-id" }
}
```

### Source

`supabase/functions/send-test-email/index.ts`

---

## Email Branding System

All email functions share a common branding pattern. Branding is resolved from two tables:

1. **`global_email_settings`** -- primary source for colors, sender name, logo, footer
2. **`platform_settings`** -- fallback for `platform_name` and `platform_logo_url`

Default branding (used when no DB settings exist):

```json
{
  "sender_name": "Longtale.ai",
  "from_email": "noreply@longtale.ai",
  "reply_to_email": null,
  "logo_url": null,
  "accent_color": "#667eea",
  "accent_color_end": "#764ba2",
  "header_text_color": "#ffffff",
  "body_background_color": "#ffffff",
  "body_text_color": "#333333",
  "footer_text": null
}
```

All emails use a consistent template: gradient header with logo, white body with content, footer with branding text.

---

## External Services

| Service | Used For | Secret |
|---------|----------|--------|
| [Resend](https://resend.com) | Transactional email delivery | `RESEND_API_KEY` (Supabase Secrets) |
| [Courier](https://courier.com) | In-app notifications + email fallback | `COURIER_AUTH_TOKEN` (Supabase Secrets) |

Both secrets are production-only -- never stored in `.env.local`.
