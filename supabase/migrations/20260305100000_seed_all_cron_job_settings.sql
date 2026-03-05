-- ============================================================================
-- SOC-113: Seed missing cron jobs into cron_job_settings
-- ============================================================================
-- 4 of 7 cron jobs were invisible in the CronHealth admin dashboard because
-- they were never added to the cron_job_settings table. This migration:
--   1. Adds a job_type column to distinguish edge_function vs sql jobs
--   2. Inserts the 4 missing jobs
--   3. Tags existing SQL-type jobs with the correct job_type
-- ============================================================================

-- Add job_type column to distinguish edge function jobs from SQL-only jobs
ALTER TABLE public.cron_job_settings
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'edge_function'
  CHECK (job_type IN ('edge_function', 'sql'));

-- Insert the 4 missing jobs (ON CONFLICT DO NOTHING — safe to re-run)
INSERT INTO public.cron_job_settings (job_name, schedule, edge_function, description, enabled)
VALUES
  ('cron-watchdog', '*/10 * * * *', 'cron-watchdog',
   'Self-healing watchdog: re-registers missing jobs, retriggers stale/failed jobs', true),
  ('cron-health-logs-cleanup', '0 3 * * *', 'cron-health-logs-cleanup',
   'Deletes cron_health_logs older than 30 days', true),
  ('inbox-sync-every-5-min', '*/5 * * * *', 'inbox-sync',
   'Syncs inbox comments and DMs from GetLate API', true),
  ('inbox-resurface-snoozed', '*/5 * * * *', 'inbox-resurface-snoozed',
   'Moves snoozed inbox conversations back to open when snooze expires', true)
ON CONFLICT (job_name) DO NOTHING;

-- Tag SQL-type jobs (these don't invoke edge functions via HTTP)
UPDATE public.cron_job_settings
SET job_type = 'sql'
WHERE job_name IN (
  'cron-watchdog',
  'cron-health-logs-cleanup',
  'inbox-resurface-snoozed'
);

-- Also update the trigger_cron_job function to handle the new SQL-type jobs
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

  -- SQL-type jobs: run directly or skip if no callable function
  IF _settings.edge_function = 'cron-watchdog' THEN
    PERFORM public.cron_watchdog();
  ELSIF _settings.edge_function = 'cron-health-logs-cleanup' THEN
    DELETE FROM public.cron_health_logs WHERE created_at < now() - interval '30 days';
  ELSIF _settings.edge_function = 'inbox-resurface-snoozed' THEN
    PERFORM public.inbox_resurface_snoozed();
  ELSE
    -- Standard edge function invocation via pg_net
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

-- Update update_cron_job to handle inbox-resurface-snoozed as SQL type
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
    -- Standard edge function invocation via pg_net
    _cron_command := format(
      $cmd$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/%s',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
        ),
        body := '{}'::jsonb
      );
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
