-- RPC wrapper to expose pg_cron job list via PostgREST
-- Only accessible by service_role (SECURITY DEFINER runs as owner)

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport int,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
  FROM cron.job
  ORDER BY jobname;
$$;

-- Restrict to service_role only
REVOKE ALL ON FUNCTION public.get_cron_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cron_jobs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO service_role;
