-- Migration: Feature Configuration
-- Creates company_feature_config table for per-company feature toggles and config.

CREATE TABLE public.company_feature_config (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_feature_config ENABLE ROW LEVEL SECURITY;

-- Company members can read their config
CREATE POLICY "members_read_config" ON public.company_feature_config
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Only owners/admins can update config
CREATE POLICY "admins_manage_config" ON public.company_feature_config
  FOR ALL TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "service_role_config" ON public.company_feature_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed default config for all existing companies
INSERT INTO public.company_feature_config (company_id, config)
SELECT id, jsonb_build_object(
  'evergreen_recycling', jsonb_build_object('enabled', false, 'schedule', 'weekly', 'auto_publish', false),
  'breaking_news', jsonb_build_object('enabled', true),
  'quality_checker', jsonb_build_object('enabled', true, 'block_on_publish', true),
  'performance_alerts', jsonb_build_object('enabled', true, 'viral_threshold', 3.0, 'underperform_threshold', 0.3),
  'posting_throttle', jsonb_build_object('enabled', false, 'max_posts', 5, 'per_hours', 4),
  'media_library', jsonb_build_object('enabled', false, 'imagekit_url_endpoint', null),
  'brand_voice_learning', jsonb_build_object('enabled', false)
)
FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
