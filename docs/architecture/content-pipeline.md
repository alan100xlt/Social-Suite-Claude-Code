# Content Pipeline

## Overview

The content pipeline transforms RSS feed articles into published social media posts across multiple platforms. It is the core automated workflow of Social Suite: discover content sources, ingest articles, apply automation rules, generate AI-tailored posts per platform, route through approval or auto-publish, and deliver via the GetLate publishing API.

The pipeline operates in two modes:

1. **Automated (cron-driven)** -- A pg_cron job fires every 5 minutes, polling all active feeds and triggering automation rules for new articles without human intervention.
2. **Manual (user-driven)** -- A user selects an article (or writes from scratch) in the Compose UI, walks through a strategy/generation/review wizard, and publishes or schedules directly.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| RSS feed discovery | `supabase/functions/discover-rss-feeds/index.ts` | Probes a URL for RSS/Atom/JSON feeds via HTML link tags, common paths, and subdomains |
| RSS poller | `supabase/functions/rss-poll/index.ts` | Fetches RSS XML, parses items, downloads images, crawls thin articles via Firecrawl, upserts journalist records, inserts new `rss_feed_items`, triggers automation rules |
| AI post generator | `supabase/functions/generate-social-post/index.ts` | Three modes (`strategy`, `posts`, `compliance`) powered by Gemini. Applies brand voice settings and platform-specific rules |
| OG image generator | `supabase/functions/og-image-generator/` | Generates branded OG images for feed items (fire-and-forget from rss-poll) |
| GetLate publisher | `supabase/functions/getlate-posts/index.ts` | Proxies create/update/delete/unpublish calls to the GetLate API (`https://getlate.dev/api/v1`) |
| Shared auth | `supabase/functions/_shared/authorize.ts` | Central RBAC: validates JWT or service-role token, checks company membership and roles |
| Cron monitor | `supabase/functions/_shared/cron-monitor.ts` | Logs cron runs to `cron_health_logs`, sends Slack alerts on failure |
| Content workflow FSM | `src/lib/content-workflow.ts` | Defines valid status transitions for drafts: `draft -> awaiting_approval -> approved -> scheduled -> published -> pulled -> archived` |
| Feed management hooks | `src/hooks/useRssFeeds.ts` | CRUD for `rss_feeds` table + manual poll trigger |
| Article list hook | `src/hooks/useRssArticles.ts` | Manual poll mutation (`usePollRssFeed`) invoking the `rss-poll` edge function |
| Automation rules hooks | `src/hooks/useAutomationRules.ts` | CRUD for `automation_rules` table |
| Draft management hooks | `src/hooks/usePostDrafts.ts` | CRUD for `post_drafts`, plus workflow mutations (submit, approve, reject, pull, assign) |
| AI generation hook | `src/hooks/useGenerateSocialPost.ts` | Client-side wrapper for the three `generate-social-post` modes |
| Publishing hooks | `src/hooks/useGetLatePosts.ts` | Create, update, delete, unpublish, validate posts via GetLate |
| Compose UI | `src/components/posts/ComposeTab.tsx` | Multi-step wizard: source selection, account picker, strategy generation, post editing, review, publish |
| Drafts UI | `src/components/posts/DraftsTab.tsx` | Lists and manages saved drafts |
| Feeds UI | `src/components/content/FeedsTab.tsx` | Feed management: add/edit/delete feeds, view items |
| Automations UI | `src/components/content/AutomationsContent.tsx` | Rule management: create/edit/toggle automation rules |
| Automation logs UI | `src/components/content/AutomationLogsContent.tsx` | View automation execution history |
| Article pipeline UI | `src/components/content/pipeline/ArticlePipeline.tsx` | Visual pipeline of articles flowing through the system |

## Data Flow

