-- ============================================================================
-- Unify ALL edge function cron jobs through cron-dispatcher
-- ============================================================================
-- Problem: 3 cron jobs (rss-poll, getlate-changelog-monitor, cron-escalation)
-- still use the old vault-based auth pattern (direct HTTP with service role key
-- from vault). The cron-dispatcher migration (20260307170000) only migrated
-- inbox-sync and analytics-sync. This migration completes the unification.
--
-- Also fixes: inbox-sync was re-registered at 5min in 20260307170000,
-- reverting the intended 15min frequency from 20260307150000.
-- ============================================================================

-- 1. Unschedule all vault-based edge function crons + conflicting entries
SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN (
  'rss-poll-every-5-min',
  'getlate-changelog-monitor',
  'cron-escalation-every-30-min',
  'inbox-sync-every-5-min',
  'inbox-sync-every-15-min',
  'analytics-sync-hourly'
);

-- 2. Re-register ALL edge function jobs through cron-dispatcher (no auth header)

-- inbox-sync: 15min (intended frequency per SOC-189)
SELECT cron.schedule('inbox-sync-every-15-min', '*/15 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"inbox-sync"}'::jsonb
  )$$);

-- analytics-sync: hourly
SELECT cron.schedule('analytics-sync-hourly', '0 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"analytics-sync"}'::jsonb
  )$$);

-- rss-poll: every 5min
SELECT cron.schedule('rss-poll-every-5-min', '*/5 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"rss-poll"}'::jsonb
  )$$);

-- getlate-changelog-monitor: daily 9 AM
SELECT cron.schedule('getlate-changelog-monitor', '0 9 * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"getlate-changelog-monitor"}'::jsonb
  )$$);

-- cron-escalation: every 30min
SELECT cron.schedule('cron-escalation-every-30-min', '*/30 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"cron-escalation"}'::jsonb
  )$$);

-- 3. Fix inbox-sync schedule in cron_job_settings (was 5min, should be 15min)
UPDATE cron_job_settings
SET schedule = '*/15 * * * *',
    job_name = 'inbox-sync-every-15-min'
WHERE job_name = 'inbox-sync-every-5-min';

-- 4. Update trigger_cron_job to route ALL edge function jobs through dispatcher
CREATE OR REPLACE FUNCTION public.trigger_cron_job(_job_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    -- ALL edge function jobs go through the dispatcher
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

-- 5. Update update_cron_job to route through dispatcher instead of direct vault auth
CREATE OR REPLACE FUNCTION public.update_cron_job(
  _job_name text,
  _schedule text DEFAULT NULL,
  _enabled boolean DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings cron_job_settings%ROWTYPE;
  _cron_command text;
BEGIN
  SELECT * INTO _settings FROM cron_job_settings WHERE job_name = _job_name;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found: ' || _job_name);
  END IF;

  IF _schedule IS NOT NULL THEN
    _settings.schedule := _schedule;
  END IF;
  IF _enabled IS NOT NULL THEN
    _settings.enabled := _enabled;
  END IF;
  IF _description IS NOT NULL THEN
    _settings.description := _description;
  END IF;

  UPDATE cron_job_settings
  SET schedule = _settings.schedule,
      enabled = _settings.enabled,
      description = _settings.description,
      updated_at = now()
  WHERE job_name = _job_name;

  -- Build the cron command based on job type
  IF _settings.edge_function = 'cron-watchdog' THEN
    _cron_command := 'SELECT public.cron_watchdog()';
  ELSIF _settings.edge_function = 'cron-health-logs-cleanup' THEN
    _cron_command := 'DELETE FROM public.cron_health_logs WHERE created_at < now() - interval ''30 days''';
  ELSIF _settings.edge_function = 'inbox-resurface-snoozed' THEN
    _cron_command := 'SELECT public.inbox_resurface_snoozed()';
  ELSE
    -- ALL edge function jobs route through the dispatcher (no vault service key needed)
    _cron_command := format(
      $cmd$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/cron-dispatcher',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{"function":"%s"}'::jsonb
      )
      $cmd$,
      _settings.edge_function
    );
  END IF;

  BEGIN
    PERFORM cron.unschedule(_job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF _settings.enabled THEN
    PERFORM cron.schedule(_job_name, _settings.schedule, _cron_command);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_name', _job_name,
    'schedule', _settings.schedule,
    'enabled', _settings.enabled
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_cron_job(text, text, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_cron_job(text, text, boolean, text) TO service_role, postgres;
