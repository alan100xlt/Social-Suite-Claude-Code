
-- Create email branding settings table (one row per company)
CREATE TABLE public.company_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'GetLate',
  from_email TEXT NOT NULL DEFAULT 'noreply@longtale.ai',
  reply_to_email TEXT,
  logo_url TEXT,
  accent_color TEXT NOT NULL DEFAULT '#667eea',
  accent_color_end TEXT NOT NULL DEFAULT '#764ba2',
  header_text_color TEXT NOT NULL DEFAULT '#ffffff',
  body_background_color TEXT NOT NULL DEFAULT '#ffffff',
  body_text_color TEXT NOT NULL DEFAULT '#333333',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_email_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company members can view email settings"
ON public.company_email_settings FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and admins can manage email settings"
ON public.company_email_settings FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Superadmin can manage all email settings"
ON public.company_email_settings FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

CREATE POLICY "Service role can read email settings"
ON public.company_email_settings FOR SELECT
USING (auth.role() = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_company_email_settings_updated_at
BEFORE UPDATE ON public.company_email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
