-- Portfolio Analytics System for Enterprise Media Companies
-- Provides aggregated analytics across all portfolio companies

-- Portfolio analytics snapshots for media companies
CREATE TABLE IF NOT EXISTS portfolio_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Time period for analytics
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    
    -- Aggregated metrics across all child companies
    total_posts BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_engagement BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_shares BIGINT DEFAULT 0,
    total_followers BIGINT DEFAULT 0,
    
    -- Engagement metrics
    engagement_rate NUMERIC(5, 4) DEFAULT 0,
    click_through_rate NUMERIC(5, 4) DEFAULT 0,
    share_rate NUMERIC(5, 4) DEFAULT 0,
    follower_growth_rate NUMERIC(5, 4) DEFAULT 0,
    
    -- Platform breakdowns
    platform_metrics JSONB DEFAULT '{}',
    company_metrics JSONB DEFAULT '{}',
    content_type_metrics JSONB DEFAULT '{}',
    
    -- Performance indicators
    top_performing_companies JSONB DEFAULT '[]',
    worst_performing_companies JSONB DEFAULT '[]',
    top_performing_content JSONB DEFAULT '[]',
    
    -- Trend data
    trend_data JSONB DEFAULT '{}',
    growth_metrics JSONB DEFAULT '{}',
    
    -- Benchmarking
    industry_benchmarks JSONB DEFAULT '{}',
    portfolio_ranking JSONB DEFAULT '{}',
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT now(),
    data_source TEXT DEFAULT 'aggregated' CHECK (data_source IN ('aggregated', 'cached', 'realtime')),
    calculation_duration_ms INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT portfolio_analytics_unique_period UNIQUE(media_company_id, period_start, period_end, period_type)
);

-- Company comparison analytics
CREATE TABLE IF NOT EXISTS company_comparison_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Comparison period
    comparison_period_start TIMESTAMPTZ NOT NULL,
    comparison_period_end TIMESTAMPTZ NOT NULL,
    baseline_period_start TIMESTAMPTZ NOT NULL,
    baseline_period_end TIMESTAMPTZ NOT NULL,
    
    -- Companies being compared
    company_ids UUID[] NOT NULL,
    
    -- Comparison metrics
    performance_comparison JSONB DEFAULT '{}',
    growth_comparison JSONB DEFAULT '{}',
    engagement_comparison JSONB DEFAULT '{}',
    platform_comparison JSONB DEFAULT '{}',
    
    -- Rankings
    performance_ranking JSONB DEFAULT '[]',
    growth_ranking JSONB DEFAULT '[]',
    engagement_ranking JSONB DEFAULT '[]',
    
    -- Insights
    key_insights JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    anomalies JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Real-time portfolio metrics cache
CREATE TABLE IF NOT EXISTS portfolio_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Cache key for different metric types
    cache_key TEXT NOT NULL,
    cache_type TEXT NOT NULL CHECK (cache_type IN ('overview', 'trends', 'comparisons', 'benchmarks')),
    
    -- Cached data
    metrics_data JSONB NOT NULL,
    
    -- Cache metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT portfolio_metrics_cache_unique UNIQUE(media_company_id, cache_key, cache_type)
);

