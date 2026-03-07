# ADR-001: GetLate as Social API Aggregator

**Status:** Accepted
**Date:** 2025 (original adoption)
**Last Updated:** 2026-03-07

## Context

Social Suite needs to publish content to, read analytics from, and manage conversations across 8+ social platforms (Facebook, Instagram, Twitter/X, LinkedIn, TikTok, Threads, Bluesky, Pinterest). Building and maintaining direct OAuth integrations with each platform is prohibitively expensive for a small team.

## Decision

Use [GetLate](https://getlate.dev) (`https://getlate.dev/api/v1`) as a unified social API aggregator. GetLate handles OAuth flows, token refresh, platform-specific content formatting, and rate limiting. We interact with a single API for all platforms.

## What GetLate Provides

- **OAuth connection management:** `GET/POST /connect/{platform}` + page/account selection flow
- **Multi-platform publishing:** `POST /posts` with per-platform content variants
- **Inbox (DMs, comments, reviews):** `/inbox/conversations`, `/inbox/comments`, `/inbox/reviews`
- **Analytics:** `/analytics` with per-post and per-account metrics
- **Account management:** `/accounts` (list, disconnect, follower stats)
- **Webhook events:** Real-time notifications for messages, comments, post failures, account disconnections
- **Content tools:** Validation endpoints, content decay analysis, best posting times

## The profileId / accountId Model

This is the most common source of bugs. Understanding the distinction is critical.

### profileId (Organization Level)

A **profile** is a GetLate concept that groups social accounts together. It maps 1:1 to a Social Suite company. Stored in `companies.getlate_profile_id`.

- Created via `POST /profiles` (one per company)
- Used as a query parameter on most read endpoints: `?profileId=...`
- Auto-created when a company first connects a social account (`getlate-connect` edge function)

### accountId (Social Account Level)

An **account** is a single connected social platform account (e.g., one Facebook Page, one Instagram Business account). Multiple accounts belong to one profile.

- Returned by `GET /accounts?profileId=...`
- Uses `_id` (not `id`) in API responses -- our code normalizes to `id`
- Required for DM message fetching: `GET /inbox/conversations/{id}/messages?accountId=...`
- Cached in `inbox_conversations.metadata.accountId` for reply operations

### Common Mistake

Passing `profileId` where `accountId` is expected (or vice versa). The API returns confusing errors when this happens. The `getlate-api-reviewer` agent watches for this.

## Our Edge Function Wrappers

Each GetLate API area has a corresponding edge function:

| Edge Function | GetLate Endpoints | File |
|---------------|-------------------|------|
| `getlate-connect` | `/connect/{platform}`, `/profiles` | `supabase/functions/getlate-connect/index.ts` |
| `getlate-accounts` | `/accounts` | `supabase/functions/getlate-accounts/index.ts` |
| `getlate-posts` | `/posts` | `supabase/functions/getlate-posts/index.ts` |
| `getlate-inbox` | `/inbox/conversations/{id}/messages`, reply | `supabase/functions/getlate-inbox/index.ts` |
| `getlate-analytics` | `/analytics` | `supabase/functions/getlate-analytics/index.ts` |
| `getlate-webhook` | Receives webhook events | `supabase/functions/getlate-webhook/index.ts` |
| `getlate-changelog-monitor` | `/changelog` | `supabase/functions/getlate-changelog-monitor/index.ts` |
| `getlate-changelog-action` | Processes changelog entries | `supabase/functions/getlate-changelog-action/index.ts` |

All edge functions use a single shared `GETLATE_API_KEY` (stored in Supabase Secrets). This is an account-level API key, not per-company.

## API Response Quirks

Discovered via contract tests (`scripts/getlate-contract-tests.cjs`):

1. **`_id` vs `id`:** Most responses use `_id` (MongoDB convention). Our code normalizes to `id`.
2. **`message` not `text`:** DM content field is `message`, not `text`. But comments use `text`.
3. **`followers_count` naming:** Varies between `followerCount`, `followersCount`, and `followers_count` depending on the endpoint and platform.
4. **HTML error pages:** Some error responses return HTML (not JSON). The `safeJsonParse()` helper in `getlate-accounts` and `getlate-connect` handles this.
5. **Pagination:** Cursor-based (`nextCursor`, `hasMore`), not offset-based. Different endpoints use different field names for the cursor.

## Changelog Monitoring

GetLate publishes API changes. We monitor them automatically:

- `getlate-changelog-monitor` edge function runs daily (9 AM via cron dispatcher)
- Tracks changes in `docs/getlate/changelog-tracker.md`
- Classifies changes as "should-adopt", "nice-to-have", or "not relevant"
- The `getlate-api-reviewer` agent validates code against known API patterns

## Limitations

1. **Single API key:** All companies share one GetLate API key. Rate limits are account-level.
2. **Platform coverage gaps:** Not all platform features are exposed (e.g., Instagram Reels advanced settings, LinkedIn document posts).
3. **Webhook reliability:** GetLate auto-disables webhooks after 10 consecutive non-200 responses. Our webhook receiver returns 200 even on internal errors to prevent this.
4. **Analytics lag:** Post metrics may be delayed. GetLate syncs from platforms on their own schedule.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Direct platform APIs | Too many OAuth flows to maintain. Each platform has different auth models, rate limits, and content rules. |
| Ayrshare | Less mature inbox/conversation API at the time of evaluation. |
| Buffer API | No inbox/messaging support. Publishing-only. |
| Hootsuite API | Enterprise pricing, complex approval process for API access. |

## Related Files

- `scripts/getlate-contract-tests.cjs` -- contract tests against live API
- `docs/getlate/changelog-tracker.md` -- tracked API changes
- `.claude/agents/getlate-api-reviewer.md` -- code review agent for GetLate patterns
- `.claude/skills/inbox-debug/SKILL.md` -- debugging guide for inbox pipeline issues
