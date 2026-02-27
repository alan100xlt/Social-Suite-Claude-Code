
-- Update get_followers_by_date_platform to only include active accounts
CREATE OR REPLACE FUNCTION public.get_followers_by_date_platform(_company_id uuid, _start_date date, _end_date date)
 RETURNS TABLE(snapshot_date date, platform text, followers bigint)
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
    a.snapshot_date,
    a.platform,
    COALESCE(SUM(a.followers), 0)::bigint
  FROM account_analytics_snapshots a
  WHERE a.company_id = _company_id
    AND a.snapshot_date >= _start_date
    AND a.snapshot_date <= _end_date
    AND a.is_active = true
  GROUP BY a.snapshot_date, a.platform
  ORDER BY a.snapshot_date, a.platform;
END;
$function$;
