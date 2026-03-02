-- Bulk Content Creation System for Enterprise Media Companies
-- Supports creating and publishing content across multiple companies simultaneously

-- Core table for bulk content campaigns
CREATE TABLE IF NOT EXISTS media_company_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Content metadata
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'article', 'announcement', 'promotion')),
    
    -- Platform-specific customizations
    platform_customizations JSONB DEFAULT '{}',
    
    -- Target companies and publishing settings
    target_company_ids UUID[] NOT NULL,
    publishing_strategy TEXT DEFAULT 'immediate' CHECK (publishing_strategy IN ('immediate', 'scheduled', 'staggered')),
    scheduled_at TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'publishing', 'published', 'failed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Publishing results
    published_company_ids UUID[] DEFAULT '{}',
    failed_company_ids UUID[] DEFAULT '{}',
    publishing_errors JSONB DEFAULT '{}',
    
    -- Analytics
    total_engagement BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    platform_performance JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT media_company_posts_target_not_empty CHECK (array_length(target_company_ids, 1) > 0)
);

-- Individual post instances for each target company
CREATE TABLE IF NOT EXISTS media_company_post_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_post_id UUID NOT NULL REFERENCES media_company_posts(id) ON DELETE CASCADE,
    
    -- Company-specific data
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    
    -- Customized content for this company
    title TEXT,
    content TEXT,
    platform_specific_content JSONB DEFAULT '{}',
    
    -- Publishing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'skipped')),
    post_id UUID, -- Link to actual post when published (FK added later when posts table exists)
    
    -- Publishing metadata
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    publishing_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error tracking
    last_error TEXT,
    error_details JSONB DEFAULT '{}',
    
    -- Analytics
    engagement BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT media_company_post_instances_unique UNIQUE(media_company_post_id, company_id, platform)
);

-- Bulk publishing queue for processing
CREATE TABLE IF NOT EXISTS bulk_publishing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_post_id UUID NOT NULL REFERENCES media_company_posts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    
    -- Queue management
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Status
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Processing metadata
    queued_at TIMESTAMPTZ DEFAULT now(),
    started_processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    last_error TEXT,
    error_details JSONB DEFAULT '{}',
    retry_after TIMESTAMPTZ,
    
    -- Worker assignment
    worker_id TEXT,
    lock_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content templates for platform-specific customization
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT DEFAULT 'post' CHECK (template_type IN ('post', 'article', 'announcement', 'promotion')),
    
    -- Template content with placeholders
    base_content TEXT NOT NULL,
    placeholders JSONB DEFAULT '{}',
    
    -- Platform-specific variations
    platform_variations JSONB DEFAULT '{}',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT content_templates_unique_name UNIQUE(media_company_id, name)
);

