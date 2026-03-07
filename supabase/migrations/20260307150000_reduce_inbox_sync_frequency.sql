-- Reduce inbox-sync cron from 5min to 15min (SOC-189)
-- DEPLOY ONLY after verified webhook delivery.
--
-- With getlate-webhook handling real-time events, polling becomes
-- a safety net only. Reduces API quota usage and edge fn invocations.

-- Remove old 5-minute schedule
SELECT cron.unschedule('inbox-sync-every-5-min');

-- Register new 15-minute schedule using the edge function dispatcher
-- (matches pattern from 20260307170000_cron_dispatcher_edge_function.sql)
SELECT cron.schedule(
  'inbox-sync-every-15-min',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/cron-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"function":"inbox-sync"}'::jsonb
  )$$
);
