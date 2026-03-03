-- SUPERSEDED by 20260303100000_platform_restoration_rls_cleanup.sql
-- The infrastructure created by this migration has been removed.
-- Media Company Hierarchy Schema
-- Supports parent-child relationships for media companies/agencies

-- Parent company table (media companies that own other companies)
CREATE TABLE IF NOT EXISTS media_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    contact_email TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- RLS policies
    CONSTRAINT media_companies_name_check CHECK (length(name) >= 2)
);

-- Link table for parent-child relationships
CREATE TABLE IF NOT EXISTS media_company_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    child_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Metadata about the relationship
    relationship_type TEXT DEFAULT 'owned' CHECK (relationship_type IN ('owned', 'managed', 'partnered')),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate relationships
    UNIQUE(parent_company_id, child_company_id)
);

-- Member management for media companies
CREATE TABLE IF NOT EXISTS media_company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role and permissions
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate memberships
    UNIQUE(media_company_id, user_id)
);

-- Analytics cache for roll-up data
CREATE TABLE IF NOT EXISTS media_company_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Roll-up metrics
    total_companies INTEGER DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    total_followers BIGINT DEFAULT 0,
    total_engagement BIGINT DEFAULT 0,
    
    -- Platform breakdowns
    platform_breakdown JSONB DEFAULT '{}',
    
    -- Time period for these analytics
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Cache metadata
    calculated_at TIMESTAMPTZ DEFAULT now(),
    data_source TEXT DEFAULT 'aggregated' CHECK (data_source IN ('aggregated', 'cached', 'realtime')),
    
    -- Prevent duplicate analytics for same period
    UNIQUE(media_company_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_company_children_parent ON media_company_children(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_children_child ON media_company_children(child_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_members_company ON media_company_members(media_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_members_user ON media_company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_media_company_analytics_company_period ON media_company_analytics(media_company_id, period_start, period_end);

-- RLS Policies
ALTER TABLE media_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_company_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_company_analytics ENABLE ROW LEVEL SECURITY;

-- Media companies: Only media company admins can view/edit
CREATE POLICY "Media company admins full access" ON media_companies
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_companies.id 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Media company children: Viewable by media company members, editable by admins
CREATE POLICY "Media company children view" ON media_company_children
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_company_children.parent_company_id 
            AND is_active = true
        )
    );

CREATE POLICY "Media company children edit" ON media_company_children
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_company_children.parent_company_id 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Media company members: Viewable by all members, editable by admins
CREATE POLICY "Media company members view" ON media_company_members
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_company_members.media_company_id 
            AND is_active = true
        )
    );

CREATE POLICY "Media company members edit" ON media_company_members
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_company_members.media_company_id 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Media company analytics: Viewable by all members
CREATE POLICY "Media company analytics view" ON media_company_analytics
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM media_company_members 
            WHERE media_company_id = media_company_analytics.media_company_id 
            AND is_active = true
        )
    );

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_media_companies_timestamp
    BEFORE UPDATE ON media_companies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_media_company_members_timestamp
    BEFORE UPDATE ON media_company_members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- RPC function to get media company hierarchy with analytics
CREATE OR REPLACE FUNCTION get_media_company_hierarchy(
    _media_company_id UUID,
    _include_analytics BOOLEAN DEFAULT true,
    _period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    relationship_type TEXT,
    total_posts BIGINT,
    total_followers BIGINT,
    total_engagement BIGINT,
    platform_breakdown JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH company_analytics AS (
        SELECT 
            c.id,
            COALESCE(SUM(p.post_count), 0) as total_posts,
            COALESCE(SUM(p.follower_count), 0) as total_followers,
            COALESCE(SUM(p.engagement_count), 0) as total_engagement,
            jsonb_agg(
                jsonb_build_object(
                    'platform', p.platform,
                    'posts', p.post_count,
                    'followers', p.follower_count,
                    'engagement', p.engagement_count
                )
            ) FILTER (WHERE p.platform IS NOT NULL) as platform_breakdown
        FROM companies c
        LEFT JOIN LATERAL (
            SELECT 
                platform,
                COUNT(*) as post_count,
                SUM(follower_count) as follower_count,
                SUM(engagement_count) as engagement_count
            FROM posts 
            WHERE company_id = c.id
            AND published_at >= now() - INTERVAL '1 day' * _period_days
            GROUP BY platform
        ) p ON true
        WHERE c.id IN (
            SELECT child_company_id FROM media_company_children 
            WHERE parent_company_id = _media_company_id
        )
        GROUP BY c.id
    )
    SELECT 
        ca.id as company_id,
        c.name as company_name,
        mcc.relationship_type,
        ca.total_posts,
        ca.total_followers,
        ca.total_engagement,
        ca.platform_breakdown
    FROM company_analytics ca
    JOIN companies c ON c.id = ca.id
    JOIN media_company_children mcc ON mcc.child_company_id = ca.id
    WHERE mcc.parent_company_id = _media_company_id
    ORDER BY ca.total_followers DESC;
END;
$$;

-- RPC function to check if user has media company permissions
CREATE OR REPLACE FUNCTION has_media_company_permission(
    _user_id UUID,
    _media_company_id UUID,
    _required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM media_company_members
        WHERE user_id = _user_id
        AND media_company_id = _media_company_id
        AND is_active = true
        AND (
            _required_role = 'viewer' OR
            (_required_role = 'member' AND role IN ('member', 'admin')) OR
            (_required_role = 'admin' AND role = 'admin')
        )
    );
END;
$$;

-- Comments for documentation
COMMENT ON TABLE media_companies IS 'Parent media companies that own/manage other companies';
COMMENT ON TABLE media_company_children IS 'Links parent media companies to their child companies';
COMMENT ON TABLE media_company_members IS 'User memberships and permissions for media companies';
COMMENT ON TABLE media_company_analytics IS 'Cached roll-up analytics for media company portfolios';
