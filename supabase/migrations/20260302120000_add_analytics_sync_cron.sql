-- SUPERSEDED by 20260303100100_fix_cron_jobs.sql
-- The infrastructure created by this migration has been removed.
-- Schedule hourly analytics sync via pg_cron + pg_net
-- Calls the analytics-sync edge function every hour at minute 0

SELECT cron.schedule(
  'analytics-sync-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http(
    (
      'POST',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/analytics-sync',
      ARRAY[
        extensions.http_header('Content-Type', 'application/json'),
        extensions.http_header('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'))
      ],
      'application/json',
      '{}'
    )::extensions.http_request
  );
  $$
);
