# OG Image Generator — Design

## Overview

AI-powered OG image generator that creates branded preview images for RSS articles. Gemini analyzes article content and image to recommend the best template from 5 options. Users can override. Images served via public endpoint for emails, approval pages, and social previews.

## Templates

1. **Blog Post** — gradient background + big title + source attribution
2. **Photo Highlight** — article image as background with dark overlay + title
3. **Stats/Metric** — big number emphasis for data-heavy articles
4. **Announcement** — centered bold headline for breaking news/launches
5. **Social Proof** — quote-style card for opinion pieces/testimonials

## AI Template Recommendation

- Gemini analyzes: title tone, description content, image presence/quality, content category
- Returns: recommended template ID + reasoning string
- User can override in the UI

## Architecture

```
RSS Poll (ingest) → Gemini picks template → Satori renders JSX → resvg-wasm → PNG
                                                                       ↓
                                                          Supabase Storage (og-images/)
                                                                       ↓
                                                          og_image_url on rss_feed_items
                                                                       ↓
                                              Public endpoint: /og/:id serves the PNG
                                              Auto-attached to posts via automation
                                              Embeddable in emails + approval pages
```

## Data Sources

From `rss_feed_items`: title, description, image_url, published_at, link
From `rss_feeds` (join): name (feed source attribution), company_id (for branding)

## Phases

- **Phase 0** — HTML test gallery with 10 real DiarioJudio articles + template switcher per article + AI reasoning
- **Phase 1** — `og-image-generator` edge function (Satori + resvg-wasm)
- **Phase 2** — AI recommendation via Gemini in the edge function
- **Phase 3** — Hook into `rss-poll` for auto-generation on ingest
- **Phase 4** — Public `/og/:id` serving endpoint
- **Phase 5** — UI regenerate button + template override in content page

## Storage

- Bucket: `og-images/` in Supabase Storage
- Path: `og-images/{company_id}/{feed_item_id}.png`
- New column: `og_image_url` on `rss_feed_items` table
- New column: `og_template_id` on `rss_feed_items` (user override)

## Triggers

- **Auto**: on RSS poll ingest (new article → generate OG image)
- **Manual**: user clicks regenerate in content UI, can pick different template
