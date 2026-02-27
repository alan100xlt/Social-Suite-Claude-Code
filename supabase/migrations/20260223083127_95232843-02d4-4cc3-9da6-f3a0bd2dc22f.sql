
-- Add account_id to post_analytics_snapshots
ALTER TABLE public.post_analytics_snapshots 
ADD COLUMN account_id text;

-- Create index for efficient filtering
CREATE INDEX idx_post_analytics_account_id ON public.post_analytics_snapshots(account_id);

-- Update get_post_analytics_totals to filter by active accounts
CREATE OR REPLACE FUNCTION public.get_post_analytics_totals(_company_id uuid, _start_date date, _end_date date, _platform text DEFAULT NULL::text)
 RETURNS TABLE(total_impressions bigint, total_reach bigint, total_views bigint, total_likes bigint, total_comments bigint, total_shares bigint, total_clicks bigint, total_posts bigint, avg_engagement_rate numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_belongs_to_company(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied to company analytics';
  END IF;

  RETURN QUERY
  SELECT
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
    AND (p.account_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM account_analytics_snapshots a 
      WHERE a.account_id = p.account_id 
        AND a.company_id = _company_id 
        AND a.is_active = false
    ));
END;
$function$;

-- Update get_post_analytics_by_date to filter by active accounts
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_date(_company_id uuid, _start_date date, _end_date date, _platform text DEFAULT NULL::text)
 RETURNS TABLE(snapshot_date date, impressions bigint, reach bigint, views bigint, likes bigint, comments bigint, shares bigint, clicks bigint, post_count bigint, avg_engagement_rate numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (p.account_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM account_analytics_snapshots a 
      WHERE a.account_id = p.account_id 
        AND a.company_id = _company_id 
        AND a.is_active = false
    ))
  GROUP BY p.snapshot_date
  ORDER BY p.snapshot_date;
END;
$function$;

-- Update get_post_analytics_by_platform to filter by active accounts
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_platform(_company_id uuid, _start_date date, _end_date date)
 RETURNS TABLE(platform text, total_impressions bigint, total_views bigint, total_engagement bigint, total_posts bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (p.account_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM account_analytics_snapshots a 
      WHERE a.account_id = p.account_id 
        AND a.company_id = _company_id 
        AND a.is_active = false
    ))
  GROUP BY p.platform;
END;
$function$;

-- Update get_post_analytics_by_date_platform to filter by active accounts
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_date_platform(_company_id uuid, _start_date date, _end_date date)
 RETURNS TABLE(snapshot_date date, platform text, impressions bigint, views bigint, clicks bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_belongs_to_company(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied to company analytics';
  END IF;

  RETURN QUERY
  SELECT
    p.snapshot_date,
    p.platform,
    COALESCE(SUM(p.impressions), 0)::bigint,
    COALESCE(SUM(p.views), 0)::bigint,
    COALESCE(SUM(p.clicks), 0)::bigint
  FROM post_analytics_snapshots p
  WHERE p.company_id = _company_id
    AND p.snapshot_date >= _start_date
    AND p.snapshot_date <= _end_date
    AND (p.account_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM account_analytics_snapshots a 
      WHERE a.account_id = p.account_id 
        AND a.company_id = _company_id 
        AND a.is_active = false
    ))
  GROUP BY p.snapshot_date, p.platform
  ORDER BY p.snapshot_date, p.platform;
END;
$function$;
