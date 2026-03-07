# Inbox Pipeline

## Overview

The inbox system aggregates comments, DMs, and reviews from all connected social platforms into a unified Supabase-backed data model. It uses a dual ingestion architecture (polling + webhooks) with shared deduplication logic, and layers AI classification, auto-respond rules, and crisis detection on top.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| inbox-sync | `supabase/functions/inbox-sync/index.ts` | Cron-triggered polling. Syncs comments, DMs, and reviews from GetLate for one company per invocation |
| getlate-webhook | `supabase/functions/getlate-webhook/index.ts` | Real-time webhook receiver. HMAC-verified, idempotent event processing |
| inbox-ai | `supabase/functions/inbox-ai/index.ts` | User-triggered AI: sentiment analysis, reply suggestions, classification, translation, crisis detection, content recycling |
| inbox-processing | `supabase/functions/_shared/inbox-processing.ts` | Shared module: contact upsert, conversation upsert, message dedup, article linking |
| auto-respond | `supabase/functions/inbox-sync/auto-respond.ts` | Rule-based auto-response engine: keyword/regex/sentiment triggers, canned replies, AI responses, notifications |
| classify | `supabase/functions/_shared/classify.ts` | AI classification of conversations (message type, editorial value, sentiment) |
| webhook-utils | `supabase/functions/getlate-webhook/webhook-utils.ts` | HMAC verification, payload normalization, event routing |

## Data Flow

### Dual Ingestion Model

```
GetLate Platform
     |
     +--[webhook]--> getlate-webhook --+
     |                                  |
     +--[polling]--> inbox-sync -------+
                                        |
                                        v
                           inbox-processing.ts
                           (shared dedup logic)
                                        |
                          +-------------+-------------+
                          |             |             |
                          v             v             v
                   inbox_contacts  inbox_conversations  inbox_messages
                                        |
                                        v
                              auto-respond engine
                              (if rules match)
                                        |
                                        v
                              AI classification
                              (if auto_classify enabled)
```

### Polling Path (inbox-sync)

1. `pg_cron` fires `cron-dispatcher` every 15 minutes
2. Dispatcher queries companies with `getlate_profile_id` and fires one HTTP request per company to `inbox-sync`
3. `inbox-sync` receives `{ companyId }`, creates a `CronMonitor` instance
4. Syncs three data types sequentially (with deadline guard at 45s):
   - **Comments**: Fetches posts with comments, then paginated comments per post
   - **DMs**: Fetches conversations list, then paginated messages per conversation
   - **Reviews**: Fetches reviews (skips if 403 / addon not enabled)
5. For each item, calls shared `inbox-processing.ts` functions:
   - `upsertContact()` -- create or update contact by platform + platform_user_id
   - `upsertConversation()` -- create or update conversation by platform_conversation_id
   - `insertMessageIfNew()` -- dedup by platform_message_id + conversation_id + company_id
6. After inserting a new message, calls `checkAndAutoRespond()` for rule matching
7. After all sync types, runs auto-classification on up to 10 unclassified conversations (if `auto_classify` is enabled in `inbox_ai_settings`)
8. Persists cursor position to `inbox_sync_state` for resume on next run

### Webhook Path (getlate-webhook)

1. GetLate sends POST with event payload and HMAC signature header
2. Raw body is read before parsing (needed for HMAC verification)
3. Company is resolved via `profileId` in payload or by trying all active webhook secrets
4. HMAC-SHA256 signature is verified against stored secret in `webhook_registrations`
5. Idempotency check: looks up `event_id` in `webhook_event_log`
6. Timestamp replay protection: rejects events older than a threshold
7. Event is routed to a handler based on event type:
   - `handleMessageReceived` -- DM messages
   - `handleCommentReceived` -- Comment on a post
   - `handlePostFailed` / `handlePostPartial` -- Post publishing failures
   - `handleAccountDisconnected` -- Account disconnection
8. Handlers call the same `inbox-processing.ts` functions for identical dedup logic
9. On success, resets `consecutive_failures` counter on webhook registration
10. **Always returns 200** (even on internal errors) to prevent GetLate's auto-disable after 10 consecutive failures

## Message Deduplication

The `insertMessageIfNew()` function in `inbox-processing.ts` handles dedup:

1. Checks for existing message by `(platform_message_id, conversation_id, company_id)`
2. If found, returns `{ inserted: false }` (no-op)
3. If not found, inserts the message
4. Handles race conditions: catches unique constraint violation (`error.code === '23505'`) and returns `{ inserted: false }`
5. A unique index `idx_inbox_msg_dedup` on `(platform_message_id, conversation_id)` provides DB-level dedup safety

## AI Classification Pipeline

### Auto-classification (during sync)

1. After syncing messages, `inbox-sync` checks `inbox_ai_settings.auto_classify` for the company
2. Fetches up to 10 conversations where `ai_classified_at IS NULL`
3. Calls `classifyConversation()` from `_shared/classify.ts`
4. On Gemini failure, sets fallback classification via `setFallbackClassification()`
5. Increments `ai_calls_count` in `inbox_ai_settings` (best-effort, non-atomic)

### On-demand classification (webhook path)

The webhook handler calls `maybeClassify()` after inserting a new contact message, which follows the same pattern but for a single conversation.

