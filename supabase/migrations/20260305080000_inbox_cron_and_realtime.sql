-- Enable Realtime on inbox tables
alter publication supabase_realtime add table inbox_messages;
alter publication supabase_realtime add table inbox_conversations;

-- Register pg_cron jobs for inbox sync (every 5 min)
select cron.schedule(
  'inbox-sync-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/inbox-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Register pg_cron job to resurface snoozed conversations (every 5 minutes)
select cron.schedule(
  'inbox-resurface-snoozed',
  '*/5 * * * *',
  $$
  select inbox_resurface_snoozed();
  $$
);
