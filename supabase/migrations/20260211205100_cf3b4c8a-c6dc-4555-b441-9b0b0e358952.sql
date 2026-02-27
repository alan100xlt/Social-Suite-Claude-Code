
-- Add source and objective metadata to post analytics
ALTER TABLE public.post_analytics_snapshots
  ADD COLUMN source text DEFAULT NULL,
  ADD COLUMN objective text DEFAULT NULL;

-- source: 'getlate' (posted via our tool) or 'direct' (posted natively on platform)
-- objective: 'reach', 'engagement', 'clicks' (set when AI generated via our tool)

COMMENT ON COLUMN public.post_analytics_snapshots.source IS 'How the post was created: getlate or direct';
COMMENT ON COLUMN public.post_analytics_snapshots.objective IS 'AI generation objective: reach, engagement, or clicks';
