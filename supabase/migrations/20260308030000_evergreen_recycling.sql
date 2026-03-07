-- Migration: Evergreen Recycling
-- Creates evergreen_queue table for tracking recycled content variations.

CREATE TYPE public.evergreen_status AS ENUM ('pending', 'published', 'skipped', 'failed');

CREATE TABLE public.evergreen_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_post_id TEXT, -- GetLate post ID
  article_id UUID REFERENCES public.rss_feed_items(id) ON DELETE SET NULL,
  variation_text TEXT NOT NULL,
  status evergreen_status NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_post_id TEXT, -- GetLate ID of the recycled post
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evergreen_queue_company ON public.evergreen_queue(company_id);
CREATE INDEX idx_evergreen_queue_status ON public.evergreen_queue(company_id, status);
CREATE INDEX idx_evergreen_queue_scheduled ON public.evergreen_queue(scheduled_for) WHERE status = 'pending';

ALTER TABLE public.evergreen_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evergreen_queue
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_evergreen" ON public.evergreen_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
