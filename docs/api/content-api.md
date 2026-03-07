# Content API

Edge functions for RSS feed discovery, polling, AI-powered post generation, and cross-platform publishing via the GetLate API.

---

## discover-rss-feeds

**Purpose:** Discover RSS/Atom/JSON feeds for a given website URL by probing HTML `<link>` tags, common paths, and subdomains.
**Auth:** No auth required (public endpoint)
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/discover-rss-feeds`

### Request

```json
{
  "url": "string - Website URL to discover feeds for (e.g. 'nytimes.com')",
  "fastMode": "boolean (optional, default false) - Probe fewer paths for faster results"
}
```

### Response (200)

```json
{
  "success": true,
  "isDirectFeed": false,
  "feeds": [
    {
      "url": "https://example.com/feed",
      "title": "Example RSS Feed",
      "type": "rss",
      "description": "Latest articles from Example",
      "itemCount": 25,
      "lastUpdated": "2026-03-07T12:00:00Z",
      "score": 85,
      "source": "html_link"
    }
  ],
  "firstArticle": {
    "title": "Breaking News Article",
    "description": "Article summary text...",
    "link": "https://example.com/article-1",
    "imageUrl": "https://example.com/image.jpg"
  },
  "articles": [
    {
      "title": "Breaking News Article",
      "description": "Article summary text...",
      "link": "https://example.com/article-1",
      "imageUrl": "https://example.com/image.jpg"
    }
  ]
}
```

### Notes

- Discovery strategy: direct URL check, HTML `<link rel="alternate">` tags, path probing (40+ common paths), subdomain probing (www, blog, news, feed, rss).
- `source` values: `direct` (URL is a feed), `html_link` (found in page HTML), `path_probe` (guessed path), `subdomain` (found on subdomain).
- `score` is a heuristic (0-100+) based on item count and recency of last update.
- `fastMode` probes only the first 10 paths and exits early on first hit.
- Returns up to 5 articles from the best feed for preview purposes.
- Feed types: `rss`, `atom`, `json`.

---

## rss-poll

**Purpose:** Poll one or all active RSS feeds, insert new items, download images, crawl full article content, and trigger automation rules.
**Auth:** JWT required | Service role: yes (used by cron)
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/rss-poll`
**Cron:** `rss-poll-every-5-min` - runs every 5 minutes via `pg_cron`

### Request

```json
{
  "feedId": "string (optional) - Specific feed UUID to poll. Omit to poll all active feeds (cron mode).",
  "backfillImages": "boolean (optional, default false) - Re-download and convert images for existing items"
}
```

Cron invocations send an empty body or `{}`, which triggers polling of all active feeds.

### Response (200)

```json
{
  "success": true,
  "totalParsed": 50,
  "newItems": 3,
  "skippedDuplicates": 47,
  "backfilledImages": 0,
  "imagesUploaded": 2,
  "crawledArticles": 1,
  "automationResults": [
    {
      "rule": "Auto-post breaking news",
      "article": "Mayor Announces New Policy",
      "success": true,
      "action": "draft",
      "draftId": "uuid"
    }
  ]
}
```

### Response (200, cron mode - all feeds)

```json
{
  "success": true,
  "feedsPolled": 5,
  "results": [
    { "feedId": "uuid", "success": true, "totalParsed": 10, "newItems": 2 },
    { "feedId": "uuid", "success": false, "error": "Failed to fetch feed: 404" }
  ]
}
```

### Notes

- **Image processing:** Downloads article images and uploads them to the `post-images` Supabase storage bucket. WebP images are automatically converted to JPEG using ImageMagick WASM.
- **Article crawling:** If `enable_scraping` is set on the feed, or if the RSS description is thin (< 100 chars), the function crawls the full article via Firecrawl and uses Gemini AI to extract clean article text.
- **Journalist extraction:** Extracts author bylines from `<dc:creator>`, `<author>`, or `<itunes:author>` tags and upserts them into the `journalists` table.
- **Automation pipeline:** After inserting new items, the function queries `automation_rules` for matching active rules and executes their action:
  - `draft` - Creates a `post_drafts` record with AI-generated content
  - `publish` - Publishes directly via `getlate-posts` (requires connected GetLate accounts)
  - `send_approval` - Creates `post_approvals` records and sends approval emails via Resend