-- Performance indexes for bulk content operations
CREATE INDEX IF NOT EXISTS idx_media_company_posts_media_company ON media_company_posts(media_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_posts_status ON media_company_posts(status);
CREATE INDEX IF NOT EXISTS idx_media_company_posts_created_by ON media_company_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_media_company_posts_target_companies ON media_company_posts USING GIN(target_company_ids);
CREATE INDEX IF NOT EXISTS idx_media_company_posts_published_companies ON media_company_posts USING GIN(published_company_ids);
CREATE INDEX IF NOT EXISTS idx_media_company_posts_scheduled ON media_company_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_company_post_instances_media_post ON media_company_post_instances(media_company_post_id);
CREATE INDEX IF NOT EXISTS idx_media_company_post_instances_company ON media_company_post_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_post_instances_status ON media_company_post_instances(status);
CREATE INDEX IF NOT EXISTS idx_media_company_post_instances_platform ON media_company_post_instances(platform);
CREATE INDEX IF NOT EXISTS idx_media_company_post_instances_published ON media_company_post_instances(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_publishing_queue_status ON bulk_publishing_queue(status);
CREATE INDEX IF NOT EXISTS idx_bulk_publishing_queue_priority ON bulk_publishing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_publishing_queue_worker ON bulk_publishing_queue(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulk_publishing_queue_lock ON bulk_publishing_queue(lock_expires_at) WHERE lock_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulk_publishing_queue_retry ON bulk_publishing_queue(retry_after) WHERE retry_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_templates_media_company ON content_templates(media_company_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_type ON content_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON content_templates(is_active) WHERE is_active = true;

-- RLS Policies for bulk content system
ALTER TABLE media_company_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_company_post_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Media company posts RLS
CREATE POLICY "Users can view media company posts they can access" ON media_company_posts
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can create media company posts they admin" ON media_company_posts
FOR INSERT WITH CHECK (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 5
);

CREATE POLICY "Users can update media company posts they admin" ON media_company_posts
FOR UPDATE USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 5
);

CREATE POLICY "Users can delete media company posts they admin" ON media_company_posts
FOR DELETE USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 5
);

-- Post instances RLS
CREATE POLICY "Users can view post instances for accessible companies" ON media_company_post_instances
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role full access to post instances" ON media_company_post_instances
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Publishing queue RLS
CREATE POLICY "Service role full access to publishing queue" ON bulk_publishing_queue
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Content templates RLS
CREATE POLICY "Users can view templates for their media companies" ON content_templates
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can manage templates for their media companies" ON content_templates
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Functions for bulk content operations

-- Function to create bulk content post
CREATE OR REPLACE FUNCTION create_bulk_media_post(
    _media_company_id UUID,
    _title TEXT,
    _content TEXT,
    _target_company_ids UUID[],
    _created_by UUID,
    _platform_customizations JSONB DEFAULT '{}',
    _publishing_strategy TEXT DEFAULT 'immediate',
    _scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_id UUID;
BEGIN
    -- Validate user has admin access to media company
    IF NOT EXISTS (
        SELECT 1 FROM media_company_hierarchy mch
        WHERE mch.user_id = _created_by
        AND mch.media_company_id = _media_company_id
        AND mch.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User does not have admin access to media company';
    END IF;
    
    -- Validate target companies are accessible
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = _created_by
        AND _target_company_ids <@ up.accessible_companies
    ) THEN
        RAISE EXCEPTION 'User does not have access to all target companies';
    END IF;
    
    -- Create bulk post
    INSERT INTO media_company_posts (
        media_company_id,
        title,
        content,
        target_company_ids,
        platform_customizations,
        publishing_strategy,
        scheduled_at,
        created_by
    ) VALUES (
        _media_company_id,
        _title,
        _content,
        _target_company_ids,
        _platform_customizations,
        _publishing_strategy,
        _scheduled_at,
        _created_by
    ) RETURNING id INTO v_post_id;
    
    -- Create post instances for each target company and platform
    INSERT INTO media_company_post_instances (
        media_company_post_id,
        company_id,
        platform,
        title,
        content,
        platform_specific_content
    )
    SELECT 
        v_post_id,
        comp_id,
        platform,
        _title,
        _content,
        COALESCE(_platform_customizations->platform, '{}'::JSONB)
    FROM unnest(_target_company_ids) AS comp_id
    CROSS JOIN unnest(ARRAY['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok']) AS platform;
    
    -- Queue for publishing if immediate
    IF _publishing_strategy = 'immediate' THEN
        INSERT INTO bulk_publishing_queue (media_company_post_id, company_id, platform)
        SELECT 
            v_post_id,
            comp_id,
            platform
        FROM unnest(_target_company_ids) AS comp_id
        CROSS JOIN unnest(ARRAY['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok']) AS platform;
    END IF;
    
    RETURN v_post_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create bulk media post: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to get bulk publishing statistics
CREATE OR REPLACE FUNCTION get_bulk_publishing_stats(_media_company_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_posts BIGINT,
    pending_posts BIGINT,
    publishing_posts BIGINT,
    published_posts BIGINT,
    failed_posts BIGINT,
    total_instances BIGINT,
    queued_instances BIGINT,
    processing_instances BIGINT,
    completed_instances BIGINT,
    failed_instances BIGINT,
    avg_publishing_time INTERVAL,
    success_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    COUNT(*) FILTER (WHERE 1=1) as total_posts,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_posts,
    COUNT(*) FILTER (WHERE status = 'publishing') as publishing_posts,
    COUNT(*) FILTER (WHERE status = 'published') as published_posts,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
    (SELECT COUNT(*) FROM media_company_post_instances mcpi
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE mcp.media_company_id = _media_company_id OR _media_company_id IS NULL) as total_instances,
    (SELECT COUNT(*) FROM bulk_publishing_queue bpq
     JOIN media_company_post_instances mcpi ON bpq.media_company_post_id = mcpi.media_company_post_id
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE (mcp.media_company_id = _media_company_id OR _media_company_id IS NULL)
     AND bpq.status = 'queued') as queued_instances,
    (SELECT COUNT(*) FROM bulk_publishing_queue bpq
     JOIN media_company_post_instances mcpi ON bpq.media_company_post_id = mcpi.media_company_post_id
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE (mcp.media_company_id = _media_company_id OR _media_company_id IS NULL)
     AND bpq.status = 'processing') as processing_instances,
    (SELECT COUNT(*) FROM bulk_publishing_queue bpq
     JOIN media_company_post_instances mcpi ON bpq.media_company_post_id = mcpi.media_company_post_id
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE (mcp.media_company_id = _media_company_id OR _media_company_id IS NULL)
     AND bpq.status = 'completed') as completed_instances,
    (SELECT COUNT(*) FROM bulk_publishing_queue bpq
     JOIN media_company_post_instances mcpi ON bpq.media_company_post_id = mcpi.media_company_post_id
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE (mcp.media_company_id = _media_company_id OR _media_company_id IS NULL)
     AND bpq.status = 'failed') as failed_instances,
    (SELECT AVG(bpq.completed_at - bpq.started_processing_at)
     FROM bulk_publishing_queue bpq
     JOIN media_company_post_instances mcpi ON bpq.media_company_post_id = mcpi.media_company_post_id
     JOIN media_company_posts mcp ON mcpi.media_company_post_id = mcp.id
     WHERE (mcp.media_company_id = _media_company_id OR _media_company_id IS NULL)
     AND bpq.status = 'completed'
     AND bpq.started_processing_at IS NOT NULL
     AND bpq.completed_at IS NOT NULL) as avg_publishing_time,
    CASE 
        WHEN (SELECT COUNT(*) FROM media_company_posts WHERE status = 'published') > 0 THEN
            (SELECT COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM media_company_posts WHERE status IN ('published', 'failed'))::NUMERIC * 100)
        ELSE 0
    END as success_rate
FROM media_company_posts
WHERE (_media_company_id IS NULL OR media_company_id = _media_company_id);
$$;

-- Function to get next items from publishing queue (for workers)
CREATE OR REPLACE FUNCTION get_publishing_queue_items(_worker_id TEXT, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    media_company_post_id UUID,
    company_id UUID,
    platform TEXT,
    priority INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
UPDATE bulk_publishing_queue
SET 
    status = 'processing',
    worker_id = _worker_id,
    started_processing_at = now(),
    lock_expires_at = now() + INTERVAL '5 minutes'
WHERE id IN (
    SELECT id FROM bulk_publishing_queue
    WHERE status = 'queued'
    AND (retry_after IS NULL OR retry_after <= now())
    ORDER BY priority DESC, created_at ASC
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
)
RETURNING id, media_company_post_id, company_id, platform, priority;
$$;

-- Function to mark queue item as completed
CREATE OR REPLACE FUNCTION complete_queue_item(
    _queue_id UUID,
    _success BOOLEAN DEFAULT true,
    _error_message TEXT DEFAULT NULL,
    _post_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE bulk_publishing_queue
    SET 
        status = CASE WHEN _success THEN 'completed' ELSE 'failed' END,
        completed_at = now(),
        last_error = _error_message,
        worker_id = NULL,
        lock_expires_at = NULL
    WHERE id = _queue_id;
    
    -- Update post instance if successful
    IF _success AND _post_id IS NOT NULL THEN
        UPDATE media_company_post_instances mcpi
        SET 
            status = 'published',
            post_id = _post_id,
            published_at = now()
        WHERE media_company_post_id = (SELECT media_company_post_id FROM bulk_publishing_queue WHERE id = _queue_id)
        AND company_id = (SELECT company_id FROM bulk_publishing_queue WHERE id = _queue_id)
        AND platform = (SELECT platform FROM bulk_publishing_queue WHERE id = _queue_id);
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to complete queue item: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_bulk_media_post(UUID, TEXT, TEXT, UUID[], UUID, JSONB, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bulk_publishing_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_publishing_queue_items(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_queue_item(UUID, BOOLEAN, TEXT, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE media_company_posts IS 'Bulk content posts for media companies';
COMMENT ON TABLE media_company_post_instances IS 'Individual post instances for each target company';
COMMENT ON TABLE bulk_publishing_queue IS 'Queue for processing bulk publishing operations';
COMMENT ON TABLE content_templates IS 'Templates for platform-specific content customization';
COMMENT ON FUNCTION create_bulk_media_post(UUID, TEXT, TEXT, UUID[], UUID, JSONB, TEXT, TIMESTAMPTZ) IS 'Create bulk content post with validation';
COMMENT ON FUNCTION get_bulk_publishing_stats(UUID) IS 'Get publishing statistics for media company';
COMMENT ON FUNCTION get_publishing_queue_items(TEXT, INTEGER) IS 'Get next items from publishing queue for workers';
COMMENT ON FUNCTION complete_queue_item(UUID, BOOLEAN, TEXT, UUID) IS 'Mark queue item as completed or failed';
