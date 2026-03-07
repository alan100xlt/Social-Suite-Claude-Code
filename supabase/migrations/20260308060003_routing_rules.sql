-- Beat/desk routing rules
CREATE TABLE public.routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  category text NOT NULL,
  subcategory text,
  assigned_to uuid REFERENCES auth.users(id),
  desk_name text,
  priority_override text CHECK (priority_override IN ('low','normal','high','urgent')),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_routing_rules_company ON routing_rules(company_id, enabled);

ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage routing" ON routing_rules
  FOR ALL USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
