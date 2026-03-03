-- ============================================================================
-- Fix ALL Cron Jobs
-- ============================================================================
-- Problems:
--   1. analytics-sync-hourly uses extensions.http() which doesn't exist
--   2. getlate-changelog-monitor uses current_setting('app.settings...') which isn't set
--   3. rss-poll cron is not registered at all
-- Fix: Use net.http_post() from pg_net (installed v0.19.5) + vault secrets
-- ============================================================================

-- Unschedule broken crons
SELECT cron.unschedule('analytics-sync-hourly');
SELECT cron.unschedule('getlate-changelog-monitor');

-- Re-register analytics sync using pg_net
SELECT cron.schedule(
  'analytics-sync-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/analytics-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Register RSS poll cron using pg_net
SELECT cron.schedule(
  'rss-poll-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/rss-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Fix changelog monitor using pg_net + vault
SELECT cron.schedule(
  'getlate-changelog-monitor',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/getlate-changelog-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
