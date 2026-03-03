-- SUPERSEDED by 20260303100100_fix_cron_jobs.sql
-- The infrastructure created by this migration has been removed.
-- Schedule RSS feed polling every 5 minutes via pg_cron + pg_net
-- Calls the rss-poll edge function with no body (polls all active feeds)

-- First unschedule if it already exists (idempotent)
SELECT cron.unschedule('rss-poll-every-5-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'rss-poll-every-5-min'
);

SELECT cron.schedule(
  'rss-poll-every-5-min',
  '*/5 * * * *',
  $$
  SELECT extensions.http(
    (
      'POST',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/rss-poll',
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
