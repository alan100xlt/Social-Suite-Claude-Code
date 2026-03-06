-- ============================================================================
-- Fix: Missing INSERT policy, created_at index, updated_at trigger
-- for inbox_crisis_events (review agent findings)
-- ============================================================================

-- Service role (edge functions) inserts crisis events.
-- No user-facing INSERT needed — service_role bypasses RLS.
-- But add a DELETE policy for admin cleanup.
CREATE POLICY "Admins can delete crisis events for their company"
  ON inbox_crisis_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_crisis_events.company_id
        AND company_memberships.user_id = auth.uid()
        AND company_memberships.role IN ('owner', 'admin')
    )
  );

-- Index on created_at for time-window queries
CREATE INDEX IF NOT EXISTS idx_inbox_crisis_events_created_at
  ON inbox_crisis_events(company_id, created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_inbox_crisis_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inbox_crisis_events_updated_at
  BEFORE UPDATE ON inbox_crisis_events
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_crisis_events_updated_at();
