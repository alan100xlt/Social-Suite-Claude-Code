-- ============================================================================
-- Self-Healing Cron Watchdog
-- ============================================================================
-- Runs every 10 minutes. For each enabled job in cron_job_settings:
--   1. Checks if the job exists in cron.job — re-registers it if missing
--   2. Checks if the job is overdue (no run within 2x its interval) — retriggers
--   3. Checks for 3+ consecutive failures — retriggers after a cooldown
--   4. Logs all watchdog actions to cron_health_logs with job_name = 'cron-watchdog'
-- ============================================================================

-- Helper: parse a cron expression into an approximate interval in minutes
CREATE OR REPLACE FUNCTION public.cron_interval_minutes(_schedule text)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  parts text[];
  _min text;
  _hour text;
BEGIN
  parts := string_to_array(_schedule, ' ');
  IF array_length(parts, 1) < 5 THEN RETURN 60; END IF;

  _min  := parts[1];
  _hour := parts[2];

  -- */N in minute field
  IF _min ~ '^\*/[0-9]+$' THEN
    RETURN substring(_min from 3)::integer;
  END IF;

  -- */N in hour field means every N hours
  IF _min = '0' AND _hour ~ '^\*/[0-9]+$' THEN
    RETURN substring(_hour from 3)::integer * 60;
  END IF;

  -- Fixed minute + fixed hour = once a day
  IF _min ~ '^[0-9]+$' AND _hour ~ '^[0-9]+$' THEN
    RETURN 1440; -- 24 hours
  END IF;

  -- Fixed minute + * hour = every hour
  IF _min ~ '^[0-9]+$' AND _hour = '*' THEN
    RETURN 60;
  END IF;

  -- Fallback: assume hourly
  RETURN 60;
END;
$$;

-- ── Main watchdog function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job         cron_job_settings%ROWTYPE;
  _cron_exists boolean;
  _last_run    timestamptz;
  _last_status text;
  _interval_m  integer;
  _fail_streak integer;
  _actions     text[] := '{}';
  _cron_command text;
  _supabase_url text;
  _service_key  text;
BEGIN
  -- Fetch vault secrets once
  SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    INSERT INTO cron_health_logs (job_name, status, started_at, completed_at, duration_ms, error_message, details)
    VALUES ('cron-watchdog', 'error', now(), now(), 0,
            'Vault secrets missing (supabase_url or supabase_service_role_key)',
            '{"action": "vault_check_failed"}'::jsonb);
    RETURN;
  END IF;

  FOR _job IN SELECT * FROM cron_job_settings WHERE enabled = true LOOP

    -- 1. Check if job is registered in pg_cron
    SELECT EXISTS(
      SELECT 1 FROM cron.job WHERE jobname = _job.job_name
    ) INTO _cron_exists;

    IF NOT _cron_exists THEN
      -- Re-register the missing job
      _cron_command := format(
        $cmd$
        SELECT net.http_post(
          url := %L || '/functions/v1/%s',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := '{}'::jsonb
        );
        $cmd$,
        _supabase_url, _job.edge_function, _service_key
      );

      PERFORM cron.schedule(_job.job_name, _job.schedule, _cron_command);
      _actions := array_append(_actions, format('re-registered: %s', _job.job_name));

      -- Also trigger immediately since it was missing
      PERFORM net.http_post(
        url := _supabase_url || '/functions/v1/' || _job.edge_function,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body := '{}'::jsonb
      );
      _actions := array_append(_actions, format('triggered-after-reregister: %s', _job.job_name));

      CONTINUE; -- skip further checks for this job, we just fixed it
    END IF;

    -- 2. Check for staleness (no run within 2x expected interval)
    SELECT started_at, status INTO _last_run, _last_status
      FROM cron_health_logs
      WHERE job_name = _job.job_name
        OR job_name = _job.edge_function  -- logs use edge_function name
      ORDER BY created_at DESC LIMIT 1;

    _interval_m := cron_interval_minutes(_job.schedule);

    IF _last_run IS NOT NULL
       AND _last_run < now() - make_interval(mins := _interval_m * 2)
       AND _last_status != 'running'
    THEN
      -- Job is overdue, retrigger
      PERFORM net.http_post(
        url := _supabase_url || '/functions/v1/' || _job.edge_function,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body := '{}'::jsonb
      );
      _actions := array_append(_actions, format('retriggered-stale: %s (last: %s, interval: %sm)',
        _job.job_name, _last_run::text, _interval_m));
    END IF;

    -- 3. Check for consecutive failures (3+)
    SELECT count(*) INTO _fail_streak
      FROM (
        SELECT status FROM cron_health_logs
        WHERE (job_name = _job.job_name OR job_name = _job.edge_function)
          AND status != 'running'
        ORDER BY created_at DESC
        LIMIT 3
      ) recent
      WHERE recent.status = 'error';

    IF _fail_streak >= 3 THEN
      -- Only retrigger if last attempt was > 5 minutes ago (cooldown)
      IF _last_run IS NOT NULL AND _last_run < now() - interval '5 minutes' THEN
        PERFORM net.http_post(
          url := _supabase_url || '/functions/v1/' || _job.edge_function,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _service_key
          ),
          body := '{}'::jsonb
        );
        _actions := array_append(_actions, format('retriggered-after-failures: %s (%s consecutive errors)',
          _job.job_name, _fail_streak));
      END IF;
    END IF;

  END LOOP;

  -- Log watchdog run
  IF array_length(_actions, 1) > 0 THEN
    INSERT INTO cron_health_logs (job_name, status, started_at, completed_at, duration_ms, details)
    VALUES ('cron-watchdog', 'success', now(), now(), 0,
            jsonb_build_object('actions', to_jsonb(_actions)));
  END IF;
  -- Silent when nothing to do (avoid log spam)
END;
$$;

REVOKE ALL ON FUNCTION public.cron_watchdog() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_watchdog() TO service_role, postgres;
REVOKE ALL ON FUNCTION public.cron_interval_minutes(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_interval_minutes(text) TO service_role, postgres;

-- ── Register the watchdog as a pg_cron job (every 10 minutes) ───────────────

DO $$
BEGIN
  PERFORM cron.unschedule('cron-watchdog');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cron-watchdog',
  '*/10 * * * *',
  $$SELECT public.cron_watchdog()$$
);

-- Add watchdog to cron_job_settings so it shows in the CronHealth UI
INSERT INTO public.cron_job_settings (job_name, schedule, edge_function, description, enabled)
VALUES ('cron-watchdog', '*/10 * * * *', 'cron-watchdog', 'Self-healing watchdog: re-registers missing jobs, retriggers stale/failed jobs', true)
ON CONFLICT (job_name) DO NOTHING;
