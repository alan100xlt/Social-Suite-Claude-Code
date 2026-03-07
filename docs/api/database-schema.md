# Database Schema Reference

Overview of all tables in the Social Suite Postgres database, grouped by domain. All tables live in the `public` schema and are accessed via Supabase client with Row-Level Security (RLS) enforced.

**Type source:** `src/integrations/supabase/types.ts` (auto-generated -- do not edit directly).

---

## RLS Patterns

Nearly every table includes a `company_id` column. RLS policies enforce that users can only access rows where `company_id` matches one of their memberships. The typical pattern:

```sql
CREATE POLICY "Users can view own company data"
  ON some_table FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_memberships
    WHERE user_id = auth.uid()
  ));
```

Superadmins bypass most RLS via the `is_superadmin()` function. Service-role queries (edge functions) bypass RLS entirely.

---

## Auth & Identity

### `profiles`

User profile data, created automatically on signup via trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Matches `auth.users.id` |
| `email` | text | Denormalized from auth |
| `full_name` | text | Display name |
| `avatar_url` | text | Profile image URL |
| `company_id` | uuid (FK) | Default/primary company |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `superadmins`

Grants platform-wide superadmin privileges.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid (PK, FK) | References `auth.users` |

### `company_memberships`

Links users to companies with a role.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `company_id` | uuid (FK) | |
| `role` | app_role enum | `owner`, `admin`, `manager`, `collaborator`, `community_manager`, `member` |
| `created_at` | timestamptz | |

Unique constraint on `(user_id, company_id)`.

### `company_invitations`

Pending invitations to join a company.

| Column | Type | Notes |
|--------|------|-------|
| `company_id` | uuid (FK) | |
| `email` | text | Invitee email |
| `role` | text | Role to assign on acceptance |
| `accepted_at` | timestamptz | Null until accepted |

### `role_default_permissions`

Default permissions per role.

### `user_permissions`

Per-user permission overrides within a company.

### `user_roles`

Additional role assignments.

---

## Companies & Organizations

### `companies`

Core tenant entity. All business data is scoped to a company.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `name` | text | Company display name |
| `slug` | text (unique) | URL-safe identifier |
| `website_url` | text | |
| `company_tier` | text | Subscription tier (default: `'free'`) |
| `getlate_profile_id` | text | GetLate API profile ID |
| `branding` | jsonb | Custom branding config |
| `onboarding_status` | text | `pending`, `in_progress`, `complete` |
| `onboarding_step` | int | Current wizard step |
| `created_by` | uuid (FK) | |
| `created_at` | timestamptz | |

### `media_companies`

Parent entities for media company hierarchies (multi-company portfolios).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `name` | text | |
| `created_at` | timestamptz | |

### `media_company_children`

Links companies to media company parents.

| Column | Type | Notes |
|--------|------|-------|
| `media_company_id` | uuid (FK) | Parent media company |
| `company_id` | uuid (FK) | Child company |
| `relationship_type` | text | e.g., `owned`, `managed` |

### `media_company_members`

User membership in media companies.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid (FK) | |
| `media_company_id` | uuid (FK) | |
| `role` | text | |
| `is_active` | boolean | |

### `media_company_analytics`

Cached analytics for media company dashboards.

---

## Content & Publishing

### `post_drafts`

Draft posts before publishing. Supports multi-platform content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `created_by` | uuid (FK) | Author |
| `platform_contents` | jsonb | `{ "twitter": "...", "linkedin": "..." }` |
| `article_title` | text | Source article title |
| `article_link` | text | Source article URL |
| `selected_account_ids` | text[] | Target social accounts |
| `scheduled_at` | timestamptz | Scheduled publish time |
| `status` | text | `draft`, `scheduled`, `published`, `failed` |
| `objective` | text | e.g., `engagement`, `traffic` |

### `post_approvals`

