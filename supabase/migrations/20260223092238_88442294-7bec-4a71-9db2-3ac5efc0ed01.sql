CREATE OR REPLACE FUNCTION public.get_post_analytics_by_publish_date(
  _company_id uuid,
  _start_date date,
  _end_date date,
  _platform text DEFAULT NULL
)
RETURNS TABLE(
  publish_date date,
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
    p.published_at::date AS publish_date,
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
    AND p.published_at IS NOT NULL
    AND p.published_at::date >= _start_date
    AND p.published_at::date <= _end_date
    AND (_platform IS NULL OR p.platform = _platform)
    AND (p.account_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM account_analytics_snapshots a 
      WHERE a.account_id = p.account_id 
        AND a.company_id = _company_id 
        AND a.is_active = false
    ))
  GROUP BY p.published_at::date
  ORDER BY p.published_at::date;
END;
$function$;