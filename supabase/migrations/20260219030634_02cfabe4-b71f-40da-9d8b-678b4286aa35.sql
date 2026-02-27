
-- 1. Allow anonymous company creation during discovery
ALTER TABLE companies ALTER COLUMN created_by DROP NOT NULL;

-- 2. Add onboarding tracking columns
ALTER TABLE companies 
  ADD COLUMN onboarding_status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0;

-- 3. Set existing companies as complete
UPDATE companies SET onboarding_status = 'complete', onboarding_step = 3;

-- 4. Discovery leads table for marketing contact data
CREATE TABLE public.discovery_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  website_url text NOT NULL,
  contact_emails text[] NOT NULL DEFAULT '{}',
  contact_phones text[] NOT NULL DEFAULT '{}',
  social_channels jsonb NOT NULL DEFAULT '[]',
  crawl_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE discovery_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage" ON discovery_leads
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "member_read" ON discovery_leads
  FOR SELECT USING (user_is_member(auth.uid(), company_id) OR is_superadmin());

-- 5. Service role policy for companies (anonymous creation from edge function)
CREATE POLICY "service_role_manage_companies" ON companies
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