Approval workflow records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `token` | text (unique) | Public approval URL token |
| `created_by` | uuid (FK) | Requester |
| `recipient_email` | text | Reviewer email |
| `platform_contents` | jsonb | Same shape as drafts |
| `status` | text | `pending`, `approved`, `rejected` |
| `reviewed_at` | timestamptz | |

### `campaigns`

Content campaigns grouping multiple posts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `name` | text | |
| `status` | campaign_status enum | `draft`, `active`, `completed`, `archived` |

### `campaign_posts`

Links posts to campaigns.

### `evergreen_queue`

Recycled evergreen content for republishing.

| Column | Type | Notes |
|--------|------|-------|
| `company_id` | uuid (FK) | |
| `post_id` | text | Original post ID |
| `status` | evergreen_status enum | `pending`, `published`, `skipped`, `failed` |
| `next_publish_at` | timestamptz | |

---

## RSS & Automations

### `rss_feeds`

RSS feed subscriptions per company.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `url` | text | Feed URL |
| `name` | text | Display name |
| `is_active` | boolean | |
| `last_polled_at` | timestamptz | |

### `rss_feed_items`

Individual articles from RSS feeds.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `feed_id` | uuid (FK) | Parent feed |
| `title` | text | Article title |
| `link` | text | Article URL |
| `status` | rss_item_status enum | `pending`, `posted`, `failed`, `skipped` |
| `published_at` | timestamptz | |

### `automation_rules`

Rules that auto-generate posts from RSS items.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `name` | text | |
| `is_active` | boolean | |
| `feed_id` | uuid (FK) | Source feed |
| `target_accounts` | text[] | Destination social accounts |
| `template` | jsonb | Generation template/config |

### `automation_logs`

Execution history for automation rules.

---

## Analytics

### `post_analytics_snapshots`

Per-post performance metrics. **Critical:** When filtering by date, always use `published_at` (when the post was published), never `snapshot_date` (when the sync ran).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `post_id` | text | External post ID |
| `platform` | text | `twitter`, `linkedin`, `instagram`, etc. |
| `account_id` | text | Social account ID |
| `published_at` | timestamptz | **Use this for date filtering** |
| `snapshot_date` | date | When sync ran -- **do NOT filter by this** |
| `impressions` | int | |
| `views` | int | |
| `likes` | int | |
| `comments` | int | |
| `shares` | int | |
| `clicks` | int | |
| `reach` | int | |
| `saves` | int | |
| `engagement_rate` | float | |
| `content` | text | Post text content |
| `post_url` | text | |
| `thumbnail_url` | text | |

### `account_analytics_snapshots`

Per-account aggregate metrics over time. Unlike post snapshots, `snapshot_date` is the correct date column here (tracks growth).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `account_id` | text | Social account ID |
| `platform` | text | |
| `snapshot_date` | date | **Correct date column for this table** |
| `followers` | int | |
| `following` | int | |
| `posts_count` | int | |
| `impressions` | int | |
| `views` | int | |
| `likes` | int | |
| `comments` | int | |
| `shares` | int | |
| `clicks` | int | |
| `reach` | int | |
| `engagement_rate` | float | |
| `is_active` | boolean | |

### `content_decay_cache`

Cached content decay analysis per company/platform.

---

## Inbox

### `inbox_conversations`

Social media conversations (comments, DMs, mentions).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `company_id` | uuid (FK) | |
| `platform` | text | Source platform |
| `type` | text | `comment`, `dm`, `mention`, `review` |
| `status` | text | `open`, `snoozed`, `closed`, `archived` |
| `priority` | text | `low`, `medium`, `high`, `urgent` |
| `sentiment` | text | AI-detected: `positive`, `neutral`, `negative` |
| `assigned_to` | uuid (FK) | Assigned team member |
| `contact_id` | uuid (FK) | Linked contact |
| `post_id` | text | Related post |
| `unread_count` | int | |
| `last_message_at` | timestamptz | |
| `last_message_preview` | text | |
| `detected_language` | text | |
| `editorial_value` | float | AI-scored editorial value |
| `snooze_until` | timestamptz | |
| `metadata` | jsonb | Platform-specific data |

