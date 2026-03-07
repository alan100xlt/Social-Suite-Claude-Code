-- ============================================================================
-- Replace SQL-based vault dispatch with edge function dispatcher
-- ============================================================================
-- Eliminates vault as a secret store for auth keys. The cron-dispatcher
-- edge function uses its own auto-injected SUPABASE_SERVICE_ROLE_KEY,
-- so there's one source of truth for the service role key.
-- ============================================================================

-- Step 1: Unschedule all cron jobs that used the old SQL dispatcher
-- (handles both naming conventions from previous migrations)
SELECT cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'inbox-sync-every-5-min',
    'inbox-sync-fan-out',
    'analytics-sync-hourly'
  );

-- Step 2: Get the Supabase URL for registering new cron jobs
-- We still need the URL from vault for the cron.schedule command,
-- but NOT the service role key (that's the whole point).
-- pg_cron calls the dispatcher without auth (verify_jwt=false).

-- Step 3: Re-register cron jobs to call the edge function dispatcher
-- No Authorization header needed — verify_jwt=false on cron-dispatcher
SELECT cron.schedule(
  'inbox-sync-every-5-min',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"inbox-sync"}'::jsonb
  )$$
);

SELECT cron.schedule(
  'analytics-sync-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"analytics-sync"}'::jsonb
  )$$
);

-- Step 4: Update trigger_cron_job to route fan-out jobs through the dispatcher
CREATE OR REPLACE FUNCTION public.trigger_cron_job(_job_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings cron_job_settings%ROWTYPE;
  _base_url text;
BEGIN
  SELECT * INTO _settings FROM cron_job_settings WHERE job_name = _job_name;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found: ' || _job_name);
  END IF;

  -- SQL-type jobs: run directly
  IF _settings.edge_function = 'cron-watchdog' THEN
    PERFORM public.cron_watchdog();
  ELSIF _settings.edge_function = 'cron-health-logs-cleanup' THEN
    DELETE FROM public.cron_health_logs WHERE created_at < now() - interval '30 days';
  ELSIF _settings.edge_function = 'inbox-resurface-snoozed' THEN
    PERFORM public.inbox_resurface_snoozed();

  ELSE
    -- All edge function jobs go through the dispatcher (no vault key needed)
    SELECT decrypted_secret INTO _base_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    PERFORM net.http_post(
      url := _base_url || '/functions/v1/cron-dispatcher',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('function', _settings.edge_function)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'job_name', _job_name, 'triggered', true);
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_cron_job(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_cron_job(text) TO service_role, postgres;

-- Note: dispatch_company_sync() is kept for backward compatibility but
-- the cron jobs no longer use it. It can be dropped in a future migration.
