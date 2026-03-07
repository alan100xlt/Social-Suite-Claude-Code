# Google Analytics Integration — End-to-End Content Journey

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect GA4 accounts via OAuth, pull hourly page metrics and referral data, correlate social posts to articles and traffic attribution, and build a new consolidated analytics experience showing the full content lifecycle: Article Published → Shared on Social → Clicks → On-Site Engagement.

**Architecture:** Direct Google OAuth (not through GetLate) stores refresh tokens in a new `google_analytics_connections` table. A new `ga-analytics-sync` edge function runs hourly via the cron dispatcher, pulling page-level metrics and traffic source breakdowns from the GA4 Data API. A correlation layer matches social post URLs to GA4 page paths. A new `/app/analytics/content-journey` page visualizes the full funnel.

**Tech Stack:** Google Analytics Data API v1 (GA4), Google OAuth 2.0, Supabase Edge Functions (Deno), TanStack Query v5, Recharts + Nivo, Tailwind/Shadcn

**Design Reference:** None — no visual design (backend-first, UI follows conventions)

---

## Phase 0: Database Schema + Google OAuth Connection

> **Session boundary:** Complete Phase 0 and Phase 1 (backend) before starting Phase 2 (frontend) in a new session.

### Task 1: Create the Google Analytics migration

**Files:**
- Create: `supabase/migrations/20260307200000_google_analytics.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- Google Analytics Integration Tables
-- ============================================================

-- 1. Connection storage (OAuth refresh tokens + property metadata)
CREATE TABLE IF NOT EXISTS google_analytics_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  property_id TEXT NOT NULL,           -- GA4 property ID (e.g., "properties/123456")
  property_name TEXT,                  -- Human-readable property name
  refresh_token TEXT NOT NULL,         -- Encrypted Google OAuth refresh token
  access_token TEXT,                   -- Short-lived access token (cached)
  token_expires_at TIMESTAMPTZ,       -- When cached access token expires
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, property_id)
);

-- 2. Page-level metrics (hourly snapshots)
CREATE TABLE IF NOT EXISTS ga_page_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,             -- e.g., "/blog/my-article"
  page_title TEXT,
  pageviews INTEGER DEFAULT 0,
  unique_pageviews INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(8,2) DEFAULT 0,   -- seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0,         -- percentage
  exit_rate DECIMAL(5,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,          -- Truncated to hour
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, snapshot_hour)
);

-- 3. Traffic source breakdown per page (hourly)
CREATE TABLE IF NOT EXISTS ga_referral_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  source TEXT NOT NULL,                -- e.g., "twitter.com", "google", "direct"
  medium TEXT NOT NULL,                -- e.g., "social", "organic", "referral", "(none)"
  campaign TEXT,                       -- UTM campaign (nullable)
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_session_duration DECIMAL(8,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  short_link_id TEXT,                  -- Future: link tracking integration (nullable)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, source, medium, snapshot_hour)
);

-- 4. Post-to-page correlation cache
CREATE TABLE IF NOT EXISTS post_page_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,               -- From post_analytics_snapshots.post_id
  platform TEXT NOT NULL,
  page_path TEXT NOT NULL,             -- Matched GA4 page path
  match_type TEXT NOT NULL DEFAULT 'url',  -- 'url' | 'utm' | 'manual'
  match_confidence DECIMAL(3,2) DEFAULT 1.0,  -- 0.0-1.0
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, post_id, page_path)
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE google_analytics_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_referral_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_page_correlations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (same pattern as post_analytics_snapshots)
CREATE POLICY "tenant_isolation" ON google_analytics_connections
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON ga_page_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON ga_referral_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON post_page_correlations
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_ga_page_company_hour ON ga_page_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_page_path ON ga_page_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_ga_referral_company_hour ON ga_referral_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_referral_source ON ga_referral_snapshots (company_id, source, medium, snapshot_hour);
CREATE INDEX idx_ga_referral_page ON ga_referral_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_post_page_post ON post_page_correlations (company_id, post_id);
CREATE INDEX idx_post_page_path ON post_page_correlations (company_id, page_path);
CREATE INDEX idx_ga_connections_company ON google_analytics_connections (company_id);

-- ── Grants ───────────────────────────────────────────────────
GRANT SELECT ON google_analytics_connections TO authenticated;
GRANT ALL ON google_analytics_connections TO service_role;
GRANT SELECT ON ga_page_snapshots TO authenticated;
GRANT ALL ON ga_page_snapshots TO service_role;
GRANT SELECT ON ga_referral_snapshots TO authenticated;
GRANT ALL ON ga_referral_snapshots TO service_role;
GRANT SELECT ON post_page_correlations TO authenticated;
GRANT ALL ON post_page_correlations TO service_role;

-- ── RPC Functions ────────────────────────────────────────────

-- Get page metrics aggregated by day for a date range
CREATE OR REPLACE FUNCTION get_ga_page_metrics(
  _company_id UUID,
  _start_date DATE,
  _end_date DATE,
  _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE,
  page_path TEXT,
  total_pageviews BIGINT,
  total_unique_pageviews BIGINT,
  total_sessions BIGINT,
  total_users BIGINT,
  avg_bounce_rate NUMERIC,
  avg_time_on_page NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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

-- Get traffic sources for a page or all pages
CREATE OR REPLACE FUNCTION get_ga_traffic_sources(
  _company_id UUID,
  _start_date DATE,
  _end_date DATE,
  _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  source TEXT,
  medium TEXT,
  total_sessions BIGINT,
  total_users BIGINT,
  total_pageviews BIGINT,
  avg_bounce_rate NUMERIC,
  avg_session_duration NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    grs.source,
    grs.medium,
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

-- Get content journey: social posts correlated with their page performance
CREATE OR REPLACE FUNCTION get_content_journey(
  _company_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  post_id TEXT,
  platform TEXT,
  post_content TEXT,
  post_url TEXT,
  published_at TIMESTAMPTZ,
  -- Social metrics
  impressions BIGINT,
  social_clicks BIGINT,
  likes BIGINT,
  shares BIGINT,
  engagement_rate NUMERIC,
  -- Web metrics (from GA)
  page_path TEXT,
  pageviews BIGINT,
  sessions_from_social BIGINT,
  bounce_rate NUMERIC,
  avg_time_on_page NUMERIC,
  -- Attribution
  match_type TEXT,
  match_confidence NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    pas.post_id,
    pas.platform,
    pas.content AS post_content,
    pas.post_url,
    pas.published_at,
    -- Social metrics
    COALESCE(pas.impressions, 0)::BIGINT,
    COALESCE(pas.clicks, 0)::BIGINT AS social_clicks,
    COALESCE(pas.likes, 0)::BIGINT,
    COALESCE(pas.shares, 0)::BIGINT,
    COALESCE(pas.engagement_rate, 0)::NUMERIC,
    -- Web metrics
    ppc.page_path,
    COALESCE(SUM(gps.pageviews), 0)::BIGINT AS pageviews,
    COALESCE(SUM(
      CASE WHEN grs.medium = 'social' THEN grs.sessions ELSE 0 END
    ), 0)::BIGINT AS sessions_from_social,
    ROUND(AVG(gps.bounce_rate), 2) AS bounce_rate,
    ROUND(AVG(gps.avg_time_on_page), 2) AS avg_time_on_page,
    -- Attribution
    ppc.match_type,
    ppc.match_confidence::NUMERIC
  FROM post_analytics_snapshots pas
  INNER JOIN post_page_correlations ppc
    ON ppc.company_id = pas.company_id
    AND ppc.post_id = pas.post_id
  LEFT JOIN ga_page_snapshots gps
    ON gps.company_id = ppc.company_id
    AND gps.page_path = ppc.page_path
    AND gps.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND gps.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
  LEFT JOIN ga_referral_snapshots grs
    ON grs.company_id = ppc.company_id
    AND grs.page_path = ppc.page_path
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

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_ga_page_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ga_traffic_sources TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_journey TO authenticated;
```

