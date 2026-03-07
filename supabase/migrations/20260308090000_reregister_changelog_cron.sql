-- Re-register getlate-changelog-monitor cron job if missing
-- Uses cron-dispatcher pattern (same as 20260307180000)

DO $$
BEGIN
  -- Unschedule if exists (idempotent)
  BEGIN
    PERFORM cron.unschedule('getlate-changelog-monitor');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Re-register through cron-dispatcher
  PERFORM cron.schedule('getlate-changelog-monitor', '0 9 * * *',
    $cmd$SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/cron-dispatcher',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"function":"getlate-changelog-monitor"}'::jsonb
    )$cmd$);
END $$;