```
                                    ┌─────────────────────┐
                                    │  discover-rss-feeds  │
                                    │  (user provides URL) │
                                    └──────────┬──────────┘
                                               │ saves to
                                               v
┌──────────┐   pg_cron (5 min)    ┌────────────────────┐
│ RSS Feed │ ──────────────────>  │     rss-poll        │
│ (remote) │                      │  edge function      │
└──────────┘                      └──┬──────┬──────┬───┘
                                     │      │      │
                          parses XML │      │      │ fire-and-forget
                                     │      │      v
                                     │      │  ┌──────────────────┐
                                     │      │  │ og-image-generator│
                                     │      │  └──────────────────┘
                                     │      │
                    inserts items    │      │ if enable_scraping or thin content
                                     │      v
                                     │  ┌───────────────────┐
                                     │  │ Firecrawl scrape   │
                                     │  │ + Gemini extraction│
                                     │  └───────────────────┘
                                     v
                            ┌─────────────────┐
                            │ rss_feed_items   │
                            │ status: pending  │
                            └────────┬────────┘
                                     │ if new items exist
                                     v
                        ┌─────────────────────────┐
                        │ processAutomationRules() │
                        │ (inside rss-poll)        │
                        └────────┬────────────────┘
                                 │ for each matching rule
                                 v
                   ┌──────────────────────────┐
                   │  generate-social-post     │
                   │  mode=strategy, then      │
                   │  mode=posts               │
                   └────────────┬─────────────┘
                                │
               ┌────────────────┼────────────────┐
               v                v                v
         action=draft    action=send_approval  action=publish
               │                │                │
               v                v                v
        ┌────────────┐  ┌──────────────┐  ┌────────────────┐
        │ post_drafts │  │post_approvals│  │ getlate-posts  │
        │ table       │  │+ Resend email│  │ edge function  │
        └────────────┘  └──────┬───────┘  └───────┬────────┘
                               │                   │
                               v                   v
                        ┌──────────────┐    ┌──────────────┐
                        │ /approve/:tok│    │ GetLate API   │
                        │ external page│    │ (publishing)  │
                        └──────────────┘    └──────────────┘
```

### Step 1: RSS Feed Discovery and Registration

A user provides a website URL. The `discover-rss-feeds` edge function probes for feeds by:
- Parsing `<link rel="alternate">` tags in the HTML
- Trying ~40 common feed paths (`/feed`, `/rss.xml`, `/blog/feed`, etc.)
- Checking content subdomains (`blog.`, `news.`, `feed.`)

Found feeds are scored and returned. The user selects one, which creates a row in `rss_feeds` via the `useCreateRssFeed` hook.

**Key file:** `supabase/functions/discover-rss-feeds/index.ts`

### Step 2: RSS Polling and Article Ingestion

The `rss-poll` edge function runs every 5 minutes via pg_cron (`rss-poll-every-5-min`). It can also be triggered manually from the UI.

For each active feed:
1. Fetches the RSS XML (always does a full fetch -- conditional requests via ETag/Last-Modified are stored but not used for request headers, because many servers return incorrect 304s)
2. Parses items using regex-based XML parsing (not a DOM parser)
3. Deduplicates by `guid` against existing `rss_feed_items`
4. For each new item:
   - Extracts images from `<media:content>`, `<enclosure>`, `<image>`, or `<img>` tags in description
   - Downloads images and uploads to Supabase Storage (`post-images` bucket); converts WebP to JPEG using ImageMagick WASM
   - Extracts author/byline from `<dc:creator>`, `<author>`, or `<itunes:author>` and upserts into `journalists` table
   - If `enable_scraping` is on or the description is thin (<100 chars), crawls the full article via Firecrawl and cleans it with Gemini (`gemini-3.1-flash-lite-preview`)
5. Inserts all new items into `rss_feed_items` with `status = 'pending'`
6. Fire-and-forget calls to `og-image-generator` for each new item
7. Updates `last_polled_at`, `etag`, and `last_modified` on the feed record

**Key file:** `supabase/functions/rss-poll/index.ts`

### Step 3: Automation Rules

After new items are inserted, `processAutomationRules()` runs inline within the rss-poll function (not a separate edge function, despite what the feature doc suggests).

It queries `automation_rules` for active rules matching the feed's `company_id` and either the specific `feed_id` or `feed_id IS NULL` (matches all feeds).

Each rule specifies:
- `objective`: `reach`, `engagement`, `clicks`, or `auto` (defaults to `reach`)
- `action`: `draft`, `send_approval`, or `publish`
- `account_ids`: target social accounts (can be dummy IDs like `dummy-twitter` for testing)
- `approval_emails`: recipients for approval action
- `feed_id`: optional, scopes rule to a specific feed

Account IDs are resolved to platform names via the `getlate-accounts` edge function (or a hardcoded dummy map for test accounts).