**Step 2: Verify the migration file is valid SQL**
Run: `cat supabase/migrations/20260307200000_google_analytics.sql | head -5`
Expected: First 5 lines of the migration visible

**Step 3: Commit**
`git commit -m "feat: add Google Analytics schema — connections, page snapshots, referral snapshots, correlations"`

---

### Task 2: Google OAuth edge function

**Files:**
- Create: `supabase/functions/google-analytics-auth/index.ts`

**Step 1: Write the edge function**

This function handles three actions:
- `start` — returns the Google OAuth consent URL
- `callback` — exchanges the auth code for tokens, stores refresh token
- `properties` — lists GA4 properties the user has access to (for property selection)
- `disconnect` — removes the connection

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GA4Property {
  name: string;         // "properties/123456"
  displayName: string;  // "My Website"
  propertyType: string;
  createTime: string;
  parent?: string;
}

interface GA4AccountSummary {
  name: string;
  account: string;
  displayName: string;
  propertySummaries?: {
    property: string;
    displayName: string;
    propertyType: string;
    parent?: string;
  }[];
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data: GoogleTokenResponse = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000); // 60s buffer

  return { accessToken: data.access_token, expiresAt };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authorize(req, { allowServiceRole: true });
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── ACTION: start ────────────────────────────────────────
    if (action === 'start') {
      const { redirectUrl, companyId } = body;
      if (!redirectUrl || !companyId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing redirectUrl or companyId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = btoa(JSON.stringify({ companyId, userId: auth.userId }));

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUrl,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        access_type: 'offline',
        prompt: 'consent',
        state,
        include_granted_scopes: 'true',
      });

      return new Response(
        JSON.stringify({ success: true, authUrl: `${GOOGLE_AUTH_URL}?${params}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── ACTION: callback ─────────────────────────────────────
    if (action === 'callback') {
      const { code, redirectUrl, state } = body;
      if (!code || !redirectUrl || !state) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing code, redirectUrl, or state' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode state
      let stateData: { companyId: string; userId: string };
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUrl,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return new Response(
          JSON.stringify({ success: false, error: `Token exchange failed: ${error}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens: GoogleTokenResponse = await tokenResponse.json();

      if (!tokens.refresh_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'No refresh token received. Revoke app access in Google account settings and try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user email
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      const googleEmail = userInfo.email || 'unknown';

      // Fetch available GA4 properties
      const propertiesResponse = await fetch(`${GA_ADMIN_API}/accountSummaries`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      let properties: { id: string; name: string }[] = [];
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        const summaries: GA4AccountSummary[] = propertiesData.accountSummaries || [];
        properties = summaries.flatMap(account =>
          (account.propertySummaries || []).map(prop => ({
            id: prop.property,       // "properties/123456"
            name: `${account.displayName} — ${prop.displayName}`,
          }))
        );
      }

      // Return tokens + properties for the frontend to complete the flow
      // (Frontend will call 'select-property' with the chosen property)
      return new Response(
        JSON.stringify({
          success: true,
          googleEmail,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          expiresIn: tokens.expires_in,
          properties,
          companyId: stateData.companyId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── ACTION: select-property ──────────────────────────────
    if (action === 'select-property') {
      const { companyId, propertyId, propertyName, googleEmail, refreshToken, accessToken, expiresIn } = body;

      if (!companyId || !propertyId || !refreshToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenExpiresAt = new Date(Date.now() + (expiresIn || 3600 - 60) * 1000);

      const { data, error } = await supabase
        .from('google_analytics_connections')
        .upsert({
          company_id: companyId,
          google_email: googleEmail || 'unknown',
          property_id: propertyId,
          property_name: propertyName || propertyId,
          refresh_token: refreshToken,
          access_token: accessToken || null,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'company_id,property_id' })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to save connection: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, connection: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── ACTION: disconnect ───────────────────────────────────
    if (action === 'disconnect') {
      const { connectionId, companyId } = body;

      const { error } = await supabase
        .from('google_analytics_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('company_id', companyId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('google-analytics-auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Verify file compiles (syntax check)**
Run: `cd supabase/functions/google-analytics-auth && deno check index.ts` (or just verify the file exists)
Expected: File created at `supabase/functions/google-analytics-auth/index.ts`

**Step 3: Commit**
`git commit -m "feat: add google-analytics-auth edge function — OAuth start, callback, property selection, disconnect"`

---

### Task 3: GA4 Data Sync edge function

**Files:**
- Create: `supabase/functions/ga-analytics-sync/index.ts`

**Step 1: Write the sync edge function**

This function is called by the cron dispatcher hourly per company. It:
1. Loads active GA connections for the company
2. Refreshes the access token if expired
3. Calls GA4 Data API `runReport` for page metrics
4. Calls GA4 Data API `runReport` for traffic source breakdown
5. Upserts snapshots into `ga_page_snapshots` and `ga_referral_snapshots`
6. Runs post-to-page URL correlation

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

const GA_DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEADLINE_MS = 50_000;
const FETCH_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 50;

interface GA4ReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

interface GA4RunReportResponse {
  rows?: GA4ReportRow[];
  rowCount?: number;
  metadata?: unknown;
}

interface GAConnection {
  id: string;
  company_id: string;
  property_id: string;
  property_name: string;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
}

async function getAccessToken(
  connection: GAConnection,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Check if cached token is still valid (with 60s buffer)
  if (connection.access_token && connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt > new Date(Date.now() + 60_000)) {
      return connection.access_token;
    }
  }

  // Refresh the token
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed for ${connection.property_id}: ${error}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);

  // Cache the new token
  await supabase
    .from('google_analytics_connections')
    .update({
      access_token: data.access_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', connection.id);

  return data.access_token;
}

async function runGA4Report(
  propertyId: string,
  accessToken: string,
  dimensions: string[],
  metrics: string[],
  startDate: string,
  endDate: string
): Promise<GA4ReportRow[]> {
  const response = await fetch(`${GA_DATA_API}/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map(name => ({ name })),
      metrics: metrics.map(name => ({ name })),
      limit: 10000,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GA4 runReport failed: ${response.status} — ${error}`);
  }

  const data: GA4RunReportResponse = await response.json();
  return data.rows || [];
}

function extractUrl(content: string | null, postUrl: string | null): string | null {
  // Try post URL first
  if (postUrl) return postUrl;
  if (!content) return null;

  // Extract first URL from post content
  const urlMatch = content.match(/https?:\/\/[^\s"'<>]+/);
  return urlMatch ? urlMatch[0] : null;
}

function urlToPagePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing env vars' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let targetCompanyId: string | null = null;
  try {
    const body = await req.clone().json();
    targetCompanyId = body.companyId || null;
  } catch { /* no body */ }

  const monitorName = targetCompanyId
    ? `ga-analytics-sync:${targetCompanyId.slice(0, 8)}`
    : 'ga-analytics-sync';
  const monitor = new CronMonitor(monitorName, supabase);
  await monitor.start();

  const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

  try {
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    // Load active GA connections
    let query = supabase
      .from('google_analytics_connections')
      .select('*')
      .eq('is_active', true);

    if (targetCompanyId) {
      query = query.eq('company_id', targetCompanyId);
    }

    const { data: connections, error: connError } = await query;
    if (connError) throw new Error(`Failed to load connections: ${connError.message}`);

    if (!connections || connections.length === 0) {
      await monitor.success({ message: 'No active GA connections' });
      return new Response(
        JSON.stringify({ success: true, message: 'No active GA connections' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      connectionsSynced: 0,
      totalConnections: connections.length,
      pageSnapshots: 0,
      referralSnapshots: 0,
      correlationsCreated: 0,
      errors: [] as string[],
      bailedEarly: false,
      durationMs: 0,
    };

    // Use last hour as the snapshot window (hourly cron)
    const now = new Date();
    const snapshotHour = new Date(now);
    snapshotHour.setMinutes(0, 0, 0);

    // GA4 API uses YYYY-MM-DD format for date ranges
    const today = now.toISOString().split('T')[0];
    // For hourly, we just pull today's data and upsert (idempotent)
    const startDate = today;
    const endDate = today;

    for (const connection of connections as GAConnection[]) {
      if (pastDeadline()) {
        results.bailedEarly = true;
        break;
      }

      try {
        const accessToken = await getAccessToken(connection, supabase);

        // ── Report 1: Page metrics ─────────────────────────
        if (!pastDeadline()) {
          const pageRows = await runGA4Report(
            connection.property_id,
            accessToken,
            ['pagePath', 'pageTitle', 'dateHour'],
            ['screenPageViews', 'sessions', 'totalUsers', 'bounceRate', 'averageSessionDuration'],
            startDate,
            endDate
          );

          const pageSnapshots = pageRows.map(row => {
            const dateHour = row.dimensionValues[2]?.value || ''; // YYYYMMDDHH
            const year = dateHour.slice(0, 4);
            const month = dateHour.slice(4, 6);
            const day = dateHour.slice(6, 8);
            const hour = dateHour.slice(8, 10);
            const hourTs = `${year}-${month}-${day}T${hour}:00:00Z`;

            return {
              company_id: connection.company_id,
              connection_id: connection.id,
              page_path: row.dimensionValues[0]?.value || '/',
              page_title: row.dimensionValues[1]?.value || null,
              pageviews: parseInt(row.metricValues[0]?.value || '0'),
              unique_pageviews: parseInt(row.metricValues[0]?.value || '0'), // GA4 doesn't have unique, use total
              sessions: parseInt(row.metricValues[1]?.value || '0'),
              users: parseInt(row.metricValues[2]?.value || '0'),
              bounce_rate: parseFloat(row.metricValues[3]?.value || '0') * 100,
              avg_time_on_page: parseFloat(row.metricValues[4]?.value || '0'),
              snapshot_hour: hourTs,
            };
          });

          // Batch upsert
          for (let i = 0; i < pageSnapshots.length && !pastDeadline(); i += BATCH_SIZE) {
            const batch = pageSnapshots.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
              .from('ga_page_snapshots')
              .upsert(batch, { onConflict: 'company_id,page_path,snapshot_hour', ignoreDuplicates: false });

            if (error) {
              results.errors.push(`Page snapshot batch error: ${error.message}`);
            } else {
              results.pageSnapshots += batch.length;
            }
          }
        }

        // ── Report 2: Traffic source breakdown ─────────────
        if (!pastDeadline()) {
          const referralRows = await runGA4Report(
            connection.property_id,
            accessToken,
            ['pagePath', 'sessionSource', 'sessionMedium', 'sessionCampaignName', 'dateHour'],
            ['sessions', 'totalUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration'],
            startDate,
            endDate
          );

          const referralSnapshots = referralRows.map(row => {
            const dateHour = row.dimensionValues[4]?.value || '';
            const year = dateHour.slice(0, 4);
            const month = dateHour.slice(4, 6);
            const day = dateHour.slice(6, 8);
            const hour = dateHour.slice(8, 10);
            const hourTs = `${year}-${month}-${day}T${hour}:00:00Z`;

            return {
              company_id: connection.company_id,
              connection_id: connection.id,
              page_path: row.dimensionValues[0]?.value || '/',
              source: row.dimensionValues[1]?.value || '(direct)',
              medium: row.dimensionValues[2]?.value || '(none)',
              campaign: row.dimensionValues[3]?.value || null,
              sessions: parseInt(row.metricValues[0]?.value || '0'),
              users: parseInt(row.metricValues[1]?.value || '0'),
              pageviews: parseInt(row.metricValues[2]?.value || '0'),
              bounce_rate: parseFloat(row.metricValues[3]?.value || '0') * 100,
              avg_session_duration: parseFloat(row.metricValues[4]?.value || '0'),
              snapshot_hour: hourTs,
            };
          });

          for (let i = 0; i < referralSnapshots.length && !pastDeadline(); i += BATCH_SIZE) {
            const batch = referralSnapshots.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
              .from('ga_referral_snapshots')
              .upsert(batch, { onConflict: 'company_id,page_path,source,medium,snapshot_hour', ignoreDuplicates: false });

            if (error) {
              results.errors.push(`Referral snapshot batch error: ${error.message}`);
            } else {
              results.referralSnapshots += batch.length;
            }
          }
        }

        // ── Step 3: Post-to-page URL correlation ───────────
        if (!pastDeadline()) {
          // Get recent social posts with URLs
          const { data: recentPosts } = await supabase
            .from('post_analytics_snapshots')
            .select('post_id, platform, content, post_url')
            .eq('company_id', connection.company_id)
            .not('published_at', 'is', null)
            .order('published_at', { ascending: false })
            .limit(500);

          if (recentPosts && recentPosts.length > 0) {
            // Get known GA page paths for this company
            const { data: knownPages } = await supabase
              .from('ga_page_snapshots')
              .select('page_path')
              .eq('company_id', connection.company_id)
              .order('snapshot_hour', { ascending: false })
              .limit(1000);

            const pagePathSet = new Set((knownPages || []).map(p => p.page_path));

            const correlations: any[] = [];
            for (const post of recentPosts) {
              const url = extractUrl(post.content, post.post_url);
              if (!url) continue;

              const pagePath = urlToPagePath(url);
              if (!pagePath || !pagePathSet.has(pagePath)) continue;

              correlations.push({
                company_id: connection.company_id,
                post_id: post.post_id,
                platform: post.platform,
                page_path: pagePath,
                match_type: 'url',
                match_confidence: 1.0,
              });
            }

            if (correlations.length > 0) {
              const { error } = await supabase
                .from('post_page_correlations')
                .upsert(correlations, { onConflict: 'company_id,post_id,page_path', ignoreDuplicates: true });

              if (!error) {
                results.correlationsCreated += correlations.length;
              }
            }
          }
        }

        // Update last sync time
        await supabase
          .from('google_analytics_connections')
          .update({ last_sync_at: new Date().toISOString(), sync_error: null })
          .eq('id', connection.id);

        results.connectionsSynced++;
      } catch (connError) {
        const errMsg = connError instanceof Error ? connError.message : 'Unknown error';
        results.errors.push(`Connection ${connection.id}: ${errMsg}`);

        await supabase
          .from('google_analytics_connections')
          .update({ sync_error: errMsg })
          .eq('id', connection.id);
      }
    }

    results.durationMs = Date.now() - startTime;
    await monitor.success(results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ga-analytics-sync error:', error);
    await monitor.error(error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Verify file exists**
Run: `ls -la supabase/functions/ga-analytics-sync/index.ts`
Expected: File exists

**Step 3: Commit**
`git commit -m "feat: add ga-analytics-sync edge function — hourly page metrics, traffic sources, post-to-page correlation"`

---

### Task 4: Register GA sync in cron dispatcher

**Files:**
- Modify: `supabase/functions/cron-dispatcher/index.ts`
- Create: `supabase/migrations/20260307200100_ga_analytics_cron.sql`

**Step 1: Add `ga-analytics-sync` to the cron dispatcher allowed list and fan-out list**

In `supabase/functions/cron-dispatcher/index.ts`:
- Add `'ga-analytics-sync'` to `ALLOWED_FUNCTIONS` array
- Add `'ga-analytics-sync'` to `fanOutFunctions` array

**Step 2: Create the cron job migration**

```sql
-- Register hourly cron job for GA analytics sync
-- Uses the cron dispatcher for per-company fan-out

-- Only register if pg_cron and pg_net are available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove if exists (idempotent)
    PERFORM cron.unschedule('ga-analytics-sync-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'ga-analytics-sync-hourly',
      '15 * * * *',
      format(
        'SELECT net.http_post(url := %L, headers := ''{"Content-Type":"application/json"}''::jsonb, body := ''{"function":"ga-analytics-sync"}''::jsonb)',
        current_setting('app.settings.supabase_url', true) || '/functions/v1/cron-dispatcher'
      )
    );
  END IF;
END $$;

-- Also register in cron_job_settings for the health dashboard
INSERT INTO cron_job_settings (job_name, display_name, description, schedule, is_enabled, category)
VALUES (
  'ga-analytics-sync-hourly',
  'Google Analytics Sync',
  'Pulls hourly page metrics and traffic source data from GA4 for all companies with active connections',
  '15 * * * *',
  true,
  'analytics'
)
ON CONFLICT (job_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  schedule = EXCLUDED.schedule;
```

**Step 3: Commit**
`git commit -m "feat: register ga-analytics-sync in cron dispatcher — hourly fan-out per company"`

---

## Phase 1: Frontend Hooks + Connection UI

### Task 5: Create Google Analytics API client and hooks

**Files:**
- Create: `src/lib/api/google-analytics.ts`
- Create: `src/hooks/useGoogleAnalytics.ts`
- Create: `src/hooks/useGAPageMetrics.ts`
- Create: `src/hooks/useGATrafficSources.ts`
- Create: `src/hooks/useContentJourney.ts`

**Step 1: Create the API client** (`src/lib/api/google-analytics.ts`)

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface GAConnection {
  id: string;
  company_id: string;
  google_email: string;
  property_id: string;
  property_name: string;
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
  sync_error: string | null;
}

export interface GAProperty {
  id: string;
  name: string;
}

export const googleAnalyticsApi = {
  async startAuth(companyId: string, redirectUrl: string) {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'start', companyId, redirectUrl },
    });
    if (error) return { success: false as const, error: error.message };
    return data as { success: boolean; authUrl?: string; error?: string };
  },

  async handleCallback(code: string, redirectUrl: string, state: string) {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'callback', code, redirectUrl, state },
    });
    if (error) return { success: false as const, error: error.message };
    return data as {
      success: boolean;
      googleEmail?: string;
      refreshToken?: string;
      accessToken?: string;
      expiresIn?: number;
      properties?: GAProperty[];
      companyId?: string;
      error?: string;
    };
  },

  async selectProperty(params: {
    companyId: string;
    propertyId: string;
    propertyName: string;
    googleEmail: string;
    refreshToken: string;
    accessToken: string;
    expiresIn: number;
  }) {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'select-property', ...params },
    });
    if (error) return { success: false as const, error: error.message };
    return data as { success: boolean; connection?: GAConnection; error?: string };
  },

  async disconnect(connectionId: string, companyId: string) {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'disconnect', connectionId, companyId },
    });
    if (error) return { success: false as const, error: error.message };
    return data as { success: boolean; error?: string };
  },

  async syncNow(companyId: string) {
    const { data, error } = await supabase.functions.invoke('ga-analytics-sync', {
      body: { companyId },
    });
    if (error) return { success: false as const, error: error.message };
    return data as { success: boolean; pageSnapshots?: number; referralSnapshots?: number; error?: string };
  },
};
```

**Step 2: Create connection management hook** (`src/hooks/useGoogleAnalytics.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { googleAnalyticsApi, GAConnection } from '@/lib/api/google-analytics';
import { toast } from 'sonner';

export function useGAConnections() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-connections', companyId],
    queryFn: async (): Promise<GAConnection[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('google_analytics_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as GAConnection[];
    },
    enabled: !!companyId,
  });
}

export function useConnectGA() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company selected');
      const redirectUrl = `${window.location.origin}/oauth-callback?platform=google-analytics`;
      const result = await googleAnalyticsApi.startAuth(company.id, redirectUrl);
      if (!result.success) throw new Error(result.error);

      // Open popup
      const width = 600, height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      window.open(result.authUrl, 'google-analytics-auth', `width=${width},height=${height},left=${left},top=${top}`);
    },
  });
}