- **OG image generation:** Fires off `og-image-generator` edge function for each new item (fire-and-forget).
- **CronMonitor:** Reports execution metrics to `cron_health` table.
- **Deduplication:** Uses `guid` field to prevent duplicate inserts.

---

## generate-social-post

**Purpose:** AI-powered social media content generation with three modes: strategy, post creation, and compliance checking.
**Auth:** JWT optional (allows anonymous for onboarding samples) | Service role: yes
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/generate-social-post`

### Request (mode: strategy)

Generate a content strategy for an article.

```json
{
  "mode": "strategy",
  "title": "string - Article title",
  "description": "string - Article description/summary",
  "link": "string - Article URL",
  "fullContent": "string (optional) - Full article text (truncated to 8000 chars)",
  "objective": "string - 'reach' | 'engagement' | 'clicks'",
  "platforms": ["twitter", "linkedin", "facebook"],
  "companyId": "string (optional) - Company UUID for voice settings lookup",
  "voiceSettings": "object (optional) - Override voice settings",
  "chatMessages": "array (optional) - Chat history for iterative refinement"
}
```

### Response (200, strategy mode)

```json
{
  "strategy": "**Article Summary**\n- Key point 1\n- Key point 2\n\n**Post Approach**\n...",
  "token_usage": {
    "prompt_tokens": 450,
    "completion_tokens": 200,
    "total_tokens": 650
  },
  "estimated_cost_usd": 0.000094
}
```

### Request (mode: posts)

Generate platform-specific posts from an approved strategy.

```json
{
  "mode": "posts",
  "title": "string - Article title",
  "description": "string - Article description",
  "link": "string - Article URL",
  "fullContent": "string (optional) - Full article text",
  "imageUrl": "string (optional) - Article image URL",
  "objective": "string - 'reach' | 'engagement' | 'clicks'",
  "platforms": ["twitter", "linkedin", "instagram"],
  "approvedStrategy": "string - The strategy text from mode=strategy",
  "companyId": "string (optional) - For voice settings",
  "voiceSettings": "object (optional) - Override voice settings"
}
```

### Response (200, posts mode)

```json
{
  "posts": {
    "twitter": "Breaking: Mayor announces new policy...",
    "linkedin": "Exciting developments in local governance...\n\n#LocalNews #Policy",
    "instagram": "Big news for our community! Mayor announces..."
  },
  "token_usage": { "prompt_tokens": 600, "completion_tokens": 300, "total_tokens": 900 },
  "estimated_cost_usd": 0.000125
}
```

### Request (mode: compliance)

Check and fix posts for platform rule compliance.

```json
{
  "mode": "compliance",
  "posts": {
    "twitter": "This post might be too long for Twitter and needs to be checked...",
    "linkedin": "Professional post content here..."
  }
}
```

### Response (200, compliance mode)

```json
{
  "posts": {
    "twitter": "Shortened compliant version...",
    "linkedin": "Professional post content here..."
  },
  "token_usage": { "prompt_tokens": 300, "completion_tokens": 150, "total_tokens": 450 },
  "estimated_cost_usd": 0.000067
}
```

### Notes

- **AI model:** Uses `gemini-3.1-flash-lite-preview` via the Google Generative Language API (OpenAI-compatible endpoint).
- **Platform character limits enforced:** Twitter 280, Bluesky 300, LinkedIn 3000, Facebook 63206, Instagram 2200, TikTok 2200, Threads 500, Pinterest 500. URLs count toward the limit (no shortening).
- **Voice settings resolution:** If `companyId` is provided and no `voiceSettings` override, the function fetches `company_voice_settings` from the database. Supports `voice_mode` values: `default` (global defaults), `custom_dynamic_ai` (AI may deviate at 60%+ confidence), `custom_strict_ai` (90%+ confidence), `ai_decides` (full AI autonomy).
- **Voice parameters:** `tone` (neutral/friendly/urgent/engagement), `content_length` (headline/bullets/standard/full), `emoji_style` (none/minimalist/contextual/heavy), `hashtag_strategy` (none/smart/brand_only/smart_and_brand).
- **Cost tracking:** Every AI call is logged to `api_call_logs` with token usage and estimated cost in USD.
- **30-second timeout** on AI calls via `AbortSignal.timeout`.

---

## getlate-posts

**Purpose:** CRUD operations for social media posts via the GetLate API, including publishing, scheduling, validation, and unpublishing.
**Auth:** JWT required | Service role: yes
**Method:** POST
**URL:** `{SUPABASE_URL}/functions/v1/getlate-posts`

All actions are dispatched via the `action` field in the request body.

### Action: create

Publish or schedule a post across one or more social accounts.

```json
{
  "action": "create",
  "profileId": "string - GetLate profile ID",
  "accountIds": ["string - GetLate account IDs to post to"],
  "content": "string - Post text content (or use 'text')",
  "mediaItems": [
    { "url": "string - Media URL", "type": "string - 'image' | 'video'" }
  ],
  "publishNow": "boolean (optional) - Publish immediately",
  "scheduledFor": "string (optional) - ISO 8601 datetime for scheduling",
  "platformOptions": "object (optional) - Platform-specific options",
  "platforms": [
    {
      "platform": "twitter",
      "accountId": "string",
      "content": "Platform-specific content override"
    }
  ],
  "source": "string (optional) - 'automation' | 'manual'",
  "objective": "string (optional) - 'reach' | 'engagement' | 'clicks'"
}
```

**Response (200):**

```json
{
  "success": true,
  "post": {
    "_id": "getlate-post-id",
    "status": "published",
    "platformResults": [
      { "platform": "twitter", "status": "success", "postUrl": "https://x.com/..." }
    ]
  },
  "isPartial": false
}
```

**Security:** Server-side validation verifies all `accountIds` belong to the specified `profileId` before posting. Cross-company posting is blocked with a logged security event.

### Action: list

```json
{
  "action": "list",
  "profileId": "string - GetLate profile ID",
  "status": "string (optional) - Filter by status",
  "platform": "string (optional) - Filter by platform",
  "limit": "number (optional)",
  "offset": "number (optional)"
}
```

**Response (200):**

```json
{
  "success": true,
  "posts": [
    { "_id": "...", "content": "...", "status": "published", "platform": "twitter" }
  ]
}
```

### Action: get

```json
{
  "action": "get",
  "postId": "string - GetLate post ID"
}
```

**Response (200):**

```json
{ "success": true, "post": { "_id": "...", "content": "...", "status": "published" } }
```

### Action: update

```json
{
  "action": "update",
  "postId": "string - GetLate post ID",
  "text": "string (optional) - Updated content",
  "scheduledFor": "string (optional) - Updated schedule time"
}
```

**Response (200):**

```json
{ "success": true, "post": { "_id": "...", "content": "Updated content" } }
```

### Action: delete

```json
{
  "action": "delete",
  "postId": "string - GetLate post ID"
}
```

**Response (200):**

```json
{ "success": true }
```

### Action: unpublish

Remove a post from social platforms while keeping it in the system.

```json
{
  "action": "unpublish",
  "postId": "string - GetLate post ID",
  "platforms": ["string (optional) - Specific platforms to unpublish from"]
}
```

**Response (200):**

```json
{ "success": true }
```

### Action: validate-length

```json
{
  "action": "validate-length",
  "text": "string - Post content to validate",
  "platforms": ["twitter", "linkedin"]
}
```

**Response (200):**

```json
{ "success": true, "validation": { "twitter": { "valid": true, "length": 140, "maxLength": 280 } } }
```

### Action: validate-post

Full post validation including content, media, and platform rules.

```json
{
  "action": "validate-post",
  "text": "string - Post content",
  "mediaItems": [{ "url": "...", "type": "image" }],
  "platforms": ["twitter"],
  "accountIds": ["string"]
}
```

### Action: validate-media

```json
{
  "action": "validate-media",
  "mediaItems": [{ "url": "...", "type": "image" }]
}
```

### Notes

- All upstream errors from GetLate are returned with `status: 200` and `success: false` to simplify client-side handling.
- **409 Duplicate Content** is returned when the same content was posted within the last 24 hours.
- On successful publish, a fire-and-forget in-app notification is sent to the user via `send-in-app-notification`.
- **Partial success:** When some platforms succeed and others fail, `isPartial: true` is returned with details in `post.platformResults`.
- The `platforms` array with per-account content prevents the GetLate cross-posting bug where content is auto-expanded to all accounts under the same user.