**Key file:** `supabase/functions/rss-poll/index.ts` (lines 707-864), `src/hooks/useAutomationRules.ts`

### Step 4: AI Post Generation

The `generate-social-post` edge function uses the Gemini API (`gemini-3.1-flash-lite-preview`) via the OpenAI-compatible endpoint. It has three modes:

**Mode: `strategy`**
- Input: article title, description, full content, objective, target platforms
- Output: structured strategy with article summary, post approach, objective/CTA
- Supports iterative refinement via `chatMessages` (conversation history)

**Mode: `posts`**
- Input: article data + approved strategy + platforms
- Output: platform-specific post content (one per platform)
- Uses Gemini tool calling (`generate_platform_posts` function) to get structured JSON output
- Enforces platform-specific rules (character limits, hashtag counts, tone):
  - Twitter: 280 chars total including URLs
  - Bluesky: 300 chars
  - LinkedIn: 3000 chars, professional tone
  - Facebook: conversational, <500 chars preferred
  - Instagram: 2200 chars, hashtag-rich, no clickable links
  - TikTok: 2200 chars, trendy/casual
  - Threads: 500 chars
  - Pinterest: 500 chars, keyword-rich

**Mode: `compliance`**
- Input: generated posts
- Output: posts checked and fixed for platform rule violations

**Brand Voice Integration:**
The function resolves voice settings from `company_voice_settings` or `global_voice_defaults`. Voice dimensions:
- **Tone**: neutral, friendly, urgent, engagement
- **Content length**: headline, bullets, standard, full
- **Emoji style**: none, minimalist, contextual, heavy
- **Hashtag strategy**: none, smart, brand_only, smart_and_brand
- **AI autonomy modes**: `custom_dynamic_ai` (60% confidence to deviate), `custom_strict_ai` (90%), `ai_decides` (full autonomy)

All AI calls are logged to `api_call_logs` with token usage and estimated cost.

**Key file:** `supabase/functions/generate-social-post/index.ts`

### Step 5: Draft Review and Approval

Depending on the automation rule's `action`, three paths exist:

**`draft`** -- Creates a row in `post_drafts` with `status = 'draft'` and `compose_phase = 'review'`. The draft includes the strategy, platform-specific contents, image URL, and account IDs. The user reviews and publishes manually from the Compose UI.

**`send_approval`** -- Creates a `post_approvals` record with a unique token. Sends an HTML email via Resend containing a preview of all platform posts and a link to `/approve/:token`. The approver can approve or reject without logging in.

**`publish`** -- Skips review entirely and publishes immediately (see Step 6).

For manual drafts, the content workflow follows this state machine:

```
draft -> awaiting_approval -> approved -> scheduled -> published -> pulled -> archived
                           -> rejected -> draft (back to editing)
```

Transitions are enforced by `canTransition()` in `src/lib/content-workflow.ts`. The `useSubmitForApproval`, `useApproveContent`, `useRejectContent`, and `usePullContent` hooks handle each transition and send in-app notifications.

**Key files:** `src/hooks/usePostDrafts.ts`, `src/lib/content-workflow.ts`

### Step 6: Publishing

Publishing goes through the `getlate-posts` edge function, which proxies to the GetLate API (`https://getlate.dev/api/v1`).

For automated publishing (via automation rules), the rss-poll function:
1. Resolves the company's `getlate_profile_id`
2. Builds per-account payloads with platform-specific content from the AI generation step
3. Calls `getlate-posts` with `publishNow: true`
4. Marks the `rss_feed_item` as `status = 'posted'` with `processed_at` timestamp

For manual publishing (via Compose UI), the `useCreatePost` hook calls the same edge function with account IDs, content, optional media items, and optional `scheduledFor` timestamp.

The edge function handles partial failures gracefully -- if some platforms succeed and others fail, it returns `isPartial: true` with per-platform results.

**Key files:** `supabase/functions/getlate-posts/index.ts`, `src/hooks/useGetLatePosts.ts`

## Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `rss_feeds` | Registered RSS feed sources per company | `company_id`, `url`, `is_active`, `enable_scraping`, `last_polled_at`, `etag`, `last_modified` |
| `rss_feed_items` | Individual articles from feeds | `feed_id`, `guid`, `title`, `link`, `description`, `full_content`, `image_url`, `status` (pending/posted/failed/skipped), `byline`, `journalist_id`, `og_image_url`, `content_classification` |
| `journalists` | Extracted article authors, deduped by company+name | `company_id`, `name` |
| `automation_rules` | Rules linking feeds to post generation actions | `company_id`, `feed_id`, `objective`, `action` (draft/send_approval/publish), `account_ids`, `approval_emails`, `is_active` |
| `automation_logs` | Execution history for automation runs | `company_id`, `rule_id`, `feed_item_id`, `action`, `result` (success/error/skipped), `error_message`, `details` |
| `post_drafts` | Saved post drafts with workflow state | `company_id`, `created_by`, `status` (ContentStatus FSM), `platform_contents`, `strategy`, `selected_account_ids`, `assigned_to`, `reviewer_id`, `approved_by` |
| `post_approvals` | Token-based external approval records | `company_id`, `token`, `recipient_email`, `platform_contents`, `article_title` |
| `company_voice_settings` | Brand voice configuration per company | `company_id`, `tone`, `emoji_style`, `hashtag_strategy`, `content_length`, `voice_mode`, `brand_tags` |
| `global_voice_defaults` | System-wide default voice settings | Same columns as company voice, used when `voice_mode = 'default'` |
| `api_call_logs` | All edge function API calls with timing and cost | `function_name`, `action`, `duration_ms`, `success`, `token_usage`, `estimated_cost_usd` |
| `cron_health_logs` | Cron job execution monitoring | `job_name`, `status`, `started_at`, `completed_at`, `duration_ms`, `error_message` |

### Table Relationships

```
rss_feeds (1) ──< rss_feed_items (N)
rss_feeds (1) ──< automation_rules (N)  [via feed_id, nullable]
rss_feed_items (1) ──< automation_logs (N)  [via feed_item_id]
automation_rules (1) ──< automation_logs (N)  [via rule_id]
companies (1) ──< rss_feeds (N)
companies (1) ──< automation_rules (N)
companies (1) ──< post_drafts (N)
companies (1) ──< post_approvals (N)
companies (1) ──1 company_voice_settings
rss_feed_items (N) >──1 journalists  [via journalist_id]
```

## Edge Functions

### `rss-poll`
- **Trigger:** pg_cron every 5 minutes, or manual invocation from UI
- **Auth:** Service role (cron) or valid JWT
- **Input:** Optional `{ feedId, backfillImages }` -- if no feedId, polls all active feeds
- **External calls:** RSS feed URLs, Firecrawl API (scraping), Gemini API (content extraction), og-image-generator (fire-and-forget), generate-social-post (if automation rules match), getlate-posts (if action=publish)
- **Monitoring:** Logs to `cron_health_logs` via `CronMonitor`, Slack alerts on failure

### `generate-social-post`
- **Trigger:** Called by rss-poll automation or directly from ComposeTab UI
- **Auth:** JWT (optional -- allows anonymous for onboarding samples), service role
- **Input:** `{ mode, title, description, link, fullContent, objective, platforms, approvedStrategy, companyId, voiceSettings }`
- **External calls:** Gemini API (`gemini-3.1-flash-lite-preview`) via OpenAI-compatible endpoint
- **Cost tracking:** Token usage extracted and logged to `api_call_logs` with cost estimate ($0.075/M input, $0.30/M output)

### `discover-rss-feeds`
- **Trigger:** User provides a URL in the Discover flow
- **Auth:** Not required (public)
- **Input:** `{ url }`
- **Output:** Scored list of discovered feeds with metadata

### `getlate-posts`
- **Trigger:** Compose UI publish, or automation rule with `action=publish`
- **Auth:** JWT or service role
- **External calls:** GetLate API (`https://getlate.dev/api/v1`)
- **Actions:** create, update, delete, unpublish, list, get, validate

### `og-image-generator`
- **Trigger:** Fire-and-forget from rss-poll after inserting new items
- **Input:** `{ action: 'generate', feedItemId }`
- **Output:** Generates branded OG image, stores URL in `rss_feed_items.og_image_url`

## Frontend Components

The content pipeline UI lives under `/app/content` with these tabs:

