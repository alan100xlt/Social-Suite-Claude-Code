# Inbox API

The Inbox API provides a unified social inbox for media companies, aggregating comments, DMs, and reviews from all connected social platforms (via the GetLate aggregation layer) into a single Supabase-backed data model. It includes AI-powered classification, sentiment analysis, auto-response rules, crisis detection, and content recycling intelligence.

## Architecture

The inbox system consists of six edge functions that work together:

```
                   Real-time path                     Polling path
                   ─────────────                      ────────────
GetLate Platform ──► getlate-webhook ──┐     pg_cron ──► inbox-sync (every 5 min)
                                       │                     │
                                       ▼                     ▼
                               ┌─────────────────────────────────┐
                               │  _shared/inbox-processing.ts    │
                               │  (upsert contacts, convos, msgs)│
                               └────────────┬────────────────────┘
                                            │
                    ┌───────────────────────┬┴─────────────────────┐
                    ▼                       ▼                      ▼
             getlate-inbox           inbox-ai              inbox-backfill /
        (CRUD, reply, search)   (AI analysis,           inbox-historical-sync
                                 classification)        (bulk import + classify)
```

- **inbox-sync** -- Cron-triggered polling. Syncs comments, DMs, and reviews from GetLate for one company per invocation. Also runs auto-classification if enabled.
- **getlate-webhook** -- Real-time webhook receiver. Processes incoming messages/comments instantly with HMAC signature verification and idempotency.
- **getlate-inbox** -- User-facing CRUD API. Lists conversations, sends replies, manages labels/rules/canned replies.
- **inbox-ai** -- AI-powered analysis. Sentiment, reply suggestions, classification, translation, crisis detection, and content recycling.
- **inbox-backfill** -- Self-chaining function that bulk-classifies all unclassified conversations using Gemini, then generates an audit report.
- **inbox-historical-sync** -- Self-chaining function that performs a full historical import of all DMs and comments from GetLate.

All data-write paths share `_shared/inbox-processing.ts` for identical deduplication logic regardless of ingestion source.

### Key Concept: `profileId` vs `accountId`

- **`profileId`** -- Organization-level identifier in GetLate. Each company has one `profileId` (stored as `companies.getlate_profile_id`). Used to list all conversations/comments across all connected accounts.
- **`accountId`** -- Per-social-account identifier in GetLate. Each connected platform account (e.g., one Twitter handle, one Facebook page) has its own `accountId`. Required for write operations (reply, like, hide). Cached in `inbox_conversations.metadata.accountId` during sync for fast lookups.

## Authorization (`_shared/authorize.ts`)

All edge functions use a shared RBAC authorization module. It supports three modes:

1. **JWT auth** -- Standard user authentication. The `Authorization: Bearer <jwt>` header is validated against Supabase Auth. Company membership and role are checked if `companyId` is provided.
2. **Service role bypass** -- For cron-triggered and self-chaining functions. When `allowServiceRole: true` is set, the service role key is accepted as a valid bearer token.
3. **Superadmin bypass** -- Users flagged as superadmins (via `is_superadmin` RPC) skip company membership and role checks.

**Roles** (from least to most privileged): `member`, `collaborator`, `community_manager`, `manager`, `admin`, `owner`.

### Error Responses (all functions)

| Status | Body | Meaning |
|--------|------|---------|
| 401 | `{ "error": "Unauthorized: missing auth header" }` | No `Authorization` header |
| 401 | `{ "error": "Unauthorized: invalid token" }` | JWT validation failed |
| 403 | `{ "error": "Forbidden: not a member of this company" }` | User is not in the target company |
| 403 | `{ "error": "Forbidden: requires one of [roles]..." }` | User's role is insufficient |

---

## Functions

---

### inbox-sync

**Purpose:** Polls GetLate APIs to sync comments, DMs, and reviews for a single company, then optionally auto-classifies new conversations.

