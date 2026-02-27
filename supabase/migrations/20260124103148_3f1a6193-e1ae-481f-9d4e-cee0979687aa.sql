-- Add content and metadata columns to post_analytics_snapshots
ALTER TABLE public.post_analytics_snapshots 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;