### User-triggered AI (inbox-ai)

The `inbox-ai` edge function supports these actions:

| Action | What it does |
|--------|-------------|
| `analyze-sentiment` | Sentiment analysis on contact messages; persists to `inbox_conversations.sentiment` and `inbox_ai_results` |
| `suggest-reply` | 3 reply suggestions (formal/casual/brief) |
| `suggest-reply-v2` | Context-aware suggestions using canned replies, article context, classification, and language detection |
| `summarize-thread` | 2-4 sentence thread summary |
| `classify` | Message type + editorial value classification |
| `translate` | Translate message content to target language |
| `crisis-check` | Detect crisis: count negative-sentiment conversations in time window, cluster topics via Gemini |
| `content-recycle-check` | Find high-engagement articles worth resharing |
| `save-feedback` | Human correction of AI classifications (feeds back into conversation data) |

## Auto-Respond Engine

`auto-respond.ts` evaluates rules from `inbox_auto_rules` against each new contact message:

### Trigger Types

| Trigger | How it matches |
|---------|---------------|
| `all_new` | Every new contact message |
| `keyword` | Comma-separated keywords, case-insensitive substring match |
| `regex` | Regex match on message content (capped at 200 chars pattern, 2000 chars content) |
| `sentiment` | Matches AI-classified sentiment on the conversation |
| `message_type` | Matches AI classification category (supports `category:subcategory` format) |
| `editorial_value` | Threshold comparison (e.g., `>=4`) on conversation editorial value |
| `language` | Matches detected language |
| `repeat_contact` | Fires if the contact has 2+ conversations (requires DB query) |
| `after_hours` | Fires outside configured business hours (timezone-aware) |

### Action Types

| Action | Behavior |
|--------|----------|
| `canned_reply` | Sends a canned reply (with `{{contact_name}}` interpolation) |
| `ai_response` | Generates a reply via Gemini using the rule's prompt template |
| `acknowledge` | Sends a language-aware acknowledgment template |
| `notify_editor` | Creates in-app notification + optional email via Resend |
| `hide_comment` | Hides the comment via GetLate API |

### Response delivery

Auto-responses are sent via GetLate API:
- **DMs**: POST to `/inbox/conversations/{id}/messages` with `{ accountId, message }`
- **Comments**: POST to `/inbox/comments/reply` with `{ accountId, postId, message }`

The `accountId` is cached in `inbox_conversations.metadata` during sync (critical -- without it, replies cannot be sent).

## Crisis Detection

1. Checks `inbox_ai_settings.crisis_detection` flag
2. Counts negative-sentiment conversations within `crisis_window_minutes`
3. If count exceeds `crisis_threshold`, checks for existing active crisis to avoid duplicates
4. Uses Gemini to cluster topics from message previews
5. Creates an `inbox_crisis_events` record with severity (warning/critical), topics, and summary

## Key Tables

| Table | Purpose |
|-------|---------|
| `inbox_contacts` | Platform users who sent messages (deduped by platform + platform_user_id) |
| `inbox_conversations` | Threads: DMs, comment threads, reviews. Keyed by `platform_conversation_id` |
| `inbox_messages` | Individual messages within conversations |
| `inbox_sync_state` | Cursor + last_synced_at per company per sync_type |
| `inbox_ai_settings` | Per-company AI config: auto_classify, crisis detection thresholds |
| `inbox_ai_results` | Persisted AI outputs (sentiment, summaries, suggestions) |
| `inbox_ai_feedback` | Human corrections to AI classifications |
| `inbox_auto_rules` | Auto-response rule definitions |
| `inbox_canned_replies` | Template responses for rules and manual use |
| `inbox_crisis_events` | Detected crisis events with topics and samples |
| `webhook_registrations` | Registered webhooks with HMAC secrets |
| `webhook_event_log` | Raw event log for debugging and idempotency |

## Gotchas

- **Always return 200 from webhook handler**: GetLate auto-disables webhooks after 10 consecutive non-200 responses. Even internal errors return 200 with `{ success: false }`.
- **`accountId` must be cached in conversation metadata**: Without it, auto-respond and manual reply cannot send messages. Both sync and webhook paths cache it during conversation upsert.
- **GetLate uses `message` not `text`**: The reply API expects `{ message: content }`, not `{ text: content }`.
- **`profileId` != `accountId`**: `profileId` is the organization-level identifier in GetLate. `accountId` is per-social-account. Confusing them breaks API calls.
- **Deadline guard at 45s**: `inbox-sync` uses a `pastDeadline()` check before every network call. Supabase edge functions timeout at ~60s (free) or ~150s (pro).
- **Cursor-based pagination**: Both comments and DMs use cursor pagination. Cursors are persisted to `inbox_sync_state` so the next cron run resumes where the last one stopped.
- **Reviews return 403 if addon not enabled**: This is not an error -- the sync function handles it gracefully and skips reviews.
- **Race condition in message dedup**: Two paths (polling + webhook) can try to insert the same message simultaneously. The unique index `idx_inbox_msg_dedup` and the `23505` error handler in `insertMessageIfNew()` prevent duplicates.

For endpoint details (request/response shapes), see `docs/api/inbox-api.md`.
