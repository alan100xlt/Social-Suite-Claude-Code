
-- Create global email settings table (single row, superadmin-managed)
CREATE TABLE public.global_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL DEFAULT 'GetLate',
  from_email text NOT NULL DEFAULT 'noreply@longtale.ai',
  reply_to_email text,
  logo_url text,
  accent_color text NOT NULL DEFAULT '#667eea',
  accent_color_end text NOT NULL DEFAULT '#764ba2',
  header_text_color text NOT NULL DEFAULT '#ffffff',
  body_background_color text NOT NULL DEFAULT '#ffffff',
  body_text_color text NOT NULL DEFAULT '#333333',
  footer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_email_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read/write
CREATE POLICY "Superadmin can manage global email settings"
ON public.global_email_settings FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- Service role can read (for edge functions)
CREATE POLICY "Service role can read global email settings"
ON public.global_email_settings FOR SELECT
USING (auth.role() = 'service_role');

-- Seed with existing defaults (or copy from company_email_settings if one exists)
INSERT INTO public.global_email_settings (sender_name, from_email, reply_to_email, logo_url, accent_color, accent_color_end, header_text_color, body_background_color, body_text_color, footer_text)
SELECT COALESCE(sender_name, 'GetLate'), COALESCE(from_email, 'noreply@longtale.ai'), reply_to_email, logo_url, COALESCE(accent_color, '#667eea'), COALESCE(accent_color_end, '#764ba2'), COALESCE(header_text_color, '#ffffff'), COALESCE(body_background_color, '#ffffff'), COALESCE(body_text_color, '#333333'), footer_text
FROM public.company_email_settings
LIMIT 1;

-- If no company settings exist, insert defaults
INSERT INTO public.global_email_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.global_email_settings);

-- Add updated_at trigger
CREATE TRIGGER update_global_email_settings_updated_at
BEFORE UPDATE ON public.global_email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