export function useSyncGA() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company selected');
      const result = await googleAnalyticsApi.syncNow(company.id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ga-page-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ga-traffic-sources'] });
      queryClient.invalidateQueries({ queryKey: ['content-journey'] });
      queryClient.invalidateQueries({ queryKey: ['ga-connections'] });

      toast.success('Google Analytics synced', {
        description: `${data.pageSnapshots || 0} page metrics, ${data.referralSnapshots || 0} referral records`,
      });
    },
    onError: (error) => {
      toast.error('GA sync failed', { description: error.message });
    },
  });
}

export function useDisconnectGA() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!company?.id) throw new Error('No company selected');
      const result = await googleAnalyticsApi.disconnect(connectionId, company.id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ga-connections'] });
      toast.success('Google Analytics disconnected');
    },
  });
}
```

**Step 3: Create data hooks** (`src/hooks/useGAPageMetrics.ts`, `src/hooks/useGATrafficSources.ts`, `src/hooks/useContentJourney.ts`)

`src/hooks/useGAPageMetrics.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface GAPageMetric {
  metricDate: string;
  pagePath: string;
  totalPageviews: number;
  totalUniquePageviews: number;
  totalSessions: number;
  totalUsers: number;
  avgBounceRate: number;
  avgTimeOnPage: number;
}

