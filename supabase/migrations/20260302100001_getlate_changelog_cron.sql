-- Schedule getlate-changelog-monitor to run daily at 9am UTC
-- Uses pg_net to call the edge function (pg_cron + pg_net pattern)
-- pg_cron and pg_net are already enabled (see 20260124080643 migration)

SELECT cron.schedule(
  'getlate-changelog-monitor',   -- job name (unique)
  '0 9 * * *',                   -- 9am UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/getlate-changelog-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
