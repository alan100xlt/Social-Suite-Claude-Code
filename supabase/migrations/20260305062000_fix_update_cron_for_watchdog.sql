-- ============================================================================
-- Fix update_cron_job and trigger_cron_job to handle the watchdog
-- ============================================================================
-- The watchdog runs as a direct SQL function call, not an edge function.
-- When its schedule is updated, the cron command should be
-- SELECT public.cron_watchdog() rather than an HTTP POST.
-- ============================================================================

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
    -- Watchdog runs as direct SQL
    _cron_command := 'SELECT public.cron_watchdog()';
  ELSIF _settings.edge_function = 'cron-health-logs-cleanup' THEN
    -- Cleanup is also direct SQL
    _cron_command := 'DELETE FROM public.cron_health_logs WHERE created_at < now() - interval ''30 days''';
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

  -- Unschedule existing job (ignore if not found)
  BEGIN
    PERFORM cron.unschedule(_job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Re-schedule only if enabled
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

-- Also update trigger_cron_job to handle watchdog
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

  IF _settings.edge_function = 'cron-watchdog' THEN
    -- Run watchdog directly
    PERFORM public.cron_watchdog();
  ELSE
    -- Fire the edge function via pg_net
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/' || _settings.edge_function,
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
