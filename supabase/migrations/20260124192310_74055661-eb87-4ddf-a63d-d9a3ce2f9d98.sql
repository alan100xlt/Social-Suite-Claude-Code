-- Add views column to post_analytics_snapshots table
-- This column stores video view counts from posts (especially YouTube, TikTok, etc.)
ALTER TABLE public.post_analytics_snapshots
ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;