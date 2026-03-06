-- ============================================================================
-- Fan-out cron dispatch for multi-tenant scaling
-- ============================================================================
-- Instead of one edge function processing ALL companies sequentially,
-- dispatch one HTTP request per company. pg_net processes them concurrently.
-- This scales to 1000s of companies without timeout issues.
-- ============================================================================

-- Create a dispatch function that fans out sync jobs per company
CREATE OR REPLACE FUNCTION public.dispatch_company_sync(_function_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base_url text;
  _service_key text;
  _company RECORD;
  _count int := 0;
BEGIN
  -- Get Supabase URL and service role key from vault
  SELECT decrypted_secret INTO _base_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF _base_url IS NULL OR _service_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing vault secrets');
  END IF;

  -- Fan out: one HTTP request per company with a getlate_profile_id
  FOR _company IN
    SELECT id FROM companies WHERE getlate_profile_id IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := _base_url || '/functions/v1/' || _function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object('companyId', _company.id)
    );
    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'function', _function_name,
    'companies_dispatched', _count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_company_sync(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_company_sync(text) TO service_role, postgres;

-- Re-register inbox-sync cron to use fan-out dispatch
SELECT cron.unschedule('inbox-sync-every-5-min');
SELECT cron.schedule(
  'inbox-sync-every-5-min',
  '*/5 * * * *',
  $$SELECT public.dispatch_company_sync('inbox-sync')$$
);

-- Re-register analytics-sync cron to use fan-out dispatch
SELECT cron.unschedule('analytics-sync-hourly');
SELECT cron.schedule(
  'analytics-sync-hourly',
  '0 * * * *',
  $$SELECT public.dispatch_company_sync('analytics-sync')$$
);

-- Update trigger_cron_job to use fan-out for these two functions
CREATE OR REPLACE FUNCTION public.trigger_cron_job(_job_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings cron_job_settings%ROWTYPE;
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

  -- Fan-out jobs: dispatch per company
  ELSIF _settings.edge_function IN ('inbox-sync', 'analytics-sync') THEN
    RETURN public.dispatch_company_sync(_settings.edge_function);

  ELSE
    -- Standard single-invocation edge function
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/' || _settings.edge_function,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'job_name', _job_name, 'triggered', true);
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_cron_job(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_cron_job(text) TO service_role, postgres;