**Auth:** Service role only (called by pg_cron dispatcher via `allowServiceRole: true`)

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/inbox-sync`

#### Request

```json
{
  "companyId": "string (optional) - UUID of the company to sync. If omitted, picks the least-recently-synced company."
}
```

#### Response (200)

```json
{
  "success": true,
  "company": "uuid",
  "totalNew": 12,
  "totalErrors": 0,
  "classificationsAttempted": 5,
  "classificationsSucceeded": 5,
  "bailedEarly": false,
  "durationMs": 8432,
  "results": [
    {
      "company_id": "uuid",
      "sync_type": "comments",
      "new_items": 4,
      "errors": []
    },
    {
      "company_id": "uuid",
      "sync_type": "dms",
      "new_items": 6,
      "errors": []
    },
    {
      "company_id": "uuid",
      "sync_type": "reviews",
      "new_items": 2,
      "errors": []
    }
  ]
}
```

#### Error Responses

- 401: Unauthorized (not service role)
- 500: `{ "success": false, "error": "..." }` -- internal error

#### Notes

- **Cron-triggered.** Called by the `pg_cron` fan-out dispatcher every 5 minutes. Each invocation processes exactly one company.
- **45-second deadline guard.** Sync phases (comments, DMs, reviews, classification) are skipped if the deadline is exceeded, and `bailedEarly` is set to `true`.
- **Cursor-based pagination.** Cursors are persisted to `inbox_sync_state` per company and sync type (`dms`, `comments`), allowing incremental sync across invocations.
- **Auto-classification.** If the company has `auto_classify` enabled in `inbox_ai_settings`, up to 10 unclassified conversations are classified per invocation using Gemini.
- **Auto-respond.** New contact messages trigger the auto-respond rule engine (keyword, regex, sentiment, after-hours, etc.). Responses are sent via GetLate and stored as `sender_type: 'bot'` messages.
- **Reviews: 403 is not an error.** If the GetLate reviews endpoint returns 403 (addon not enabled), it is silently skipped.
- **API call logging.** Each sync phase logs to `api_call_logs` with duration and result counts.
- **CronMonitor integration.** Reports success/error to `cron_health` for the admin dashboard.

---

### getlate-webhook

**Purpose:** Receives real-time webhook events from GetLate (new messages, comments, post failures, account disconnections) and ingests them into the inbox.

**Auth:** HMAC-SHA256 signature verification (not JWT). The webhook secret is stored in `webhook_registrations` per company.

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/getlate-webhook`

#### Request

The payload shape depends on the event type. GetLate sends events with varying structures; the function uses flexible field extraction to normalize them.

```json
{
  "event": "message.received | comment.received | post.failed | post.partial | account.disconnected | webhook.test",
  "eventId": "string (optional) - for idempotency",
  "timestamp": "ISO 8601 or unix seconds (optional) - for replay protection",
  "data": {
    "profileId": "string - GetLate profile ID (used to resolve company)",
    "platform": "string - e.g. twitter, facebook, instagram",
    "sender": { "id": "string", "name": "string", "handle": "string" },
    "text": "string - message or comment content",
    "conversationId": "string - for DMs",
    "postId": "string - for comments",
    "commentId": "string - for comments",
    "messageId": "string - for DMs"
  }
}
```

#### Supported Event Types

| Event | Handler | Description |
|-------|---------|-------------|
| `message.received`, `message.new` | `handleMessageReceived` | New DM received |
| `comment.received`, `comment.new` | `handleCommentReceived` | New comment on a post |
| `post.failed` | `handlePostFailed` | Scheduled post failed to publish |
| `post.partial` | `handlePostPartial` | Post published to some platforms but not all |
| `account.disconnected` | `handleAccountDisconnected` | Social account token revoked |
| `webhook.test` | `handleWebhookTest` | Connectivity test (no side effects) |

#### Response (200)

```json
{
  "success": true,
  "event": "message.received",
  "durationMs": 342,
  "inserted": true,
  "conversationId": "uuid",
  "isNew": false
}
```

Duplicate events return:

