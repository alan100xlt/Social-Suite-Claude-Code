
-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  feed_id uuid REFERENCES public.rss_feeds(id) ON DELETE SET NULL,
  objective text NOT NULL DEFAULT 'auto',
  action text NOT NULL DEFAULT 'publish',
  approval_emails text[] NOT NULL DEFAULT '{}',
  account_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Company members can view rules
CREATE POLICY "Company members can view automation rules"
ON public.automation_rules
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Owners and admins can manage rules
CREATE POLICY "Owners and admins can manage automation rules"
ON public.automation_rules
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Superadmin full access
CREATE POLICY "Superadmin can manage all automation rules"
ON public.automation_rules
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- Superadmin can view all
CREATE POLICY "Superadmin can view all automation rules"
ON public.automation_rules
FOR SELECT
USING (is_superadmin());

-- Trigger for updated_at
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