| Tab | Component | Purpose |
|-----|-----------|---------|
| Posts | `ComposeTab.tsx` | Multi-step compose wizard: source (article/scratch) -> accounts -> strategy -> posts -> review -> publish |
| Drafts | `DraftsTab.tsx` | List saved drafts, resume editing, manage workflow status |
| Calendar | `ContentCalendar.tsx` | Visual calendar of scheduled and published posts |
| Feeds | `FeedsTab.tsx` | Manage RSS feeds: add, edit, toggle, delete, manual poll |
| Automations | `AutomationsContent.tsx` | Create and manage automation rules |
| Logs | `AutomationLogsContent.tsx` | View automation execution history |
| Articles | `ArticlesTab.tsx` | Browse ingested articles, view pipeline status |
| Pipeline | `ArticlePipeline.tsx` | Visual article flow through ingestion/generation/publishing |

The Compose wizard has these phases (managed as `ComposePhase` in `ComposeTab.tsx`):
1. **Source selection** -- pick an RSS article or write from scratch
2. **Account selection** -- choose target social accounts
3. **Strategy generation** -- AI generates a content strategy; user can iterate with chat
4. **Post generation** -- AI generates platform-specific posts
5. **Compliance check** -- AI validates posts against platform rules (automatic)
6. **Editing** -- user edits generated posts per platform
7. **Review/Publish** -- preview, schedule, or publish immediately

## Cron Jobs

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| `rss-poll-every-5-min` | Every 5 minutes | `rss-poll` | Polls all active RSS feeds, ingests new articles, runs automation rules |

The cron job is a pg_cron entry that calls `net.http_post()` to invoke the edge function with the service role key. Health is tracked in `cron_health_logs` and viewable at `/app/admin/cron-health`.

## Gotchas

1. **Automation runs inline in rss-poll.** The `processAutomationRules()` function runs inside the rss-poll edge function, not as a separate function. This means a slow automation (e.g., Gemini timeout) blocks the polling response. The 30-second `AbortSignal.timeout` on Gemini calls mitigates this.

2. **RSS parsing is regex-based.** The XML parser uses regex, not a DOM parser. It handles CDATA sections but may break on unusual XML structures. If a feed consistently fails to parse, check `parseRssXml()`.

3. **Image WebP conversion uses ImageMagick WASM.** The WASM binary is loaded at module initialization time (top of `rss-poll/index.ts`). If this fails, the function won't start. WebP images are converted to JPEG because many social platforms don't support WebP.

4. **ETag/Last-Modified are stored but not sent.** The feed cache headers are saved to the database but the actual fetch always does a full request. The comment in the code explains: "many RSS servers return incorrect 304 responses while still having new content."

5. **Dummy account IDs.** Automation rules can use IDs like `dummy-facebook` for testing. These are resolved to platform names via a hardcoded map and always produce drafts (never real publishes), regardless of the rule's action setting.

6. **Fire-and-forget OG image generation.** The `og-image-generator` call uses `.catch()` to swallow errors. OG image failures are silent and don't affect article ingestion.

7. **Gemini model.** Both the article content extraction (in rss-poll) and the post generation use `gemini-3.1-flash-lite-preview`. This is a preview model -- monitor for deprecation.

8. **Brand voice in automation vs manual.** Automated generation (via rss-poll) does NOT pass `companyId` to `generate-social-post`, so voice settings are not applied to automation-generated posts. Manual generation from ComposeTab does pass `companyId`. This is a known gap.

9. **Content workflow permissions.** The `useApproveContent` and `useRejectContent` hooks check for the `publish` permission via `useHasPermission('publish')`. Users without this permission cannot approve or reject drafts.

10. **Approval emails require Resend.** The `send_approval` action sends emails via the Resend API. If `RESEND_API_KEY` is not set, the approval record is still created but no email is sent -- the approver has no way to discover the approval link.

11. **Journalist deduplication.** Authors are upserted by `(company_id, name)`. If the same author appears with slightly different name formats across feeds (e.g., "John Smith" vs "J. Smith"), they will be created as separate journalists.

12. **Article crawling cost.** Each crawled article makes two external API calls (Firecrawl + Gemini). For high-volume feeds, this can be expensive. The `enable_scraping` flag on `rss_feeds` controls this, and `needsCrawl()` only triggers on thin content (<100 chars) when scraping is off.
