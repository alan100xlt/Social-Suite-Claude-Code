-- ============================================================================
-- Phase 6: Crisis Detection
-- Stores detected sentiment spikes for editor alerting.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbox_crisis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  negative_count int NOT NULL DEFAULT 0,
  threshold int NOT NULL DEFAULT 5,
  window_minutes int NOT NULL DEFAULT 30,
  topics text[] DEFAULT '{}',
  sample_conversation_ids uuid[] DEFAULT '{}',
  summary text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE inbox_crisis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crisis events for their company"
  ON inbox_crisis_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_crisis_events.company_id
        AND company_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update crisis events for their company"
  ON inbox_crisis_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_memberships.company_id = inbox_crisis_events.company_id
        AND company_memberships.user_id = auth.uid()
        AND company_memberships.role IN ('owner', 'admin')
    )
  );

-- Index for active crisis lookup
CREATE INDEX IF NOT EXISTS idx_inbox_crisis_events_active
  ON inbox_crisis_events(company_id, status)
  WHERE status = 'active';
