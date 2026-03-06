-- ============================================================================
-- Cron escalation: auto-detect consecutive cron failures and create Linear issues
-- ============================================================================
-- Runs every 30 minutes. Checks cron_health_logs for consecutive errors on
-- monitored jobs (inbox-sync, analytics-sync, rss-poll). If 3+ consecutive
-- errors are found, creates a Linear issue. Auto-resolves when the job recovers.
--
-- Requires LINEAR_API_KEY to be set as a Supabase secret.
-- ============================================================================

-- Register the cron-escalation edge function in cron_job_settings
INSERT INTO public.cron_job_settings (job_name, schedule, edge_function, description, enabled, job_type)
VALUES (
  'cron-escalation-every-30-min',
  '*/30 * * * *',
  'cron-escalation',
  'Detects consecutive cron failures and creates Linear issues for automated remediation. Auto-resolves when jobs recover.',
  true,
  'edge_function'
)
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  edge_function = EXCLUDED.edge_function,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  job_type = EXCLUDED.job_type;

-- Register the pg_cron job using vault secrets (same pattern as fan-out dispatch)
DO $$
DECLARE
  _base_url text;
  _service_key text;
BEGIN
  SELECT decrypted_secret INTO _base_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF _base_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'Missing vault secrets (supabase_url or supabase_service_role_key). Cron-escalation job not registered.';
    RETURN;
  END IF;

  -- Unschedule if already exists (safe re-run)
  BEGIN
    PERFORM cron.unschedule('cron-escalation-every-30-min');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'cron-escalation-every-30-min',
    '*/30 * * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url := %L || '/functions/v1/cron-escalation',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cmd$,
      _base_url,
      _service_key
    )
  );
END;
$$;

-- Update trigger_cron_job to handle the new escalation function
-- (it's a standard edge_function type, so the existing ELSE branch handles it already)
-- No changes needed to trigger_cron_job.
