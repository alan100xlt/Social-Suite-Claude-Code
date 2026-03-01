-- Create RPC function for optimal posting time analysis
-- Returns avg engagement rate bucketed by platform, day-of-week, and hour

CREATE OR REPLACE FUNCTION get_optimal_posting_windows(
    _company_id UUID,
    _platform TEXT DEFAULT NULL,
    _timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
    platform TEXT,
    day_of_week INTEGER,
    hour INTEGER,
    avg_engagement DECIMAL,
    post_count BIGINT,
    confidence_level TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    min_posts_threshold INTEGER := 10;
    total_posts BIGINT;
BEGIN
    -- Get total posts for this company/platform for confidence calculation
    SELECT COUNT(*)
    INTO total_posts
    FROM post_analytics_snapshots
    WHERE company_id = _company_id
      AND published_at IS NOT NULL
      AND (_platform IS NULL OR platform = _platform);

    RETURN QUERY
    SELECT 
        pas.platform,
        EXTRACT(DOW FROM pas.published_at AT TIME ZONE _timezone) AS day_of_week,
        EXTRACT(HOUR FROM pas.published_at AT TIME ZONE _timezone) AS hour,
        ROUND(AVG(pas.engagement_rate)::DECIMAL, 3) AS avg_engagement,
        COUNT(*) AS post_count,
        CASE 
            WHEN total_posts < 10 THEN 'no_data'
            WHEN total_posts < 25 THEN 'low_confidence'
            WHEN total_posts < 50 THEN 'confident'
            ELSE 'high_confidence'
        END AS confidence_level
    FROM post_analytics_snapshots pas
    WHERE pas.company_id = _company_id
      AND pas.published_at IS NOT NULL
      AND (_platform IS NULL OR pas.platform = _platform)
      AND pas.engagement_rate IS NOT NULL
      AND pas.engagement_rate >= 0
    GROUP BY pas.platform, day_of_week, hour
    HAVING COUNT(*) >= 1  -- At least one post in this time slot
    ORDER BY pas.platform, avg_engagement DESC;
END;
$$;

-- Add caching columns to company_voice_settings for optimal windows data
ALTER TABLE company_voice_settings 
ADD COLUMN IF NOT EXISTS optimal_windows_cache JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS optimal_windows_cached_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_post_analytics_snapshots_optimal_windows 
ON post_analytics_snapshots(company_id, platform, published_at) 
WHERE published_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON FUNCTION get_optimal_posting_windows IS 'Analyzes historical post performance to identify optimal posting times by platform, day of week, and hour. Returns engagement averages with confidence levels based on data volume.';