### `inbox_messages`

Individual messages within conversations.

### `inbox_contacts`

Contact profiles extracted from inbox conversations.

### `inbox_labels` / `inbox_conversation_labels`

Labeling system for inbox organization.

### `inbox_auto_rules`

Automated rules for inbox processing (auto-assign, auto-label, auto-respond).

### `inbox_canned_replies`

Pre-written reply templates.

### `inbox_sync_state`

Tracks sync cursor per company/platform for incremental inbox polling.

### `inbox_read_status`

Per-user read status for conversations.

### `inbox_activity_log`

Audit log of inbox actions (assigned, labeled, replied, etc.).

### `inbox_ai_results`

AI classification and analysis results for conversations.

### `inbox_ai_feedback`

User corrections to AI classifications (training feedback).

### `inbox_ai_settings`

Per-company AI feature toggles and configuration.

### `inbox_crisis_events`

Detected crisis events from inbox volume/sentiment spikes.

### `inbox_backfill_jobs`

Tracks historical inbox sync jobs.

### `message_reactions`

Emoji reactions on inbox messages.

---

## Settings & Configuration

### `company_voice_settings`

Brand voice configuration for AI content generation.

| Column | Type | Notes |
|--------|------|-------|
| `company_id` | uuid (FK, unique) | One-to-one with companies |
| `tone` | text | e.g., `professional`, `casual` |
| `voice_mode` | text | |
| `emoji_style` | text | |
| `hashtag_strategy` | text | |
| `content_length` | text | |
| `brand_tags` | text[] | |
| `custom_instructions` | text | |
| `require_ai_review` | boolean | |

### `company_email_settings`

Per-company email branding overrides.

### `global_email_settings`

Platform-wide email branding defaults.

### `global_voice_defaults`

Platform-wide AI voice defaults.

### `platform_settings`

Global platform configuration (name, logo, etc.).

### `company_feature_config`

Per-company feature flags.

### `notification_preferences`

Per-user notification preferences.

### `og_company_settings`

OG image generation settings per company.

---

## Infrastructure & Monitoring

### `api_call_logs`

Logs of external API calls (GetLate, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `function_name` | text | Edge function that made the call |
| `action` | text | API action performed |
| `success` | boolean | |
| `status_code` | int | HTTP status |
| `duration_ms` | int | Response time |
| `error_message` | text | |
| `request_body` | jsonb | |
| `response_body` | jsonb | |
| `company_id` | uuid (FK) | |

### `cron_health_logs`

Execution history for cron jobs.

| Column | Type | Notes |
|--------|------|-------|
| `job_name` | text | Cron job identifier |
| `status` | text | `running`, `success`, `error` |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `error_message` | text | |

### `cron_job_settings`

Configurable cron job schedules and enabled states.

### `webhook_registrations`

Active webhook registrations with external services (GetLate).

### `webhook_event_log`

Incoming webhook event processing log.

### `getlate_changelog_checks`

Tracks GetLate API changelog monitoring.

### `corrections`

User corrections to AI-generated content.

### `routing_rules`

Message routing rules for inbox distribution.

---

## Discovery & Onboarding

### `discovery_leads`

Companies discovered via the onboarding discovery flow.

| Column | Type | Notes |
|--------|------|-------|
| `company_id` | uuid (FK) | |
| `social_channels` | jsonb | Discovered social media accounts |
| `website_url` | text | |

### `journalists`

Journalist profiles for media outreach features.

---

## Chat

### `chat_threads`

AI copilot chat threads.

### `chat_messages`

Individual messages in chat threads.

---

## Enums

| Enum | Values |
|------|--------|
| `app_role` | `owner`, `admin`, `member`, `manager`, `collaborator`, `community_manager` |
| `campaign_status` | `draft`, `active`, `completed`, `archived` |
| `evergreen_status` | `pending`, `published`, `skipped`, `failed` |
| `rss_item_status` | `pending`, `posted`, `failed`, `skipped` |
