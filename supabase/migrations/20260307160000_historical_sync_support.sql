-- Historical Inbox Sync Support
-- Extends inbox_backfill_jobs to track historical data sync jobs (DMs + comments)
-- alongside existing AI classification backfill jobs.

ALTER TABLE inbox_backfill_jobs
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'classification'
    CHECK (job_type IN ('classification', 'historical_sync')),
  ADD COLUMN IF NOT EXISTS synced_conversations int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS synced_messages int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cursor_state jsonb;

-- Index for querying jobs by company + type + status
CREATE INDEX IF NOT EXISTS idx_backfill_company_type_status
  ON inbox_backfill_jobs(company_id, job_type, status);

-- Prevent duplicate active jobs of the same type per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_backfill_active_job_unique
  ON inbox_backfill_jobs(company_id, job_type)
  WHERE status IN ('pending', 'running');
