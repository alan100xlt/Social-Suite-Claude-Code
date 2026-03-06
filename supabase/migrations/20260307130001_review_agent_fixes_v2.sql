-- ============================================================================
-- Review Agent Iteration 2 Fixes:
-- 1. Add WITH CHECK to crisis_events UPDATE policy
-- 2. Add updated_at trigger for inbox_backfill_jobs
-- ============================================================================

-- Fix 1: Recreate UPDATE policy with explicit WITH CHECK to prevent
-- company_id tampering (admin could change company_id without it)
DROP POLICY IF EXISTS "Admins can update crisis events for their company" ON inbox_crisis_events;
CREATE POLICY "Admins can update crisis events for their company"
  ON inbox_crisis_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_crisis_events.company_id
        AND company_memberships.user_id = auth.uid()
        AND company_memberships.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_crisis_events.company_id
        AND company_memberships.user_id = auth.uid()
        AND company_memberships.role IN ('owner', 'admin')
    )
  );

-- Fix 2: Auto-update updated_at trigger for inbox_backfill_jobs
CREATE OR REPLACE FUNCTION update_inbox_backfill_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inbox_backfill_jobs_updated_at ON inbox_backfill_jobs;
CREATE TRIGGER trigger_inbox_backfill_jobs_updated_at
  BEFORE UPDATE ON inbox_backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_backfill_jobs_updated_at();