-- Portfolio alert system
CREATE TABLE IF NOT EXISTS portfolio_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('performance', 'engagement', 'growth', 'anomaly', 'benchmark')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Alert content
    title TEXT NOT NULL,
    description TEXT,
    metrics JSONB DEFAULT '{}',
    
    -- Alert status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    
    -- Related entities
    company_ids UUID[] DEFAULT '{}',
    platform_ids TEXT[] DEFAULT '{}',
    content_ids UUID[] DEFAULT '{}',
    
    -- Alert lifecycle
    triggered_at TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes for portfolio analytics
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_media_company_period ON portfolio_analytics_snapshots(media_company_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_period_type ON portfolio_analytics_snapshots(period_type, calculated_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_calculated_at ON portfolio_analytics_snapshots(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_comparison_media_company ON company_comparison_analytics(media_company_id, comparison_period_start);
CREATE INDEX IF NOT EXISTS idx_company_comparison_companies ON company_comparison_analytics USING GIN(company_ids);

CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_cache_media_company ON portfolio_metrics_cache(media_company_id, cache_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_cache_expires ON portfolio_metrics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_cache_key ON portfolio_metrics_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_portfolio_alerts_media_company ON portfolio_alerts(media_company_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_alerts_type_severity ON portfolio_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_portfolio_alerts_companies ON portfolio_alerts USING GIN(company_ids);

-- RLS Policies for portfolio analytics
ALTER TABLE portfolio_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_comparison_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_alerts ENABLE ROW LEVEL SECURITY;

-- Portfolio analytics RLS
CREATE POLICY "Users can view portfolio analytics for their media companies" ON portfolio_analytics_snapshots
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to portfolio analytics" ON portfolio_analytics_snapshots
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Company comparison analytics RLS
CREATE POLICY "Users can view comparisons for their media companies" ON company_comparison_analytics
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can create comparisons for their media companies" ON company_comparison_analytics
FOR INSERT WITH CHECK (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

CREATE POLICY "Service role full access to comparisons" ON company_comparison_analytics
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Portfolio metrics cache RLS
CREATE POLICY "Users can view cache for their media companies" ON portfolio_metrics_cache
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to metrics cache" ON portfolio_metrics_cache
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Portfolio alerts RLS
CREATE POLICY "Users can view alerts for their media companies" ON portfolio_alerts
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can manage alerts for their media companies" ON portfolio_alerts
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Functions for portfolio analytics

-- Function to calculate portfolio analytics
CREATE OR REPLACE FUNCTION calculate_portfolio_analytics(
    _media_company_id UUID,
    _period_start TIMESTAMPTZ,
    _period_end TIMESTAMPTZ,
    _period_type TEXT DEFAULT 'daily'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_analytics_id UUID;
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_total_posts BIGINT := 0;
    v_total_impressions BIGINT := 0;
    v_total_engagement BIGINT := 0;
    v_total_clicks BIGINT := 0;
    v_total_shares BIGINT := 0;
    v_total_followers BIGINT := 0;
    v_engagement_rate NUMERIC := 0;
    v_platform_metrics JSONB := '{}';
    v_company_metrics JSONB := '{}';
    v_content_type_metrics JSONB := '{}';
BEGIN
    -- Validate user has access to media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = current_setting('app.current_user_id', true)::UUID
        AND _media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this media company';
    END IF;
    
    -- Get child companies for this media company
    WITH child_companies AS (
        SELECT child_company_id 
        FROM media_company_hierarchy 
        WHERE media_company_id = _media_company_id
    ),
    
    -- Aggregate post analytics
    post_analytics AS (
        SELECT 
            COUNT(*) as total_posts,
            COALESCE(SUM(impressions), 0) as total_impressions,
            COALESCE(SUM(engagement), 0) as total_engagement,
            COALESCE(SUM(clicks), 0) as total_clicks,
            COALESCE(SUM(shares), 0) as total_shares,
            platform,
            company_id
        FROM post_analytics_snapshots pas
        JOIN child_companies cc ON pas.company_id = cc.child_company_id
        WHERE pas.period_start >= _period_start
        AND pas.period_end <= _period_end
        GROUP BY platform, company_id
    ),
    
    -- Aggregate account analytics
    account_analytics AS (
        SELECT 
            COALESCE(SUM(followers), 0) as total_followers,
            company_id
        FROM account_analytics_snapshots aas
        JOIN child_companies cc ON aas.company_id = cc.child_company_id
        WHERE aas.period_start >= _period_start
        AND aas.period_end <= _period_end
        GROUP BY company_id
    )
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(total_posts), 0),
        COALESCE(SUM(total_impressions), 0),
        COALESCE(SUM(total_engagement), 0),
        COALESCE(SUM(total_clicks), 0),
        COALESCE(SUM(total_shares), 0),
        COALESCE(SUM(total_followers), 0)
    INTO v_total_posts, v_total_impressions, v_total_engagement, v_total_clicks, v_total_shares, v_total_followers
    FROM post_analytics pa
    FULL OUTER JOIN account_analytics aa ON pa.company_id = aa.company_id;
    
    -- Calculate engagement rate
    IF v_total_impressions > 0 THEN
        v_engagement_rate := (v_total_engagement::NUMERIC / v_total_impressions::NUMERIC) * 100;
    END IF;
    
    -- Build platform metrics
    SELECT jsonb_object_agg(platform, jsonb_build_object(
        'posts', total_posts,
        'impressions', total_impressions,
        'engagement', total_engagement,
        'engagement_rate', CASE WHEN total_impressions > 0 THEN (total_engagement::NUMERIC / total_impressions::NUMERIC) * 100 ELSE 0 END
    ))
    INTO v_platform_metrics
    FROM post_analytics;
    
    -- Build company metrics
    SELECT jsonb_object_agg(
        company_id::TEXT, 
        jsonb_build_object(
            'posts', COALESCE(pa.total_posts, 0),
            'impressions', COALESCE(pa.total_impressions, 0),
            'engagement', COALESCE(pa.total_engagement, 0),
            'followers', COALESCE(aa.total_followers, 0)
        )
    )
    INTO v_company_metrics
    FROM post_analytics pa
    FULL OUTER JOIN account_analytics aa ON pa.company_id = aa.company_id;
    
    -- Insert portfolio analytics
    INSERT INTO portfolio_analytics_snapshots (
        media_company_id,
        period_start,
        period_end,
        period_type,
        total_posts,
        total_impressions,
        total_engagement,
        total_clicks,
        total_shares,
        total_followers,
        engagement_rate,
        platform_metrics,
        company_metrics,
        calculation_duration_ms
    ) VALUES (
        _media_company_id,
        _period_start,
        _period_end,
        _period_type,
        v_total_posts,
        v_total_impressions,
        v_total_engagement,
        v_total_clicks,
        v_total_shares,
        v_total_followers,
        v_engagement_rate,
        v_platform_metrics,
        v_company_metrics,
        EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_time))::INTEGER
    ) RETURNING id INTO v_analytics_id;
    
    -- Cache the overview metrics
    INSERT INTO portfolio_metrics_cache (
        media_company_id,
        cache_key,
        cache_type,
        metrics_data,
        expires_at
    ) VALUES (
        _media_company_id,
        'overview_' || _period_type || '_' || EXTRACT(EPOCH FROM _period_start)::TEXT,
        'overview',
        jsonb_build_object(
            'total_posts', v_total_posts,
            'total_impressions', v_total_impressions,
            'total_engagement', v_total_engagement,
            'engagement_rate', v_engagement_rate,
            'total_followers', v_total_followers,
            'platform_breakdown', v_platform_metrics,
            'calculated_at', clock_timestamp()
        ),
        now() + INTERVAL '1 hour'
    )
    ON CONFLICT (media_company_id, cache_key, cache_type)
    DO UPDATE SET
        metrics_data = EXCLUDED.metrics_data,
        expires_at = EXCLUDED.expires_at,
        hit_count = portfolio_metrics_cache.hit_count + 1,
        last_hit_at = now();
    
    RETURN v_analytics_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to calculate portfolio analytics: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to get portfolio overview
CREATE OR REPLACE FUNCTION get_portfolio_overview(
    _media_company_id UUID,
    _period_type TEXT DEFAULT 'daily'
)
RETURNS TABLE (
    total_posts BIGINT,
    total_impressions BIGINT,
    total_engagement BIGINT,
    total_followers BIGINT,
    engagement_rate NUMERIC,
    platform_breakdown JSONB,
    top_companies JSONB,
    trend_data JSONB,
    last_calculated TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
-- Try cache first
WITH cached_data AS (
    SELECT 
        (metrics_data->>'total_posts')::BIGINT as total_posts,
        (metrics_data->>'total_impressions')::BIGINT as total_impressions,
        (metrics_data->>'total_engagement')::BIGINT as total_engagement,
        (metrics_data->>'total_followers')::BIGINT as total_followers,
        (metrics_data->>'engagement_rate')::NUMERIC as engagement_rate,
        metrics_data->'platform_breakdown' as platform_breakdown,
        metrics_data->'top_companies' as top_companies,
        metrics_data->'trend_data' as trend_data,
        (metrics_data->>'calculated_at')::TIMESTAMPTZ as last_calculated
    FROM portfolio_metrics_cache pmc
    WHERE pmc.media_company_id = _media_company_id
    AND pmc.cache_type = 'overview'
    AND pmc.cache_key LIKE 'overview_' || _period_type || '%'
    AND pmc.expires_at > now()
    ORDER BY pmc.created_at DESC
    LIMIT 1
),
-- Fallback to calculating if cache miss
fresh_data AS (
    SELECT 
        pas.total_posts,
        pas.total_impressions,
        pas.total_engagement,
        pas.total_followers,
        pas.engagement_rate,
        pas.platform_metrics as platform_breakdown,
        pas.top_performing_companies as top_companies,
        pas.trend_data,
        pas.calculated_at as last_calculated
    FROM portfolio_analytics_snapshots pas
    WHERE pas.media_company_id = _media_company_id
    AND pas.period_type = _period_type
    ORDER BY pas.calculated_at DESC
    LIMIT 1
)
SELECT * FROM cached_data
UNION ALL
SELECT * FROM fresh_data
WHERE NOT EXISTS (SELECT 1 FROM cached_data)
LIMIT 1;
$$;

-- Function to compare companies
CREATE OR REPLACE FUNCTION compare_portfolio_companies(
    _media_company_id UUID,
    _company_ids UUID[],
    _period_start TIMESTAMPTZ,
    _period_end TIMESTAMPTZ
)
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    posts BIGINT,
    impressions BIGINT,
    engagement BIGINT,
    engagement_rate NUMERIC,
    followers BIGINT,
    growth_rate NUMERIC,
    performance_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH company_analytics AS (
    SELECT 
        c.id as company_id,
        c.name as company_name,
        COALESCE(pas.total_posts, 0) as posts,
        COALESCE(pas.total_impressions, 0) as impressions,
        COALESCE(pas.total_engagement, 0) as engagement,
        CASE 
            WHEN COALESCE(pas.total_impressions, 0) > 0 THEN 
                (COALESCE(pas.total_engagement, 0)::NUMERIC / COALESCE(pas.total_impressions, 0)::NUMERIC) * 100
            ELSE 0 
        END as engagement_rate,
        COALESCE(aas.total_followers, 0) as followers
    FROM unnest(_company_ids) company_id
    LEFT JOIN companies c ON c.id = company_id
    LEFT JOIN portfolio_analytics_snapshots pas ON pas.media_company_id = _media_company_id
        AND pas.period_start >= _period_start
        AND pas.period_end <= _period_end
        AND pas.company_metrics ? company_id::TEXT
    LEFT JOIN account_analytics_snapshots aas ON aas.company_id = company_id
        AND aas.period_start >= _period_start
        AND aas.period_end <= _period_end
),
growth_data AS (
    SELECT 
        ca.company_id,
        -- Calculate growth rate (simplified - would need baseline period)
        CASE WHEN ca.followers > 0 THEN (ca.engagement::NUMERIC / ca.followers::NUMERIC) * 100 ELSE 0 END as growth_rate,
        -- Calculate performance score (weighted combination of metrics)
        (
            (ca.posts::NUMERIC * 0.2) +
            (ca.impressions::NUMERIC * 0.3) +
            (ca.engagement::NUMERIC * 0.3) +
            (ca.followers::NUMERIC * 0.2)
        ) / 1000 as performance_score
    FROM company_analytics ca
)
SELECT 
    ca.company_id,
    ca.company_name,
    ca.posts,
    ca.impressions,
    ca.engagement,
    ca.engagement_rate,
    ca.followers,
    COALESCE(gd.growth_rate, 0) as growth_rate,
    COALESCE(gd.performance_score, 0) as performance_score
FROM company_analytics ca
LEFT JOIN growth_data gd ON gd.company_id = ca.company_id
ORDER BY gd.performance_score DESC NULLS LAST;
$$;

-- Function to create portfolio alert
CREATE OR REPLACE FUNCTION create_portfolio_alert(
    _media_company_id UUID,
    _alert_type TEXT,
    _severity TEXT,
    _title TEXT,
    _description TEXT DEFAULT NULL,
    _metrics JSONB DEFAULT '{}',
    _company_ids UUID[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    -- Validate user has access to media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = current_setting('app.current_user_id', true)::UUID
        AND _media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this media company';
    END IF;
    
    INSERT INTO portfolio_alerts (
        media_company_id,
        alert_type,
        severity,
        title,
        description,
        metrics,
        company_ids
    ) VALUES (
        _media_company_id,
        _alert_type,
        _severity,
        _title,
        _description,
        _metrics,
        _company_ids
    ) RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create portfolio alert: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION calculate_portfolio_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_overview(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION compare_portfolio_companies(UUID, UUID[], TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_portfolio_alert(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, UUID[]) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE portfolio_analytics_snapshots IS 'Aggregated analytics snapshots for media company portfolios';
COMMENT ON TABLE company_comparison_analytics IS 'Company comparison analytics for portfolio benchmarking';
COMMENT ON TABLE portfolio_metrics_cache IS 'Real-time metrics cache for performance optimization';
COMMENT ON TABLE portfolio_alerts IS 'Alert system for portfolio performance monitoring';
COMMENT ON FUNCTION calculate_portfolio_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS 'Calculate aggregated portfolio analytics';
COMMENT ON FUNCTION get_portfolio_overview(UUID, TEXT) IS 'Get cached portfolio overview metrics';
COMMENT ON FUNCTION compare_portfolio_companies(UUID, UUID[], TIMESTAMPTZ, TIMESTAMPTZ) IS 'Compare performance across portfolio companies';
COMMENT ON FUNCTION create_portfolio_alert(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, UUID[]) IS 'Create portfolio performance alert';
