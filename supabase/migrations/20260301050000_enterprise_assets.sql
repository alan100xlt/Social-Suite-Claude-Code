-- Enterprise Asset Management System for Media Companies
-- Centralized media library with CDN integration and cross-company sharing

-- Centralized asset library
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Asset metadata
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    
    -- Storage information
    storage_provider TEXT DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 'aws', 'cloudinary', 'google')),
    storage_path TEXT NOT NULL,
    storage_url TEXT,
    cdn_url TEXT,
    
    -- Asset categorization
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'logo', 'banner', 'product', 'team', 'event', 'advertisement', 'template')),
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    -- Visual properties
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER, -- For videos
    aspect_ratio TEXT,
    color_palette TEXT[],
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT false,
    sharing_token UUID DEFAULT gen_random_uuid(),
    sharing_expires_at TIMESTAMPTZ,
    
    -- Processing status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    processing_metadata JSONB DEFAULT '{}',
    
    -- AI-powered analysis
    ai_tags TEXT[] DEFAULT '{}',
    ai_description TEXT,
    ai_confidence NUMERIC(3, 2),
    ai_safe_content BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT media_assets_unique_storage_path UNIQUE(storage_provider, storage_path)
);

-- Asset sharing permissions
CREATE TABLE IF NOT EXISTS asset_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    
    -- Sharing target
    target_type TEXT NOT NULL CHECK (target_type IN ('company', 'media_company', 'user', 'public')),
    target_id UUID, -- NULL for public sharing
    
    -- Permission level
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'download', 'edit', 'admin')),
    
    -- Sharing metadata
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    shared_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    -- Usage restrictions
    max_downloads INTEGER,
    current_downloads INTEGER DEFAULT 0,
    usage_restrictions JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT asset_sharing_unique UNIQUE(asset_id, target_type, target_id)
);

-- Asset collections (folders/albums)
CREATE TABLE IF NOT EXISTS asset_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Collection metadata
    name TEXT NOT NULL,
    description TEXT,
    collection_type TEXT DEFAULT 'general' CHECK (collection_type IN ('general', 'campaign', 'brand', 'template', 'archive')),
    
    -- Collection settings
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    
    -- Organization
    parent_collection_id UUID REFERENCES asset_collections(id),
    sort_order INTEGER DEFAULT 0,
    
    -- Usage tracking
    asset_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT asset_collections_unique_name UNIQUE(media_company_id, parent_collection_id, name)
);

-- Asset collection memberships
CREATE TABLE IF NOT EXISTS asset_collection_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES asset_collections(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    
    -- Membership metadata
    added_by UUID NOT NULL REFERENCES auth.users(id),
    added_at TIMESTAMPTZ DEFAULT now(),
    sort_order INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT asset_collection_memberships_unique UNIQUE(collection_id, asset_id)
);

-- Asset usage analytics
CREATE TABLE IF NOT EXISTS asset_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    
    -- Usage event
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'share', 'embed', 'publish')),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    platform TEXT,
    
    -- Event metadata
    context JSONB DEFAULT '{}',
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Geographic data
    country TEXT,
    city TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Brand templates
CREATE TABLE IF NOT EXISTS brand_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('post', 'story', 'banner', 'video', 'document')),
    
    -- Template design
    base_asset_id UUID REFERENCES media_assets(id),
    overlay_assets UUID[] DEFAULT '{}',
    text_overlays JSONB DEFAULT '{}',
    color_scheme JSONB DEFAULT '{}',
    font_scheme JSONB DEFAULT '{}',
    
    -- Template settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    -- Platform variations
    platform_variations JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT brand_templates_unique_name UNIQUE(media_company_id, name)
);

