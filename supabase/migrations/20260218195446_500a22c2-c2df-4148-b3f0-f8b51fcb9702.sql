
CREATE OR REPLACE FUNCTION public.get_post_analytics_by_date_platform(
  _company_id uuid,
  _start_date date,
  _end_date date
)
RETURNS TABLE(
  snapshot_date date,
  platform text,
  impressions bigint,
  views bigint,
  clicks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  GROUP BY p.snapshot_date, p.platform
  ORDER BY p.snapshot_date, p.platform;
END;
$function$;