export function useGAPageMetrics(params: { startDate: string; endDate: string; pagePath?: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-page-metrics', companyId, params],
    queryFn: async (): Promise<GAPageMetric[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_ga_page_metrics', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
        _page_path: params.pagePath || null,
      });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        metricDate: row.metric_date,
        pagePath: row.page_path,
        totalPageviews: Number(row.total_pageviews) || 0,
        totalUniquePageviews: Number(row.total_unique_pageviews) || 0,
        totalSessions: Number(row.total_sessions) || 0,
        totalUsers: Number(row.total_users) || 0,
        avgBounceRate: Number(row.avg_bounce_rate) || 0,
        avgTimeOnPage: Number(row.avg_time_on_page) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
```

`src/hooks/useGATrafficSources.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface GATrafficSource {
  source: string;
  medium: string;
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgBounceRate: number;
  avgSessionDuration: number;
}

export function useGATrafficSources(params: { startDate: string; endDate: string; pagePath?: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-traffic-sources', companyId, params],
    queryFn: async (): Promise<GATrafficSource[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_ga_traffic_sources', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
        _page_path: params.pagePath || null,
      });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        source: row.source,
        medium: row.medium,
        totalSessions: Number(row.total_sessions) || 0,
        totalUsers: Number(row.total_users) || 0,
        totalPageviews: Number(row.total_pageviews) || 0,
        avgBounceRate: Number(row.avg_bounce_rate) || 0,
        avgSessionDuration: Number(row.avg_session_duration) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
```

`src/hooks/useContentJourney.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface ContentJourneyItem {
  postId: string;
  platform: string;
  postContent: string | null;
  postUrl: string | null;
  publishedAt: string;
  // Social metrics
  impressions: number;
  socialClicks: number;
  likes: number;
  shares: number;
  engagementRate: number;
  // Web metrics
  pagePath: string;
  pageviews: number;
  sessionsFromSocial: number;
  bounceRate: number;
  avgTimeOnPage: number;
  // Attribution
  matchType: string;
  matchConfidence: number;
}

export function useContentJourney(params: { startDate: string; endDate: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['content-journey', companyId, params],
    queryFn: async (): Promise<ContentJourneyItem[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_content_journey', {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
      });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        postId: row.post_id,
        platform: row.platform,
        postContent: row.post_content,
        postUrl: row.post_url,
        publishedAt: row.published_at,
        impressions: Number(row.impressions) || 0,
        socialClicks: Number(row.social_clicks) || 0,
        likes: Number(row.likes) || 0,
        shares: Number(row.shares) || 0,
        engagementRate: Number(row.engagement_rate) || 0,
        pagePath: row.page_path,
        pageviews: Number(row.pageviews) || 0,
        sessionsFromSocial: Number(row.sessions_from_social) || 0,
        bounceRate: Number(row.bounce_rate) || 0,
        avgTimeOnPage: Number(row.avg_time_on_page) || 0,
        matchType: row.match_type,
        matchConfidence: Number(row.match_confidence) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
```

**Step 4: Commit**
`git commit -m "feat: add Google Analytics API client, connection hooks, page metrics, traffic sources, and content journey hooks"`

---

### Task 6: Add Google Analytics card to Connections page

**Files:**
- Modify: `src/pages/Connections.tsx`
- Create: `src/components/connections/GAPropertySelectionDialog.tsx`

**Step 1: Add a "Google Analytics" section below the social platforms grid**

This is a separate section because GA is not a social platform — it's a data source. Add it after the existing platforms grid with a distinct card style.

The card shows:
- Connection status (connected/disconnected)
- Connected property name + Google email
- Last sync time
- Connect/Disconnect/Sync buttons

**Step 2: Create the GA property selection dialog**

After OAuth callback, the user needs to pick which GA4 property to connect. `GAPropertySelectionDialog` receives the list of properties from the callback response, shows them in a radio list, and calls `select-property` on the chosen one.

Pattern: Follow `PageSelectionDialog.tsx` — same modal structure, same completion flow.

**Step 3: Wire up the OAuth callback for google-analytics platform**

In the `useEffect` message handler in `Connections.tsx`, handle `platform === 'google-analytics'`:
1. Extract `code` and `state` from the callback URL params
2. Call `googleAnalyticsApi.handleCallback(code, redirectUrl, state)`
3. If properties returned, open `GAPropertySelectionDialog`
4. On property selection, call `googleAnalyticsApi.selectProperty(...)`
5. Invalidate `ga-connections` query

**Step 4: Commit**
`git commit -m "feat: add Google Analytics connection card + property selection dialog to Connections page"`

---

### Task 7: Add demo data for Google Analytics

**Files:**
- Modify: `src/lib/demo/demo-data.ts`
- Modify: `src/lib/demo/DemoDataProvider.tsx`

**Step 1: Add demo GA fixtures to `demo-data.ts`**

Add:
- `DEMO_GA_CONNECTIONS` — one active connection with a demo property
- `DEMO_GA_PAGE_SNAPSHOTS` — 30 days of page-level data for 5 articles
- `DEMO_GA_REFERRAL_SNAPSHOTS` — traffic source breakdown (organic, social, direct, referral)
- `DEMO_CONTENT_JOURNEY` — pre-correlated social posts → articles

**Step 2: Populate query cache in `DemoDataProvider.tsx`**

Add `queryClient.setQueryData()` calls for:
- `['ga-connections', DEMO_COMPANY_ID]`
- `['ga-page-metrics', DEMO_COMPANY_ID, ...]`
- `['ga-traffic-sources', DEMO_COMPANY_ID, ...]`
- `['content-journey', DEMO_COMPANY_ID, ...]`

**Step 3: Commit**
`git commit -m "feat: add demo data fixtures for Google Analytics connections, page metrics, and content journey"`

---

## Phase 2: Content Journey Analytics Page

> **Session boundary:** Start a new session for Phase 2. Phase 0 + 1 should be complete and committed.

### Task 8: Create Content Journey page and route

**Files:**
- Create: `src/pages/ContentJourney.tsx`
- Modify: `src/App.tsx` (add route)

**Step 1: Register the route in App.tsx**

Add to the `/app/*` protected routes:
```typescript
<Route path="/app/analytics/content-journey" element={<ProtectedRoute><ContentJourney /></ProtectedRoute>} />
```

**Step 2: Build the Content Journey page**

Layout (three sections in a single scrollable page):

**Header:**
- Title: "Content Journey"
- Subtitle: "Track your content from social posts to website engagement"
- Date range filter (reuse existing `DateRangeFilter` component)
- "Sync GA" button (calls `useSyncGA`)
- Connection status badge (shows connected property or "Connect GA" CTA)

**Section 1: Overview KPI Cards (4-column grid)**
- Total Pageviews (from GA)
- Social Referral Traffic (from GA referral where medium=social)
- Social → Web Conversion Rate (social referral sessions / total social clicks)
- Avg Time on Page (from GA)

Each card uses `StatSparklineWidget` pattern from analytics-v2.

**Section 2: Content Hub Table**
- Table listing articles/pages with columns:
  - Page Title / Path
  - Total Pageviews
  - Sessions from Social
  - % of Traffic from Social
  - Avg Bounce Rate
  - Avg Time on Page
  - # Social Posts Linked
- Sortable columns
- Click row → expands to show linked social posts
- Use existing `Table` component from Shadcn

**Section 3: Top Content Journeys**
- Cards showing the full journey for top-performing correlated content:
  - Left: Social post preview (platform icon, content snippet, engagement metrics)
  - Arrow / flow indicator
  - Right: Web performance (pageviews, bounce rate, time on page)
- Uses `useContentJourney` hook data

**Section 4: Traffic Source Breakdown**
- Donut chart: traffic by source/medium (Nivo or Recharts)
- Bar chart: social platform breakdown (Twitter vs LinkedIn vs Facebook referral traffic)
- Uses `useGATrafficSources` hook

**Step 3: Add sidebar navigation link**

In `src/components/layout/DashboardLayout.tsx` (or wherever sidebar nav items are defined), add a "Content Journey" link under the Analytics section pointing to `/app/analytics/content-journey`.

**Step 4: Commit**
`git commit -m "feat: add Content Journey analytics page — KPIs, content hub table, journey cards, traffic sources"`

---

### Task 9: UTM auto-tagging in post composer

**Files:**
- Modify: `src/components/posts/` (wherever the compose/create post form is)

**Step 1: Add UTM parameter injection**

When a user composes a post and includes a URL, auto-append UTM parameters:
```
?utm_source=longtale&utm_medium=social&utm_campaign={company_slug}&utm_content={post_id_or_hash}
```

Rules:
- Only append to URLs that don't already have UTM params
- Show a small toggle "Auto-tag links for tracking" (default on)
- Preview the tagged URL before posting
- Store the UTM-tagged URL in post metadata for later correlation

**Step 2: Commit**
`git commit -m "feat: add UTM auto-tagging for links in post composer"`

---

### Task 10: Update CLAUDE.md with GA integration docs

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add section documenting:**
- New tables: `google_analytics_connections`, `ga_page_snapshots`, `ga_referral_snapshots`, `post_page_correlations`
- New edge functions: `google-analytics-auth`, `ga-analytics-sync`
- New hooks: `useGAConnections`, `useGAPageMetrics`, `useGATrafficSources`, `useContentJourney`
- New route: `/app/analytics/content-journey`
- Required secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Supabase Secrets only)
- Cron job: `ga-analytics-sync-hourly` (runs at :15 every hour)

**Step 2: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the secrets table**

| Secret | Location | Used By |
|--------|----------|---------|
| `GOOGLE_CLIENT_ID` | Supabase Secrets only | Edge functions (prod only) |
| `GOOGLE_CLIENT_SECRET` | Supabase Secrets only | Edge functions (prod only) |

**Step 3: Commit**
`git commit -m "docs: add Google Analytics integration to CLAUDE.md — tables, hooks, edge functions, secrets"`

---

## Pre-requisites (before implementation)

Before starting Phase 0, the implementing engineer must:

1. **Create a Google Cloud OAuth app:**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs: `https://your-domain.com/oauth-callback`
   - Enable the "Google Analytics Data API" in the API library
   - Enable the "Google Analytics Admin API" in the API library
   - Note the Client ID and Client Secret

2. **Set Supabase secrets:**
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=your-client-id
   supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Verify the OAuth callback page handles the `google-analytics` platform:**
   - Check `src/pages/OAuthCallback.tsx` passes query params back to the parent window

---

## Summary of deliverables

| # | Deliverable | Type | Files |
|---|-------------|------|-------|
| 1 | Database schema | Migration | `supabase/migrations/20260307200000_google_analytics.sql` |
| 2 | Google OAuth auth | Edge function | `supabase/functions/google-analytics-auth/index.ts` |
| 3 | GA4 data sync | Edge function | `supabase/functions/ga-analytics-sync/index.ts` |
| 4 | Cron registration | Migration + edit | `supabase/migrations/20260307200100_ga_analytics_cron.sql`, `cron-dispatcher/index.ts` |
| 5 | API client + hooks | Frontend | `src/lib/api/google-analytics.ts`, 4 hooks |
| 6 | Connection UI | Frontend | `Connections.tsx` edit, `GAPropertySelectionDialog.tsx` |
| 7 | Demo data | Frontend | `demo-data.ts`, `DemoDataProvider.tsx` |
| 8 | Content Journey page | Frontend | `src/pages/ContentJourney.tsx`, `App.tsx` |
| 9 | UTM auto-tagging | Frontend | Post composer edit |
| 10 | Documentation | Docs | `CLAUDE.md` |
