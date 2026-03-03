-- ============================================================================
-- Create cron_health_logs table
-- ============================================================================
-- This table stores execution logs from CronMonitor (used by analytics-sync,
-- rss-poll, getlate-changelog-monitor edge functions).
-- The CronHealth admin page reads from this table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_health_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for the CronHealth page query (order by created_at desc, filter by job_name)
CREATE INDEX idx_cron_health_logs_created_at ON public.cron_health_logs (created_at DESC);
CREATE INDEX idx_cron_health_logs_job_name ON public.cron_health_logs (job_name);

-- RLS: Allow authenticated users to read logs (admin page)
ALTER TABLE public.cron_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cron logs"
  ON public.cron_health_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant table permissions to all roles
GRANT ALL ON public.cron_health_logs TO postgres, anon, authenticated, service_role;

-- Service role needs insert/update for CronMonitor (edge functions use service role key)
-- No explicit policy needed — service role bypasses RLS.

-- Keep table size manageable: auto-delete logs older than 30 days
-- This runs daily at 3:00 AM UTC
SELECT cron.schedule(
  'cron-health-logs-cleanup',
  '0 3 * * *',
  $$DELETE FROM public.cron_health_logs WHERE created_at < now() - interval '30 days'$$
);
