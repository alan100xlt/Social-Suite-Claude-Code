-- Migration: Content Metadata
-- Adds content classification columns to rss_feed_items.
-- Creates journalists table for byline tracking.
-- Creates campaigns and campaign_posts tables.
-- Adds feed_item_id FK to post_drafts (fixes fragile title matching).

-- ===== STEP 1: Enrich rss_feed_items =====
ALTER TABLE public.rss_feed_items
  ADD COLUMN IF NOT EXISTS byline TEXT,
  ADD COLUMN IF NOT EXISTS content_classification JSONB,
  ADD COLUMN IF NOT EXISTS journalist_id UUID,
  ADD COLUMN IF NOT EXISTS last_recycled_at TIMESTAMPTZ;

-- content_classification schema:
-- { type: 'evergreen'|'timely'|'seasonal', is_evergreen: bool, evergreen_score: 0-1,
--   suggested_reshare_window: '30d'|'90d'|'180d', ai_reasoning: text }

-- ===== STEP 2: Create journalists table =====
CREATE TABLE public.journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  bio TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_journalists_company ON public.journalists(company_id);

ALTER TABLE public.journalists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.journalists
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_journalists" ON public.journalists
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add FK from rss_feed_items to journalists
ALTER TABLE public.rss_feed_items
  ADD CONSTRAINT fk_rss_feed_items_journalist
  FOREIGN KEY (journalist_id) REFERENCES public.journalists(id) ON DELETE SET NULL;

-- ===== STEP 3: Create campaigns table =====
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'completed', 'archived');

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(company_id, status);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.campaigns
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_campaigns" ON public.campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===== STEP 4: Create campaign_posts junction table =====
CREATE TABLE public.campaign_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL, -- GetLate post ID (external)
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER DEFAULT 0,
  UNIQUE (campaign_id, post_id)
);

CREATE INDEX idx_campaign_posts_campaign ON public.campaign_posts(campaign_id);
CREATE INDEX idx_campaign_posts_post ON public.campaign_posts(post_id);

ALTER TABLE public.campaign_posts ENABLE ROW LEVEL SECURITY;

-- Campaign posts inherit access from parent campaign
CREATE POLICY "tenant_via_campaign" ON public.campaign_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_posts.campaign_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_posts.campaign_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "service_role_campaign_posts" ON public.campaign_posts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===== STEP 5: Add feed_item_id FK to post_drafts =====
-- Fixes fragile title-based article-post linking
ALTER TABLE public.post_drafts
  ADD COLUMN IF NOT EXISTS feed_item_id UUID REFERENCES public.rss_feed_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_post_drafts_feed_item ON public.post_drafts(feed_item_id);
