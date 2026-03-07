-- Team activity feed: logs all team actions on inbox conversations
CREATE TABLE public.inbox_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('assigned','status_changed','replied','noted','labeled','escalated','correction_created','correction_resolved')),
  conversation_id uuid REFERENCES inbox_conversations(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_log_company ON inbox_activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON inbox_activity_log(company_id, user_id);

ALTER TABLE inbox_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view activity" ON inbox_activity_log
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Company members can insert activity" ON inbox_activity_log
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
