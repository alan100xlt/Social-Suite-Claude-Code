-- Step 1a: RPC to compute posting frequency from local post_analytics_snapshots
-- Groups by platform + ISO week over last 12 weeks
-- SECURITY INVOKER — relies on existing tenant_isolation RLS on post_analytics_snapshots

CREATE OR REPLACE FUNCTION get_posting_frequency_analysis(
    _company_id UUID,
    _platform TEXT DEFAULT NULL
)
RETURNS TABLE (
    platform TEXT,
    posts_per_week NUMERIC,
    average_engagement_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    WITH weekly_stats AS (
        SELECT
            pas.platform AS plat,
            DATE_TRUNC('week', pas.published_at) AS week_start,
            COUNT(*) AS post_count,
            AVG(pas.engagement_rate) AS avg_er
        FROM post_analytics_snapshots pas
        WHERE pas.company_id = _company_id
          AND pas.published_at IS NOT NULL
          AND pas.published_at >= NOW() - INTERVAL '12 weeks'
          AND (_platform IS NULL OR pas.platform = _platform)
          AND pas.engagement_rate IS NOT NULL
        GROUP BY pas.platform, DATE_TRUNC('week', pas.published_at)
    )
    SELECT
        ws.plat,
        ROUND(AVG(ws.post_count)::NUMERIC, 1),
        ROUND(AVG(ws.avg_er)::NUMERIC, 4)
    FROM weekly_stats ws
    GROUP BY ws.plat
    ORDER BY ws.plat;
END;
$$;

COMMENT ON FUNCTION get_posting_frequency_analysis IS 'Computes average posts per week and engagement rate per platform over the last 12 weeks from local post_analytics_snapshots. No external API calls.';

-- Fix ambiguous column reference in existing get_optimal_posting_windows RPC
-- The RETURNS TABLE column names conflict with table column aliases in SELECT
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
    SELECT COUNT(*)
    INTO total_posts
    FROM post_analytics_snapshots
    WHERE company_id = _company_id
      AND published_at IS NOT NULL
      AND (_platform IS NULL OR post_analytics_snapshots.platform = _platform);

    RETURN QUERY
    SELECT
        pas.platform,
        EXTRACT(DOW FROM pas.published_at AT TIME ZONE _timezone)::INTEGER,
        EXTRACT(HOUR FROM pas.published_at AT TIME ZONE _timezone)::INTEGER,
        ROUND(AVG(pas.engagement_rate)::DECIMAL, 3),
        COUNT(*),
        CASE
            WHEN total_posts < 10 THEN 'no_data'
            WHEN total_posts < 25 THEN 'low_confidence'
            WHEN total_posts < 50 THEN 'confident'
            ELSE 'high_confidence'
        END
    FROM post_analytics_snapshots pas
    WHERE pas.company_id = _company_id
      AND pas.published_at IS NOT NULL
      AND (_platform IS NULL OR pas.platform = _platform)
      AND pas.engagement_rate IS NOT NULL
      AND pas.engagement_rate >= 0
    GROUP BY pas.platform, 2, 3
    HAVING COUNT(*) >= 1
    ORDER BY pas.platform, 4 DESC;
END;
$$;

-- Step 1b: content_decay_cache table
-- Populated by hourly analytics-sync cron, read by frontend

CREATE TABLE IF NOT EXISTS content_decay_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform TEXT, -- NULL = all-platform aggregate
    data JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{timeWindow, engagementPercentage}, ...]
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, platform)
);

-- RLS: same tenant_isolation pattern as post_analytics_snapshots
ALTER TABLE content_decay_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.content_decay_cache
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- Grants
GRANT SELECT ON content_decay_cache TO authenticated;
GRANT ALL ON content_decay_cache TO service_role;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_decay_cache_company
ON content_decay_cache(company_id, platform);
