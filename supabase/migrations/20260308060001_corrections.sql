-- Correction compliance pipeline
CREATE TABLE public.corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  conversation_id uuid NOT NULL REFERENCES inbox_conversations(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','rejected')),
  assigned_to uuid REFERENCES auth.users(id),
  reporter_contact_ids uuid[] DEFAULT '{}',
  notes text,
  resolution_summary text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_corrections_company ON corrections(company_id, status);

ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage corrections" ON corrections
  FOR ALL USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
