
-- Fix: Add authorization checks to analytics RPC functions
-- These SECURITY DEFINER functions currently accept any company_id without verifying the caller

CREATE OR REPLACE FUNCTION public.get_post_analytics_totals(
  _company_id uuid, _start_date date, _end_date date, _platform text DEFAULT NULL::text
)
RETURNS TABLE(
  total_impressions bigint, total_reach bigint, total_views bigint,
  total_likes bigint, total_comments bigint, total_shares bigint,
  total_clicks bigint, total_posts bigint, avg_engagement_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT user_belongs_to_company(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied to company analytics';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(impressions), 0)::bigint,
    COALESCE(SUM(reach), 0)::bigint,
    COALESCE(SUM(views), 0)::bigint,
    COALESCE(SUM(likes), 0)::bigint,
    COALESCE(SUM(comments), 0)::bigint,
    COALESCE(SUM(shares), 0)::bigint,
    COALESCE(SUM(clicks), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(AVG(engagement_rate), 0)::numeric
  FROM post_analytics_snapshots
  WHERE company_id = _company_id
    AND snapshot_date >= _start_date
    AND snapshot_date <= _end_date
    AND (_platform IS NULL OR platform = _platform);
END;
$$;

---

CREATE OR REPLACE FUNCTION public.get_post_analytics_by_date(
  _company_id uuid, _start_date date, _end_date date, _platform text DEFAULT NULL::text
)
RETURNS TABLE(
  snapshot_date date, impressions bigint, reach bigint, views bigint,
  likes bigint, comments bigint, shares bigint, clicks bigint,
  post_count bigint, avg_engagement_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT user_belongs_to_company(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied to company analytics';
  END IF;

  RETURN QUERY
  SELECT
    p.snapshot_date,
    COALESCE(SUM(p.impressions), 0)::bigint,
    COALESCE(SUM(p.reach), 0)::bigint,
    COALESCE(SUM(p.views), 0)::bigint,
    COALESCE(SUM(p.likes), 0)::bigint,
    COALESCE(SUM(p.comments), 0)::bigint,
    COALESCE(SUM(p.shares), 0)::bigint,
    COALESCE(SUM(p.clicks), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(AVG(p.engagement_rate), 0)::numeric
  FROM post_analytics_snapshots p
  WHERE p.company_id = _company_id
    AND p.snapshot_date >= _start_date
    AND p.snapshot_date <= _end_date
    AND (_platform IS NULL OR p.platform = _platform)
  GROUP BY p.snapshot_date
  ORDER BY p.snapshot_date;
END;
$$;

---

CREATE OR REPLACE FUNCTION public.get_post_analytics_by_platform(
  _company_id uuid, _start_date date, _end_date date
)
RETURNS TABLE(
  platform text, total_impressions bigint, total_views bigint,
  total_engagement bigint, total_posts bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT user_belongs_to_company(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied to company analytics';
  END IF;

  RETURN QUERY
  SELECT
    p.platform,
    COALESCE(SUM(p.impressions), 0)::bigint,
    COALESCE(SUM(p.views), 0)::bigint,
    COALESCE(SUM(p.likes) + SUM(p.comments) + SUM(p.shares), 0)::bigint,
    COUNT(*)::bigint
  FROM post_analytics_snapshots p
  WHERE p.company_id = _company_id
    AND p.snapshot_date >= _start_date
    AND p.snapshot_date <= _end_date
  GROUP BY p.platform;
END;
$$;
