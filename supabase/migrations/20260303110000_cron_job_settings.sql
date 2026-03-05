-- ============================================================================
-- Cron Job Settings: user-editable cron configuration
-- ============================================================================
-- Stores schedule + enabled state per job. The update_cron_job() RPC
-- propagates changes to pg_cron so admins can manage schedules from the UI.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_job_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL UNIQUE,
  schedule text NOT NULL,              -- cron expression, e.g. '0 9 * * *'
  edge_function text NOT NULL,         -- function name, e.g. 'getlate-changelog-monitor'
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with current registered jobs
INSERT INTO public.cron_job_settings (job_name, schedule, edge_function, description, enabled) VALUES
  ('analytics-sync-hourly', '0 * * * *', 'analytics-sync', 'Syncs GetLate analytics into Supabase snapshots', true),
  ('rss-poll-every-5-min', '*/5 * * * *', 'rss-poll', 'Polls RSS feeds for new articles', true),
  ('getlate-changelog-monitor', '0 9 * * *', 'getlate-changelog-monitor', 'Monitors GetLate API changelog for breaking changes', true)
ON CONFLICT (job_name) DO NOTHING;

-- RLS: authenticated users can read; only service role can write (via RPC)
ALTER TABLE public.cron_job_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cron settings"
  ON public.cron_job_settings
  FOR SELECT
  TO authenticated
  USING (true);

GRANT ALL ON public.cron_job_settings TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- RPC: update_cron_job — updates schedule/enabled in both the settings table
-- and pg_cron itself. Called from the CronHealth admin page.
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
  -- Fetch current settings
  SELECT * INTO _settings FROM cron_job_settings WHERE job_name = _job_name;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found: ' || _job_name);
  END IF;

  -- Apply updates
  IF _schedule IS NOT NULL THEN
    _settings.schedule := _schedule;
  END IF;
  IF _enabled IS NOT NULL THEN
    _settings.enabled := _enabled;
  END IF;
  IF _description IS NOT NULL THEN
    _settings.description := _description;
  END IF;

  -- Update settings table
  UPDATE cron_job_settings
  SET schedule = _settings.schedule,
      enabled = _settings.enabled,
      description = _settings.description,
      updated_at = now()
  WHERE job_name = _job_name;

  -- Build the pg_net command for this job
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

  -- Unschedule existing job (ignore if not found)
  BEGIN
    PERFORM cron.unschedule(_job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- job might not exist yet
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

-- Only service_role and postgres can execute this function
REVOKE ALL ON FUNCTION public.update_cron_job(text, text, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_cron_job(text, text, boolean, text) TO service_role, postgres;

-- ============================================================================
-- RPC: trigger_cron_job — manually triggers a cron job's edge function
-- ============================================================================

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

  -- Fire the edge function via pg_net
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/' || _settings.edge_function,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );

  RETURN jsonb_build_object('success', true, 'job_name', _job_name, 'triggered', true);
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_cron_job(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_cron_job(text) TO service_role, postgres;