```json
{ "ignored": true, "reason": "duplicate_event" }
```

#### Error Responses

- 401: `{ "error": "Invalid signature" }` -- HMAC verification failed
- 405: `{ "error": "Method not allowed" }` -- non-POST request

**Important:** Internal processing errors still return 200 with `{ "success": false, "error": "..." }` to prevent GetLate from auto-disabling the webhook after 10 consecutive non-2xx responses.

#### Notes

- **HMAC-SHA256 verification.** Checks headers `x-webhook-signature`, `x-getlate-signature`, `x-hub-signature-256`, or `x-signature` (in that order). The `sha256=` prefix is optional.
- **Company resolution.** First tries to match `data.profileId` to `companies.getlate_profile_id`. If that fails, iterates all active webhook registrations and finds one whose secret produces a matching HMAC.
- **Idempotency.** If an `eventId` is present, it is checked against `webhook_event_log` before processing. Duplicate events are skipped.
- **Replay protection.** Timestamps older than 5 minutes are rejected (configurable).
- **Auto-respond.** New contact messages/comments trigger the same auto-respond rule engine as `inbox-sync`.
- **Auto-classify.** If `auto_classify` is enabled in `inbox_ai_settings`, new conversations are classified via Gemini immediately.
- **Failure tracking.** Invalid signatures increment `webhook_registrations.consecutive_failures`. Successful processing resets it to 0.
- **All events logged** to `webhook_event_log` with processing status, duration, and error message.

---

### getlate-inbox

**Purpose:** User-facing CRUD API for the inbox. Handles conversation listing, message retrieval, replies (comments and DMs), status management, labels, canned replies, automation rules, and search.

