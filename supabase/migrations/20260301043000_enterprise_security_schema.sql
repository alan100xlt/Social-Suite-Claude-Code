-- Enterprise Security Schema for Media Company Hierarchy
-- Optimized for 1000+ media companies with sub-50ms permission checks

-- Core hierarchy table optimized for lookups
CREATE TABLE IF NOT EXISTS media_company_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_company_id UUID REFERENCES media_companies(id) ON DELETE CASCADE,
    child_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Role and access level for fine-grained permissions
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    access_level INTEGER NOT NULL DEFAULT 1 CHECK (access_level >= 0 AND access_level <= 5),
    
    -- Relationship metadata
    relationship_type TEXT DEFAULT 'owned' CHECK (relationship_type IN ('owned', 'managed', 'partnered')),
    invited_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints for data integrity
    CONSTRAINT media_company_hierarchy_unique UNIQUE(user_id, child_company_id),
    CONSTRAINT media_company_hierarchy_role_check CHECK (
        (media_company_id IS NOT NULL) OR (child_company_id IS NOT NULL)
    )
);

-- Performance indexes for enterprise scale
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_user ON media_company_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_media_company ON media_company_hierarchy(media_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_child_company ON media_company_hierarchy(child_company_id);
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_role ON media_company_hierarchy(user_id, role);
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_access_level ON media_company_hierarchy(user_id, access_level);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_media_company_hierarchy_lookup ON media_company_hierarchy(user_id, child_company_id, role);

-- Materialized view for precomputed permissions (enterprise optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_permissions AS
SELECT 
    uh.user_id,
    array_agg(DISTINCT COALESCE(uh.child_company_id, uh.media_company_id)) as accessible_companies,
    array_agg(DISTINCT uh.media_company_id) FILTER (WHERE uh.media_company_id IS NOT NULL) as media_companies,
    array_agg(DISTINCT uh.child_company_id) FILTER (WHERE uh.child_company_id IS NOT NULL) as child_companies,
    max(uh.access_level) as max_access_level,
    bool_or(uh.role = 'admin') as is_admin,
    bool_or(uh.role = 'member') as is_member,
    count(DISTINCT uh.media_company_id) as media_company_count,
    count(DISTINCT uh.child_company_id) as child_company_count,
    max(uh.updated_at) as last_updated
FROM media_company_hierarchy uh
GROUP BY uh.user_id;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_companies ON user_permissions USING GIN(accessible_companies);
CREATE INDEX IF NOT EXISTS idx_user_permissions_media_companies ON user_permissions USING GIN(media_companies);

-- Materialized view for detailed hierarchy data
CREATE MATERIALIZED VIEW IF NOT EXISTS user_security_hierarchy AS
SELECT 
    uh.user_id,
    uh.media_company_id,
    mc.name as media_company_name,
    uh.child_company_id,
    c.name as child_company_name,
    uh.role,
    uh.access_level,
    uh.relationship_type,
    uh.created_at,
    uh.updated_at,
    -- Aggregated data for media companies
    (SELECT COUNT(*) FROM media_company_hierarchy uh2 
     WHERE uh2.media_company_id = uh.media_company_id AND uh2.user_id = uh.user_id) as total_connections,
    (SELECT COUNT(*) FROM media_company_hierarchy uh3 
     WHERE uh3.media_company_id = uh.media_company_id) as media_company_size
FROM media_company_hierarchy uh
LEFT JOIN media_companies mc ON uh.media_company_id = mc.id
LEFT JOIN companies c ON uh.child_company_id = c.id;

-- Index for hierarchy view
CREATE INDEX IF NOT EXISTS idx_user_security_hierarchy_user ON user_security_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_hierarchy_media_company ON user_security_hierarchy(user_id, media_company_id);
CREATE INDEX IF NOT EXISTS idx_user_security_hierarchy_child_company ON user_security_hierarchy(user_id, child_company_id);

-- Function to refresh materialized views with concurrency support
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_security_hierarchy;
END;
$$;

-- Function to get user security hierarchy (optimized for enterprise)
CREATE OR REPLACE FUNCTION get_user_security_hierarchy(_user_id UUID)
RETURNS TABLE (
    media_company_id UUID,
    media_company_name TEXT,
    child_company_id UUID,
    child_company_name TEXT,
    role TEXT,
    access_level INTEGER,
    relationship_type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_connections BIGINT,
    media_company_size BIGINT
)
LANGUAGE sql
STABLE
AS $$
SELECT 
    ush.media_company_id,
    ush.media_company_name,
    ush.child_company_id,
    ush.child_company_name,
    ush.role,
    ush.access_level,
    ush.relationship_type,
    ush.created_at,
    ush.updated_at,
    ush.total_connections,
    ush.media_company_size
FROM user_security_hierarchy ush
WHERE ush.user_id = _user_id
ORDER BY ush.access_level DESC, ush.updated_at DESC;
$$;

-- Function to check user permissions (fast lookup)
CREATE OR REPLACE FUNCTION has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = _user_id
    AND _company_id = ANY(up.accessible_companies)
);
$$;

-- Function to check if user is media company admin
CREATE OR REPLACE FUNCTION is_media_company_admin(_user_id UUID, _media_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1 FROM media_company_hierarchy mch
    WHERE mch.user_id = _user_id
    AND mch.media_company_id = _media_company_id
    AND mch.role = 'admin'
);
$$;

-- Function to get accessible companies for user (array version)
CREATE OR REPLACE FUNCTION get_accessible_companies(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
SELECT COALESCE(accessible_companies, ARRAY[]::UUID[])
FROM user_permissions up
WHERE up.user_id = _user_id;
$$;

-- Function to get media companies for user
CREATE OR REPLACE FUNCTION get_media_companies(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
SELECT COALESCE(media_companies, ARRAY[]::UUID[])
FROM user_permissions up
WHERE up.user_id = _user_id;
$$;

-- Function to add user to media company hierarchy
CREATE OR REPLACE FUNCTION add_media_company_access(
    _user_id UUID,
    _media_company_id UUID,
    _child_company_id UUID DEFAULT NULL,
    _role TEXT DEFAULT 'member',
    _relationship_type TEXT DEFAULT 'owned'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_access_level INTEGER;
BEGIN
    -- Determine access level based on role
    v_access_level := CASE _role
        WHEN 'admin' THEN 5
        WHEN 'member' THEN 3
        WHEN 'viewer' THEN 1
        ELSE 1
    END;
    
    -- Insert or update hierarchy record
    INSERT INTO media_company_hierarchy (
        user_id, media_company_id, child_company_id, role, access_level, relationship_type
    ) VALUES (
        _user_id, _media_company_id, _child_company_id, _role, v_access_level, _relationship_type
    )
    ON CONFLICT (user_id, child_company_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        access_level = EXCLUDED.access_level,
        relationship_type = EXCLUDED.relationship_type,
        updated_at = now();
    
    -- Refresh materialized views asynchronously
    PERFORM pg_notify('refresh_permissions', _user_id::TEXT);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add media company access: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function to remove user from media company hierarchy
CREATE OR REPLACE FUNCTION remove_media_company_access(
    _user_id UUID,
    _child_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM media_company_hierarchy
    WHERE user_id = _user_id AND child_company_id = _child_company_id;
    
    -- Refresh materialized views asynchronously
    PERFORM pg_notify('refresh_permissions', _user_id::TEXT);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to remove media company access: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Trigger to automatically refresh materialized views
CREATE OR REPLACE FUNCTION trigger_refresh_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- This will be called by the application layer
    -- to refresh materialized views for specific users
    RETURN NULL;
END;
$$;

-- RLS Policies for media_company_hierarchy
ALTER TABLE media_company_hierarchy ENABLE ROW LEVEL SECURITY;

-- Users can see their own hierarchy entries
CREATE POLICY "Users can view own hierarchy" ON media_company_hierarchy
FOR SELECT USING (user_id = auth.uid());

-- Users can be added to hierarchy (through functions)
CREATE POLICY "Users can be added to hierarchy" ON media_company_hierarchy
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own entries
CREATE POLICY "Users can update own hierarchy" ON media_company_hierarchy
FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own entries
CREATE POLICY "Users can delete own hierarchy" ON media_company_hierarchy
FOR DELETE USING (user_id = auth.uid());

-- Grant access to materialized views
GRANT SELECT ON user_permissions TO authenticated;
GRANT SELECT ON user_security_hierarchy TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_security_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_company_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_media_company_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_companies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_media_companies(UUID) TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_media_company_hierarchy_timestamp
    BEFORE UPDATE ON media_company_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Comments for documentation
COMMENT ON TABLE media_company_hierarchy IS 'Enterprise-scale hierarchy table for media company permissions';
COMMENT ON MATERIALIZED VIEW user_permissions IS 'Precomputed permissions for fast access (optimized for 1000+ companies)';
COMMENT ON MATERIALIZED VIEW user_security_hierarchy IS 'Detailed hierarchy data for security context building';
COMMENT ON FUNCTION refresh_user_permissions() IS 'Refresh materialized views with concurrency support';
COMMENT ON FUNCTION get_user_security_hierarchy(UUID) IS 'Get complete security hierarchy for a user';
COMMENT ON FUNCTION has_company_access(UUID, UUID) IS 'Fast permission check for company access';
COMMENT ON FUNCTION is_media_company_admin(UUID, UUID) IS 'Check if user is admin of media company';
