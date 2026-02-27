
-- Aggregate post analytics totals for a company within a date range, optionally filtered by platform
CREATE OR REPLACE FUNCTION public.get_post_analytics_totals(
  _company_id uuid,
  _start_date date,
  _end_date date,
  _platform text DEFAULT NULL
)
RETURNS TABLE (
  total_impressions bigint,
  total_reach bigint,
  total_views bigint,
  total_likes bigint,
  total_comments bigint,
  total_shares bigint,
  total_clicks bigint,
  total_posts bigint,
  avg_engagement_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    COALESCE(SUM(impressions), 0) as total_impressions,
    COALESCE(SUM(reach), 0) as total_reach,
    COALESCE(SUM(views), 0) as total_views,
    COALESCE(SUM(likes), 0) as total_likes,
    COALESCE(SUM(comments), 0) as total_comments,
    COALESCE(SUM(shares), 0) as total_shares,
    COALESCE(SUM(clicks), 0) as total_clicks,
    COUNT(*) as total_posts,
    COALESCE(AVG(engagement_rate), 0) as avg_engagement_rate
  FROM post_analytics_snapshots
  WHERE company_id = _company_id
    AND snapshot_date >= _start_date
    AND snapshot_date <= _end_date
    AND (_platform IS NULL OR platform = _platform);
$$;

-- Aggregate post analytics by date for charts
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_date(
  _company_id uuid,
  _start_date date,
  _end_date date,
  _platform text DEFAULT NULL
)
RETURNS TABLE (
  snapshot_date date,
  impressions bigint,
  reach bigint,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  clicks bigint,
  post_count bigint,
  avg_engagement_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.snapshot_date,
    COALESCE(SUM(p.impressions), 0),
    COALESCE(SUM(p.reach), 0),
    COALESCE(SUM(p.views), 0),
    COALESCE(SUM(p.likes), 0),
    COALESCE(SUM(p.comments), 0),
    COALESCE(SUM(p.shares), 0),
    COALESCE(SUM(p.clicks), 0),
    COUNT(*),
    COALESCE(AVG(p.engagement_rate), 0)
  FROM post_analytics_snapshots p
  WHERE p.company_id = _company_id
    AND p.snapshot_date >= _start_date
    AND p.snapshot_date <= _end_date
    AND (_platform IS NULL OR p.platform = _platform)
  GROUP BY p.snapshot_date
  ORDER BY p.snapshot_date;
$$;

-- Aggregate post analytics by platform
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_platform(
  _company_id uuid,
  _start_date date,
  _end_date date
)
RETURNS TABLE (
  platform text,
  total_impressions bigint,
  total_views bigint,
  total_engagement bigint,
  total_posts bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.platform,
    COALESCE(SUM(p.impressions), 0),
    COALESCE(SUM(p.views), 0),
    COALESCE(SUM(p.likes) + SUM(p.comments) + SUM(p.shares), 0),
    COUNT(*)
  FROM post_analytics_snapshots p
  WHERE p.company_id = _company_id
    AND p.snapshot_date >= _start_date
    AND p.snapshot_date <= _end_date
  GROUP BY p.platform;
$$;