**Auth:** JWT required. User must be a member of the specified company (any role).

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/getlate-inbox`

All actions use the same endpoint. The `action` field in the request body determines the operation.

#### Common Request Shape

```json
{
  "action": "string - the action name (see below)",
  "companyId": "string - UUID of the company"
}
```

Additional fields depend on the action.

#### Actions

##### `list-conversations`

Lists conversations with optional filters.

```json
{
  "action": "list-conversations",
  "companyId": "uuid",
  "status": "string (optional) - open | pending | closed",
  "platform": "string (optional) - twitter | facebook | instagram | ...",
  "type": "string (optional) - dm | comment | review",
  "assignedTo": "string (optional) - user UUID",
  "limit": "number (optional, default 50)",
  "offset": "number (optional, default 0)"
}
```

Response: `{ "success": true, "conversations": [...] }` -- includes nested `contact` and `labels`.

##### `get-conversation`

```json
{
  "action": "get-conversation",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response: `{ "success": true, "conversation": { ... } }` -- includes nested `contact` and `labels`.

##### `get-messages`

```json
{
  "action": "get-messages",
  "companyId": "uuid",
  "conversationId": "uuid",
  "limit": "number (optional, default 100)",
  "before": "ISO 8601 (optional) - cursor for pagination"
}
```

Response: `{ "success": true, "messages": [...] }` -- ordered ascending by `created_at`, includes nested `contact`.

##### `reply-comment`

Sends a comment reply via GetLate and stores it locally.

```json
{
  "action": "reply-comment",
  "companyId": "uuid",
  "conversationId": "uuid",
  "content": "string - reply text",
  "parentCommentId": "string (optional) - for threaded replies"
}
```

Response: `{ "success": true, "message": { ... }, "apiResult": { ... } }`

Calls `POST /inbox/comments/reply` on GetLate with `{ accountId, postId, message, parentCommentId? }`.

##### `reply-dm`

Sends a DM reply via GetLate and stores it locally.

```json
{
  "action": "reply-dm",
  "companyId": "uuid",
  "conversationId": "uuid",
  "content": "string - reply text",
  "mediaUrl": "string (optional) - attachment URL"
}
```

Response: `{ "success": true, "message": { ... }, "apiResult": { ... } }`

Calls `POST /inbox/conversations/{id}/messages` on GetLate with `{ accountId, message, attachment? }`.

##### `like-comment`

```json
{
  "action": "like-comment",
  "companyId": "uuid",
  "commentId": "string - GetLate comment ID",
  "platform": "string",
  "accountId": "string (optional)",
  "unlike": "boolean (optional, default false)"
}
```

##### `update-status`

```json
{
  "action": "update-status",
  "companyId": "uuid",
  "conversationId": "uuid",
  "status": "string - open | pending | closed"
}
```

##### `bulk-update-status`

```json
{
  "action": "bulk-update-status",
  "companyId": "uuid",
  "conversationIds": ["uuid", "uuid"],
  "status": "string - open | pending | closed"
}
```

Response: `{ "success": true, "updated": 5 }`

##### `assign`

```json
{
  "action": "assign",
  "companyId": "uuid",
  "conversationId": "uuid",
  "assigneeId": "string | null - user UUID or null to unassign"
}
```

##### `mark-read`

Upserts a read-status record for the current user.

```json
{
  "action": "mark-read",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

##### `add-label` / `remove-label`

```json
{
  "action": "add-label",
  "companyId": "uuid",
  "conversationId": "uuid",
  "labelId": "uuid"
}
```

##### `add-note`

Adds an internal note (visible only to team members, not sent to the platform).

```json
{
  "action": "add-note",
  "companyId": "uuid",
  "conversationId": "uuid",
  "content": "string"
}
```

Stored as `sender_type: 'system'`, `content_type: 'note'`, `is_internal_note: true`.

##### `search`

Full-text search across messages.

```json
{
  "action": "search",
  "companyId": "uuid",
  "query": "string - websearch query"
}
```

Response: `{ "success": true, "results": [...] }` -- up to 50 results, includes nested conversation and contact.

##### `list-labels` / `create-label`

```json
{
  "action": "create-label",
  "companyId": "uuid",
  "name": "string",
  "color": "string (optional, default '#6c7bf0')"
}
```

##### `list-canned-replies` / `create-canned-reply` / `update-canned-reply` / `delete-canned-reply`

```json
{
  "action": "create-canned-reply",
  "companyId": "uuid",
  "title": "string",
  "content": "string - supports {{contact_name}} placeholder",
  "shortcut": "string (optional)",
  "platform": "string (optional) - filter by platform"
}
```

##### `list-auto-rules` / `create-auto-rule` / `update-auto-rule` / `delete-auto-rule`

```json
{
  "action": "create-auto-rule",
  "companyId": "uuid",
  "name": "string",
  "enabled": "boolean (default true)",
  "trigger_type": "all_new | keyword | regex | sentiment | message_type | editorial_value | language | repeat_contact | after_hours",
  "trigger_value": "string (optional) - depends on trigger_type",
  "trigger_platform": "string (optional) - filter to one platform",
  "trigger_conversation_type": "string (optional) - dm | comment | review",
  "action_type": "canned_reply | ai_response | acknowledge | notify_editor | hide_comment",
  "canned_reply_id": "uuid (optional) - for canned_reply action",
  "ai_prompt_template": "string (optional) - for ai_response action"
}
```

**Trigger types:**

| Type | `trigger_value` format | Description |
|------|----------------------|-------------|
| `all_new` | -- | Matches all new contact messages |
| `keyword` | `"word1, word2"` | Comma-separated keywords (case-insensitive substring match) |
| `regex` | `"pattern"` | Regular expression (max 200 chars, tested on first 2000 chars of content) |
| `sentiment` | `"negative"` | Matches AI-classified sentiment |
| `message_type` | `"category"` or `"category:subcategory"` | Matches AI classification |
| `editorial_value` | `">=4"` | Threshold comparison on editorial value (1-5) |
| `language` | `"es"` | Matches detected language code |
| `repeat_contact` | -- | Contact has 2+ conversations with the company |
| `after_hours` | -- | Uses `after_hours_config` on the rule: `{ timezone, start_hour, end_hour }` |

**Action types:**

| Type | Description |
|------|-------------|
| `canned_reply` | Sends the linked canned reply (with `{{contact_name}}` substitution) |
| `ai_response` | Generates a reply using Gemini with the `ai_prompt_template` |
| `acknowledge` | Sends a localized acknowledgment message (7 languages) |
| `notify_editor` | Sends in-app (and optionally email) notifications to specified users |
| `hide_comment` | Hides the comment via GetLate API (comments only) |

#### Error Responses

- 400: `{ "success": false, "error": "Unknown action: ..." }` or missing required parameter
- 401/403: Authorization errors (see common auth errors above)
- 500: `{ "success": false, "error": "..." }`

#### Notes

- All write operations verify that the target conversation/label belongs to the specified `companyId` before proceeding.
- Reply operations resolve the GetLate `accountId` from `inbox_conversations.metadata`. If not cached, they fall back to a live API lookup and cache the result.
- GetLate uses the field name `message` (not `text` or `content`) for reply content in its API.
- All actions are logged to `api_call_logs` with timing and success/failure status.

---

### inbox-ai

**Purpose:** AI-powered analysis of inbox conversations using Gemini. Provides sentiment analysis, reply suggestions, thread summarization, classification, translation, crisis detection, and content recycling recommendations.

**Auth:** JWT required. User must be a member of the specified company (any role).

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/inbox-ai`

#### Common Request Shape

```json
{
  "action": "string - the action name",
  "companyId": "uuid"
}
```

#### Actions

##### `analyze-sentiment`

```json
{
  "action": "analyze-sentiment",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response:

```json
{
  "success": true,
  "analysis": {
    "sentiment": "positive | neutral | negative",
    "confidence": 0.85,
    "topics": ["customer service", "pricing"]
  }
}
```

Side effects: Updates `inbox_conversations.sentiment`. Persists result to `inbox_ai_results` (type `sentiment`).

##### `suggest-reply`

```json
{
  "action": "suggest-reply",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response:

```json
{
  "success": true,
  "suggestions": [
    { "tone": "formal", "content": "...", "label": "Professional response" },
    { "tone": "casual", "content": "...", "label": "Friendly reply" },
    { "tone": "brief", "content": "...", "label": "Quick answer" }
  ]
}
```

##### `suggest-reply-v2`

Enhanced version that is type-aware, article-aware, and fuses canned replies.

```json
{
  "action": "suggest-reply-v2",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response:

```json
{
  "success": true,
  "recommended": {
    "content": "...",
    "label": "Best match",
    "reasoning": "This matches the editorial tone of the conversation."
  },
  "alternatives": [
    { "content": "...", "label": "Shorter version" },
    { "content": "...", "label": "More detailed" }
  ],
  "language": "es",
  "fused_from_canned": true
}
```

Persists result to `inbox_ai_results` (type `suggestions`). Increments AI call counter.

##### `summarize-thread`

```json
{
  "action": "summarize-thread",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response:

```json
{
  "success": true,
  "summary": "The customer asked about pricing for the enterprise plan and expressed interest in a demo..."
}
```

Persists result to `inbox_ai_results` (type `summary`).

##### `classify`

Classifies a conversation into category/subcategory, editorial value (1-5), sentiment, and language.

```json
{
  "action": "classify",
  "companyId": "uuid",
  "conversationId": "uuid"
}
```

Response: The classification result (shape depends on `_shared/classify.ts`). Increments AI call counter.

##### `translate`

```json
{
  "action": "translate",
  "companyId": "uuid",
  "conversationId": "uuid (optional)",
  "messageId": "uuid (optional) - fetches content from this message if content is not provided",
  "content": "string (optional) - direct text to translate",
  "targetLanguage": "string - e.g. 'en', 'Spanish'"
}
```

Response:

```json
{
  "success": true,
  "translated": "We have received your message...",
  "targetLanguage": "en"
}
```

Persists to `inbox_ai_results` (type `translation`) if `conversationId` is provided. Increments AI call counter.

##### `crisis-check`

Detects potential PR crises by analyzing negative sentiment concentration.

```json
{
  "action": "crisis-check",
  "companyId": "uuid"
}
```

Response (no crisis):

```json
{
  "success": true,
  "crisis": false,
  "negativeCount": 2,
  "threshold": 5
}
```

Response (crisis detected):

```json
{
  "success": true,
  "crisis": true,
  "event": {
    "id": "uuid",
    "severity": "warning | critical",
    "negative_count": 8,
    "threshold": 5,
    "topics": ["article takedown", "factual error"],
    "summary": "8 negative messages in the last 30 minutes regarding a factual error in the published article."
  },
  "topics": ["article takedown", "factual error"],
  "summary": "..."
}
```

Reads settings from `inbox_ai_settings` (`crisis_detection`, `crisis_threshold`, `crisis_window_minutes`). Creates `inbox_crisis_events` records. Deduplicates against active crises in the same time window.

##### `save-feedback`

Records human corrections to AI classifications (feedback loop for improving accuracy).

```json
{
  "action": "save-feedback",
  "companyId": "uuid",
  "conversationId": "uuid",
  "feedbackType": "classification | editorial_value | sentiment",
  "originalValue": { "category": "community", "subcategory": "praise" },
  "correctedValue": { "category": "editorial", "subcategory": "story_lead" }
}
```

Response: `{ "success": true, "feedback": { ... } }`

Side effects: Inserts into `inbox_ai_feedback` and applies the correction directly to the conversation record.

#### Error Responses

- 400: `{ "success": false, "error": "Unknown action: ..." }`
- 500: `{ "success": false, "error": "GEMINI_API_KEY not configured" }` or other internal error
- 401/403: Authorization errors

#### Notes

- All AI actions use **Gemini 3.1 Flash Lite Preview** (`gemini-3.1-flash-lite-preview`).
- AI call counts are tracked in `inbox_ai_settings.ai_calls_count` (best-effort, non-atomic).
- All actions are logged to `api_call_logs` with timing.

---

### inbox-backfill

**Purpose:** Bulk AI classification of all unclassified conversations for a company. Uses self-chaining to process batches without hitting the edge function timeout. Generates an audit report upon completion.

**Auth:** JWT required for initial invocation (any company member). Self-chain continuations use service role.

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/inbox-backfill`

#### Request (initial)

```json
{
  "companyId": "uuid"
}
```

#### Response (initial)

```json
{
  "success": true,
  "jobId": "uuid",
  "totalConversations": 150
}
```

If a backfill is already running:

```json
{
  "success": true,
  "message": "Backfill already in progress",
  "jobId": "uuid"
}
```

#### Request (self-chain continuation -- internal)

```json
{
  "companyId": "uuid",
  "jobId": "uuid",
  "cursor": 20
}
```

#### Response (continuation)

```json
{
  "success": true,
  "classified": 10,
  "nextCursor": 30
}
```

#### Error Responses

- 400: `{ "error": "companyId required" }`
- 500: `{ "error": "No API key" }` -- `GEMINI_API_KEY` not configured

#### Notes

- **Batch size:** 10 conversations per self-chain invocation with 500ms throttle between classifications.
- **Safety guard:** Stops after 5,000 conversations (`MAX_CURSOR`) to prevent infinite self-chaining.
- **Job tracking:** Progress is tracked in `inbox_backfill_jobs` table (status, classified count, report data).
- **Audit report:** On completion, generates a Gemini-powered social intelligence audit report with audience profile, editorial intelligence, content performance, and recommendations. Stored in `inbox_backfill_jobs.report_data`.

---

### inbox-historical-sync

**Purpose:** Full historical import of all DMs and comments from GetLate. Self-chains through paginated API responses, processing one page per invocation.

**Auth:** Service role accepted for both initial and continuation calls (via `allowServiceRole: true`).

**Method:** POST

**URL:** `{SUPABASE_URL}/functions/v1/inbox-historical-sync`

#### Request (initial)

```json
{
  "companyId": "uuid"
}
```

#### Response (initial)

```json
{
  "success": true,
  "jobId": "uuid"
}
```

If already running:

```json
{
  "success": true,
  "message": "Historical sync already in progress",
  "jobId": "uuid"
}
```

#### Request (self-chain continuation -- internal)

```json
{
  "companyId": "uuid",
  "jobId": "uuid",
  "cursorState": {
    "phase": "dms | comments | complete",
    "dmCursor": "string | null",
    "commentCursor": "string | null",
    "chainCount": 5
  }
}
```

#### Response (continuation)

```json
{
  "success": true,
  "phase": "dms",
  "chainCount": 6
}
```

#### Error Responses

- 400: `{ "error": "companyId required" }` or `{ "error": "Company not found or no GetLate profile linked" }`
- 500: Internal error

#### Notes

- **Two-phase import:** First imports all DMs (paginated), then all comments (paginated), then marks complete.
- **40-second deadline** per invocation (5s buffer for DB writes and self-chain fire).
- **Safety guard:** Max 500 self-chain invocations (`MAX_CHAIN_COUNT`).
- **200ms throttle** between conversations to avoid rate limiting GetLate.
- **Page size:** 50 items per API request.
- **On completion:** Updates `inbox_sync_state` for both DMs and comments so the incremental cron (`inbox-sync`) picks up from where the historical sync left off. Then fires `inbox-backfill` to classify all imported conversations.
- **Error resilience:** Single-page errors advance to the next phase rather than failing the entire job.
- **Job tracking:** Progress tracked in `inbox_backfill_jobs` with `job_type: 'historical_sync'` (fields: `synced_conversations`, `synced_messages`, `cursor_state`).

---

## Webhook Integration

### Registering a Webhook

Webhook registrations are stored in the `webhook_registrations` table:

| Column | Description |
|--------|-------------|
| `company_id` | Company UUID |
| `provider` | `'getlate'` |
| `secret` | HMAC-SHA256 shared secret |
| `is_active` | Boolean |
| `consecutive_failures` | Incremented on invalid signatures, reset on success |
| `last_success_at` | Timestamp |
| `last_failure_at` | Timestamp |

The webhook URL to register with GetLate is:

```
{SUPABASE_URL}/functions/v1/getlate-webhook
```

### Signature Verification

GetLate should sign the raw request body with HMAC-SHA256 using the shared secret and send it in one of these headers (checked in order):

1. `x-webhook-signature`
2. `x-getlate-signature`
3. `x-hub-signature-256`
4. `x-signature`

The signature may optionally be prefixed with `sha256=`. Constant-time comparison is used.

### Event Log

All webhook events are logged to `webhook_event_log` with:

- `provider`, `event_type`, `event_id`
- `payload` (full JSON)
- `processing_status`: `processed | skipped | failed`
- `error_message`, `duration_ms`

---

## Related

- **Shared modules:** `supabase/functions/_shared/inbox-processing.ts` (dedup logic), `_shared/classify.ts` (AI classification), `_shared/inbox-ai-helpers.ts` (Gemini call wrapper), `_shared/fetch-utils.ts` (retry logic), `_shared/cron-monitor.ts` (health tracking)
- **Auto-respond engine:** `supabase/functions/inbox-sync/auto-respond.ts`
- **Webhook utilities:** `supabase/functions/getlate-webhook/webhook-utils.ts`
- **Database tables:** `inbox_conversations`, `inbox_messages`, `inbox_contacts`, `inbox_labels`, `inbox_conversation_labels`, `inbox_canned_replies`, `inbox_auto_rules`, `inbox_ai_settings`, `inbox_ai_results`, `inbox_ai_feedback`, `inbox_crisis_events`, `inbox_read_status`, `inbox_sync_state`, `inbox_backfill_jobs`, `webhook_registrations`, `webhook_event_log`
- **Frontend hooks:** `src/hooks/useInbox*.ts`, `src/hooks/useGetlateInbox.ts`
