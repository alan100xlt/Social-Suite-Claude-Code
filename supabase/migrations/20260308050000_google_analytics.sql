-- ============================================================
-- Google Analytics Integration Tables
-- ============================================================
-- Adds GA4 OAuth connection storage, hourly page metrics,
-- traffic source breakdowns, and post-to-page URL correlations.

-- 1. Connection storage (OAuth refresh tokens + property metadata)
CREATE TABLE IF NOT EXISTS public.google_analytics_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  property_id TEXT NOT NULL,
  property_name TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, property_id)
);

-- 2. Page-level metrics (hourly snapshots)
CREATE TABLE IF NOT EXISTS public.ga_page_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  pageviews INTEGER DEFAULT 0,
  unique_pageviews INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(8,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  exit_rate DECIMAL(5,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, snapshot_hour)
);

-- 3. Traffic source breakdown per page (hourly)
CREATE TABLE IF NOT EXISTS public.ga_referral_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_session_duration DECIMAL(8,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  short_link_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, source, medium, snapshot_hour)
);

-- 4. Post-to-page correlation cache
CREATE TABLE IF NOT EXISTS public.post_page_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  page_path TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'url',
  match_confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, post_id, page_path)
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.google_analytics_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_referral_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_page_correlations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (authenticated users see only own company)
CREATE POLICY "tenant_isolation" ON public.google_analytics_connections
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_ga_connections" ON public.google_analytics_connections
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation" ON public.ga_page_snapshots
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_ga_page_snapshots" ON public.ga_page_snapshots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation" ON public.ga_referral_snapshots
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_ga_referral_snapshots" ON public.ga_referral_snapshots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation" ON public.post_page_correlations
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "service_role_post_page_correlations" ON public.post_page_correlations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_ga_connections_company ON public.google_analytics_connections (company_id);
CREATE INDEX idx_ga_page_company_hour ON public.ga_page_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_page_path ON public.ga_page_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_ga_referral_company_hour ON public.ga_referral_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_referral_source ON public.ga_referral_snapshots (company_id, source, medium, snapshot_hour);
CREATE INDEX idx_ga_referral_page ON public.ga_referral_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_post_page_post ON public.post_page_correlations (company_id, post_id);
CREATE INDEX idx_post_page_path ON public.post_page_correlations (company_id, page_path);

-- ── RPC Functions ────────────────────────────────────────────

-- Aggregate page metrics by day
CREATE OR REPLACE FUNCTION public.get_ga_page_metrics(
  _company_id UUID, _start_date DATE, _end_date DATE, _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE, page_path TEXT,
  total_pageviews BIGINT, total_unique_pageviews BIGINT,
  total_sessions BIGINT, total_users BIGINT,
  avg_bounce_rate NUMERIC, avg_time_on_page NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Access control: only company members
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    (gps.snapshot_hour AT TIME ZONE 'UTC')::DATE AS metric_date,
    gps.page_path,
    COALESCE(SUM(gps.pageviews), 0)::BIGINT,
    COALESCE(SUM(gps.unique_pageviews), 0)::BIGINT,
    COALESCE(SUM(gps.sessions), 0)::BIGINT,
    COALESCE(SUM(gps.users), 0)::BIGINT,
    ROUND(AVG(gps.bounce_rate), 2),
    ROUND(AVG(gps.avg_time_on_page), 2)
  FROM ga_page_snapshots gps
  WHERE gps.company_id = _company_id
    AND gps.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND gps.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
    AND (_page_path IS NULL OR gps.page_path = _page_path)
  GROUP BY metric_date, gps.page_path
  ORDER BY metric_date DESC, total_pageviews DESC;
END;
$function$;

-- Aggregate traffic sources
CREATE OR REPLACE FUNCTION public.get_ga_traffic_sources(
  _company_id UUID, _start_date DATE, _end_date DATE, _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  source TEXT, medium TEXT,
  total_sessions BIGINT, total_users BIGINT, total_pageviews BIGINT,
  avg_bounce_rate NUMERIC, avg_session_duration NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    grs.source, grs.medium,
    COALESCE(SUM(grs.sessions), 0)::BIGINT,
    COALESCE(SUM(grs.users), 0)::BIGINT,
    COALESCE(SUM(grs.pageviews), 0)::BIGINT,
    ROUND(AVG(grs.bounce_rate), 2),
    ROUND(AVG(grs.avg_session_duration), 2)
  FROM ga_referral_snapshots grs
  WHERE grs.company_id = _company_id
    AND grs.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND grs.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
    AND (_page_path IS NULL OR grs.page_path = _page_path)
  GROUP BY grs.source, grs.medium
  ORDER BY total_sessions DESC;
END;
$function$;

-- Content journey: join social post metrics with GA page metrics
CREATE OR REPLACE FUNCTION public.get_content_journey(
  _company_id UUID, _start_date DATE, _end_date DATE
)
RETURNS TABLE (
  post_id TEXT, platform TEXT, post_content TEXT, post_url TEXT,
  published_at TIMESTAMPTZ,
  impressions BIGINT, social_clicks BIGINT, likes BIGINT, shares BIGINT,
  engagement_rate NUMERIC,
  page_path TEXT, pageviews BIGINT, sessions_from_social BIGINT,
  bounce_rate NUMERIC, avg_time_on_page NUMERIC,
  match_type TEXT, match_confidence NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    pas.post_id, pas.platform, pas.content, pas.post_url, pas.published_at,
    COALESCE(pas.impressions, 0)::BIGINT,
    COALESCE(pas.clicks, 0)::BIGINT,
    COALESCE(pas.likes, 0)::BIGINT,
    COALESCE(pas.shares, 0)::BIGINT,
    COALESCE(pas.engagement_rate, 0)::NUMERIC,
    ppc.page_path,
    COALESCE(SUM(gps.pageviews), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN grs.medium = 'social' THEN grs.sessions ELSE 0 END), 0)::BIGINT,
    ROUND(AVG(gps.bounce_rate), 2),
    ROUND(AVG(gps.avg_time_on_page), 2),
    ppc.match_type, ppc.match_confidence::NUMERIC
  FROM post_analytics_snapshots pas
  INNER JOIN post_page_correlations ppc
    ON ppc.company_id = pas.company_id AND ppc.post_id = pas.post_id
  LEFT JOIN ga_page_snapshots gps
    ON gps.company_id = ppc.company_id AND gps.page_path = ppc.page_path
    AND gps.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND gps.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
  LEFT JOIN ga_referral_snapshots grs
    ON grs.company_id = ppc.company_id AND grs.page_path = ppc.page_path
    AND grs.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND grs.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
  WHERE pas.company_id = _company_id
    AND pas.published_at IS NOT NULL
    AND pas.published_at::DATE >= _start_date
    AND pas.published_at::DATE <= _end_date
  GROUP BY
    pas.post_id, pas.platform, pas.content, pas.post_url, pas.published_at,
    pas.impressions, pas.clicks, pas.likes, pas.shares, pas.engagement_rate,
    ppc.page_path, ppc.match_type, ppc.match_confidence
  ORDER BY pas.published_at DESC;
END;
$function$;
