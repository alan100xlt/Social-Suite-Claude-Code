-- ============================================================================
-- Re-register ALL pg_cron jobs
-- ============================================================================
-- The cron.job table is empty despite migrations having run.
-- This migration idempotently unschedules then re-schedules all jobs
-- using the same pg_net + vault pattern from 20260303100100_fix_cron_jobs.sql.
-- ============================================================================

-- Safely unschedule any existing jobs (ignore errors if not found)
DO $$
BEGIN
  PERFORM cron.unschedule('analytics-sync-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('rss-poll-every-5-min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('getlate-changelog-monitor');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cron-health-logs-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Analytics Sync (every hour) ─────────────────────────────────────────────
SELECT cron.schedule(
  'analytics-sync-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/analytics-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── RSS Poll (every 5 minutes) ──────────────────────────────────────────────
SELECT cron.schedule(
  'rss-poll-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/rss-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── GetLate Changelog Monitor (daily at 9 AM UTC) ──────────────────────────
SELECT cron.schedule(
  'getlate-changelog-monitor',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/getlate-changelog-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── Cron Health Logs Cleanup (daily at 3 AM UTC) ────────────────────────────
SELECT cron.schedule(
  'cron-health-logs-cleanup',
  '0 3 * * *',
  $$DELETE FROM public.cron_health_logs WHERE created_at < now() - interval '30 days'$$
);