-- Asset processing jobs
CREATE TABLE IF NOT EXISTS asset_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    
    -- Job details
    job_type TEXT NOT NULL CHECK (job_type IN ('thumbnail', 'resize', 'optimize', 'watermark', 'analyze', 'transcode')),
    job_status TEXT DEFAULT 'queued' CHECK (job_status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Processing parameters
    parameters JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    
    -- Processing metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_id TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Results
    result_url TEXT,
    result_metadata JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes for asset management
CREATE INDEX IF NOT EXISTS idx_media_assets_media_company ON media_assets(media_company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_keywords ON media_assets USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_media_assets_file_type ON media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_processing_status ON media_assets(processing_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_usage_count ON media_assets(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_sharing_token ON media_assets(sharing_token) WHERE sharing_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_sharing_asset ON asset_sharing(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_sharing_target ON asset_sharing(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_asset_sharing_permission ON asset_sharing(permission_level);
CREATE INDEX IF NOT EXISTS idx_asset_sharing_expires ON asset_sharing(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_collections_media_company ON asset_collections(media_company_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_parent ON asset_collections(parent_collection_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_type ON asset_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_asset_collections_featured ON asset_collections(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_asset_collection_memberships_collection ON asset_collection_memberships(collection_id);
CREATE INDEX IF NOT EXISTS idx_asset_collection_memberships_asset ON asset_collection_memberships(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_collection_memberships_sort ON asset_collection_memberships(collection_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_asset_usage_analytics_asset ON asset_usage_analytics(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_analytics_event ON asset_usage_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_asset_usage_analytics_created_at ON asset_usage_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_usage_analytics_company ON asset_usage_analytics(company_id);

CREATE INDEX IF NOT EXISTS idx_brand_templates_media_company ON brand_templates(media_company_id);
CREATE INDEX IF NOT EXISTS idx_brand_templates_type ON brand_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_brand_templates_active ON brand_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_templates_default ON brand_templates(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_asset_processing_jobs_asset ON asset_processing_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_processing_jobs_status ON asset_processing_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_asset_processing_jobs_type ON asset_processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_asset_processing_jobs_priority ON asset_processing_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_asset_processing_jobs_worker ON asset_processing_jobs(worker_id) WHERE worker_id IS NOT NULL;

-- RLS Policies for asset management
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collection_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Media assets RLS
CREATE POLICY "Users can view assets for their media companies" ON media_assets
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
    OR is_public = true
);

CREATE POLICY "Users can create assets for their media companies" ON media_assets
FOR INSERT WITH CHECK (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can update assets for their media companies" ON media_assets
FOR UPDATE USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can delete assets for their media companies" ON media_assets
FOR DELETE USING (
    media_company_id = ANY(session_media_companies())
);

-- Asset sharing RLS
CREATE POLICY "Users can view sharing for accessible assets" ON asset_sharing
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM media_assets ma
        WHERE ma.id = asset_id
        AND (ma.media_company_id = ANY(session_media_companies()) OR ma.is_public = true)
    )
);

CREATE POLICY "Users can manage sharing for their assets" ON asset_sharing
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM media_assets ma
        WHERE ma.id = asset_id
        AND ma.media_company_id = ANY(session_media_companies())
    )
);

-- Asset collections RLS
CREATE POLICY "Users can view collections for their media companies" ON asset_collections
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
    OR is_public = true
);

CREATE POLICY "Users can manage collections for their media companies" ON asset_collections
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
);

-- Asset collection memberships RLS
CREATE POLICY "Users can view memberships for accessible collections" ON asset_collection_memberships
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM asset_collections ac
        WHERE ac.id = collection_id
        AND (ac.media_company_id = ANY(session_media_companies()) OR ac.is_public = true)
    )
);

CREATE POLICY "Users can manage memberships for their collections" ON asset_collection_memberships
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM asset_collections ac
        WHERE ac.id = collection_id
        AND ac.media_company_id = ANY(session_media_companies())
    )
);

-- Asset usage analytics RLS
CREATE POLICY "Users can view analytics for accessible assets" ON asset_usage_analytics
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM media_assets ma
        WHERE ma.id = asset_id
        AND (ma.media_company_id = ANY(session_media_companies()) OR ma.is_public = true)
    )
);

CREATE POLICY "Service role full access to asset analytics" ON asset_usage_analytics
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Brand templates RLS
CREATE POLICY "Users can view templates for their media companies" ON brand_templates
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can manage templates for their media companies" ON brand_templates
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Asset processing jobs RLS
CREATE POLICY "Service role full access to processing jobs" ON asset_processing_jobs
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Functions for asset management

-- Function to upload asset
CREATE OR REPLACE FUNCTION upload_asset(
    _media_company_id UUID,
    _name TEXT,
    _file_name TEXT,
    _file_type TEXT,
    _file_size BIGINT,
    _mime_type TEXT,
    _storage_path TEXT,
    _storage_url TEXT,
    _category TEXT DEFAULT 'general',
    _tags TEXT[] DEFAULT '{}',
    _created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asset_id UUID;
BEGIN
    -- Validate user has access to media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = _created_by
        AND _media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this media company';
    END IF;
    
    -- Insert asset
    INSERT INTO media_assets (
        media_company_id,
        name,
        file_name,
        file_type,
        file_size,
        mime_type,
        storage_path,
        storage_url,
        category,
        tags,
        created_by,
        processing_status
    ) VALUES (
        _media_company_id,
        _name,
        _file_name,
        _file_type,
        _file_size,
        _mime_type,
        _storage_path,
        _storage_url,
        _category,
        _tags,
        _created_by,
        'pending'
    ) RETURNING id INTO v_asset_id;
    
    -- Create processing jobs
    INSERT INTO asset_processing_jobs (asset_id, job_type, priority)
    VALUES 
        (v_asset_id, 'thumbnail', 5),
        (v_asset_id, 'analyze', 3),
        (v_asset_id, 'optimize', 2);
    
    RETURN v_asset_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to upload asset: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to share asset with companies
CREATE OR REPLACE FUNCTION share_asset_with_companies(
    _asset_id UUID,
    _company_ids UUID[],
    _permission_level TEXT DEFAULT 'view',
    _shared_by UUID,
    _expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_company_id UUID;
BEGIN
    -- Validate user owns the asset
    IF NOT EXISTS (
        SELECT 1 FROM media_assets ma
        WHERE ma.id = _asset_id
        AND ma.media_company_id = ANY(
            SELECT media_company_id FROM user_permissions up
            WHERE up.user_id = _shared_by
        )
    ) THEN
        RAISE EXCEPTION 'User does not have permission to share this asset';
    END IF;
    
    -- Create sharing records
    FOREACH v_company_id IN ARRAY _company_ids
    LOOP
        INSERT INTO asset_sharing (
            asset_id,
            target_type,
            target_id,
            permission_level,
            shared_by,
            expires_at
        ) VALUES (
            _asset_id,
            'company',
            v_company_id,
            _permission_level,
            _shared_by,
            _expires_at
        ) ON CONFLICT (asset_id, target_type, target_id)
        DO UPDATE SET
            permission_level = EXCLUDED.permission_level,
            expires_at = EXCLUDED.expires_at,
            shared_by = EXCLUDED.shared_by;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to share asset: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Function to get asset usage analytics
CREATE OR REPLACE FUNCTION get_asset_usage_analytics(
    _asset_id UUID,
    _period_start TIMESTAMPTZ DEFAULT NULL,
    _period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    unique_users BIGINT,
    unique_companies BIGINT,
    top_platforms JSONB,
    trend_data JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH usage_data AS (
    SELECT 
        event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT company_id) as unique_companies,
        array_agg(DISTINCT platform) FILTER (WHERE platform IS NOT NULL) as platforms
    FROM asset_usage_analytics aua
    WHERE aua.asset_id = _asset_id
    AND (_period_start IS NULL OR aua.created_at >= _period_start)
    AND (_period_end IS NULL OR aua.created_at <= _period_end)
    GROUP BY event_type
),
platform_data AS (
    SELECT 
        platform,
        COUNT(*) as usage_count
    FROM asset_usage_analytics aua
    WHERE aua.asset_id = _asset_id
    AND (_period_start IS NULL OR aua.created_at >= _period_start)
    AND (_period_end IS NULL OR aua.created_at <= _period_end)
    AND platform IS NOT NULL
    GROUP BY platform
    ORDER BY usage_count DESC
),
trend_data AS (
    SELECT 
        DATE_TRUNC('day', created_at) as date,
        event_type,
        COUNT(*) as count
    FROM asset_usage_analytics aua
    WHERE aua.asset_id = _asset_id
    AND (_period_start IS NULL OR aua.created_at >= _period_start)
    AND (_period_end IS NULL OR aua.created_at <= _period_end)
    GROUP BY DATE_TRUNC('day', created_at), event_type
    ORDER BY date DESC
)
SELECT 
    ud.event_type,
    ud.event_count,
    ud.unique_users,
    ud.unique_companies,
    jsonb_agg(jsonb_build_object(
        'platform', pd.platform,
        'count', pd.usage_count
    )) FILTER (WHERE pd.platform IS NOT NULL) as top_platforms,
    jsonb_agg(jsonb_build_object(
        'date', td.date,
        'event_type', td.event_type,
        'count', td.count
    )) FILTER (WHERE td.date IS NOT NULL) as trend_data
FROM usage_data ud
LEFT JOIN LATERAL (
    SELECT platform, usage_count
    FROM platform_data pd
    LIMIT 5
) pd ON true
LEFT JOIN LATERAL (
    SELECT date, event_type, count
    FROM trend_data td
    LIMIT 30
) td ON true
GROUP BY ud.event_type, ud.event_count, ud.unique_users, ud.unique_companies;
$$;

-- Function to search assets
CREATE OR REPLACE FUNCTION search_assets(
    _media_company_id UUID,
    _query TEXT DEFAULT '',
    _category TEXT DEFAULT NULL,
    _tags TEXT[] DEFAULT '{}',
    _file_types TEXT[] DEFAULT '{}',
    _limit INTEGER DEFAULT 50,
    _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    category TEXT,
    tags TEXT[],
    usage_count INTEGER,
    created_at TIMESTAMPTZ,
    relevance_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    ma.id,
    ma.name,
    ma.description,
    ma.file_name,
    ma.file_type,
    ma.file_size,
    ma.category,
    ma.tags,
    ma.usage_count,
    ma.created_at,
    -- Calculate relevance score
    CASE 
        WHEN _query = '' THEN 1.0
        ELSE (
            CASE WHEN ma.name ILIKE '%' || _query || '%' THEN 0.5 ELSE 0 END +
            CASE WHEN ma.description ILIKE '%' || _query || '%' THEN 0.3 ELSE 0 END +
            CASE WHEN _query = ANY(ma.tags) THEN 0.2 ELSE 0 END +
            CASE WHEN _query = ANY(ma.keywords) THEN 0.2 ELSE 0 END
        )
    END as relevance_score
FROM media_assets ma
WHERE 
    ma.media_company_id = _media_company_id
    AND (_category IS NULL OR ma.category = _category)
    AND (_tags = '{}' OR ma.tags && _tags)
    AND (_file_types = '{}' OR ma.file_type = ANY(_file_types))
    AND (
        _query = '' 
        OR ma.name ILIKE '%' || _query || '%'
        OR ma.description ILIKE '%' || _query || '%'
        OR _query = ANY(ma.tags)
        OR _query = ANY(ma.keywords)
    )
ORDER BY relevance_score DESC, ma.usage_count DESC, ma.created_at DESC
LIMIT _limit
OFFSET _offset;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION upload_asset(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION share_asset_with_companies(UUID, UUID[], TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_asset_usage_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION search_assets(UUID, TEXT, TEXT, TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE media_assets IS 'Centralized asset library for media companies';
COMMENT ON TABLE asset_sharing IS 'Asset sharing permissions and access control';
COMMENT ON TABLE asset_collections IS 'Asset collections and folders for organization';
COMMENT ON TABLE asset_collection_memberships IS 'Many-to-many relationship between assets and collections';
COMMENT ON TABLE asset_usage_analytics IS 'Analytics for asset usage tracking';
COMMENT ON TABLE brand_templates IS 'Brand templates for consistent content creation';
COMMENT ON TABLE asset_processing_jobs IS 'Background processing jobs for asset optimization';

COMMENT ON FUNCTION upload_asset(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) IS 'Upload new asset to media company library';
COMMENT ON FUNCTION share_asset_with_companies(UUID, UUID[], TEXT, UUID, TIMESTAMPTZ) IS 'Share asset with multiple companies';
COMMENT ON FUNCTION get_asset_usage_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Get comprehensive usage analytics for asset';
COMMENT ON FUNCTION search_assets(UUID, TEXT, TEXT, TEXT[], TEXT[], INTEGER, INTEGER) IS 'Search assets with relevance scoring';
