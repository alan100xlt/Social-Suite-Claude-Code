-- Register hourly cron job for GA analytics sync
-- Runs at :15 past each hour (offset from analytics-sync at :00)

INSERT INTO public.cron_job_settings (job_name, schedule, edge_function, description, enabled)
VALUES (
  'ga-analytics-sync-hourly',
  '15 * * * *',
  'ga-analytics-sync',
  'Pulls hourly page metrics and traffic source data from GA4 for all companies with active connections',
  true
)
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  edge_function = EXCLUDED.edge_function,
  description = EXCLUDED.description;
