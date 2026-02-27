
-- Platform-wide settings managed by superadmin
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name text NOT NULL DEFAULT 'GetLate',
  platform_logo_url text,
  platform_favicon_url text,
  platform_domain text DEFAULT 'social.longtale.ai',
  support_email text DEFAULT 'support@longtale.ai',
  primary_color text DEFAULT '#667eea',
  secondary_color text DEFAULT '#764ba2',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only one row allowed
CREATE UNIQUE INDEX platform_settings_singleton ON public.platform_settings ((true));

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Superadmin can manage
CREATE POLICY "Superadmin can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Service role can read (for edge functions)
CREATE POLICY "Service role can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (auth.role() = 'service_role'::text);

-- All authenticated users can read (for UI branding)
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (auth.role() = 'authenticated'::text);

-- Seed default row
INSERT INTO public.platform_settings (platform_name) VALUES ('GetLate');

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
