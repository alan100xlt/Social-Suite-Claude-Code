-- ============================================================================
-- Phase 8: Social Intelligence Audit — Backfill Jobs Table
-- Tracks async backfill progress and stores audit reports.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbox_backfill_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_conversations int DEFAULT 0,
  classified_conversations int DEFAULT 0,
  total_posts int DEFAULT 0,
  analyzed_posts int DEFAULT 0,
  report_data jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE inbox_backfill_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backfill jobs for their company"
  ON inbox_backfill_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_backfill_jobs.company_id
        AND company_memberships.user_id = auth.uid()
    )
  );

-- Index for active job lookup
CREATE INDEX IF NOT EXISTS idx_inbox_backfill_jobs_company_status
  ON inbox_backfill_jobs(company_id, status);
