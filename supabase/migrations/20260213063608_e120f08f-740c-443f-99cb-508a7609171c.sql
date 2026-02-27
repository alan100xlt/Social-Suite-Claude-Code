-- Add columns to store HTTP cache headers for conditional requests
ALTER TABLE public.rss_feeds
ADD COLUMN etag text,
ADD COLUMN last_modified text;