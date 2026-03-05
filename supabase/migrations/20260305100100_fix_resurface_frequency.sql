-- SOC-115: inbox-resurface-snoozed was running every minute — reduce to every 5 minutes.
-- This corrective migration handles the case where the original migration (20260305080000)
-- was already applied with the '* * * * *' schedule.

select cron.unschedule('inbox-resurface-snoozed');

select cron.schedule(
  'inbox-resurface-snoozed',
  '*/5 * * * *',
  $$SELECT public.inbox_resurface_snoozed()$$
);
