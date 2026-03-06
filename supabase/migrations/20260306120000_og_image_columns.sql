-- OG Image Generator: Add columns for AI-generated Open Graph images
ALTER TABLE rss_feed_items ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE rss_feed_items ADD COLUMN IF NOT EXISTS og_template_id TEXT;
ALTER TABLE rss_feed_items ADD COLUMN IF NOT EXISTS og_ai_reasoning TEXT;

-- Index for serving endpoint lookups
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_og
  ON rss_feed_items(id) WHERE og_image_url IS NOT NULL;
