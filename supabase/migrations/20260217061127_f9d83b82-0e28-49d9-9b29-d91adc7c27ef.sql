
-- Create company_voice_settings table
CREATE TABLE public.company_voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  voice_mode text NOT NULL DEFAULT 'default',
  require_ai_review boolean NOT NULL DEFAULT false,
  tone text NOT NULL DEFAULT 'neutral',
  content_length text NOT NULL DEFAULT 'standard',
  emoji_style text NOT NULL DEFAULT 'contextual',
  hashtag_strategy text NOT NULL DEFAULT 'smart',
  brand_tags text[] NOT NULL DEFAULT '{}',
  extract_locations boolean NOT NULL DEFAULT false,
  custom_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create global_voice_defaults table
CREATE TABLE public.global_voice_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tone text NOT NULL DEFAULT 'neutral',
  content_length text NOT NULL DEFAULT 'standard',
  emoji_style text NOT NULL DEFAULT 'contextual',
  hashtag_strategy text NOT NULL DEFAULT 'smart',
  brand_tags text[] NOT NULL DEFAULT '{}',
  extract_locations boolean NOT NULL DEFAULT false,
  custom_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_voice_defaults ENABLE ROW LEVEL SECURITY;

-- RLS for company_voice_settings
CREATE POLICY "Company members can view voice settings"
  ON public.company_voice_settings FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Owners and admins can manage voice settings"
  ON public.company_voice_settings FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Superadmin can manage all voice settings"
  ON public.company_voice_settings FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role can read voice settings"
  ON public.company_voice_settings FOR SELECT
  USING (auth.role() = 'service_role');

-- RLS for global_voice_defaults
CREATE POLICY "Superadmin can manage global voice defaults"
  ON public.global_voice_defaults FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role can read global voice defaults"
  ON public.global_voice_defaults FOR SELECT
  USING (auth.role() = 'service_role');

-- Updated_at triggers
CREATE TRIGGER update_company_voice_settings_updated_at
  BEFORE UPDATE ON public.company_voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_voice_defaults_updated_at
  BEFORE UPDATE ON public.global_voice_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single global defaults row
INSERT INTO public.global_voice_defaults (tone, content_length, emoji_style, hashtag_strategy)
VALUES ('neutral', 'standard', 'contextual', 'smart');
