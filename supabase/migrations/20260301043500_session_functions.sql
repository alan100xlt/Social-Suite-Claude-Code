-- Session and utility functions for enterprise security system

-- Function to set database session variables for RLS
CREATE OR REPLACE FUNCTION set_session_context(
    accessible_companies UUID[],
    media_companies UUID[],
    max_access_level INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set session variables for RLS policies
    PERFORM set_config('app.accessible_companies', array_to_string(accessible_companies, ','), true);
    PERFORM set_config('app.media_companies', array_to_string(media_companies, ','), true);
    PERFORM set_config('app.max_access_level', max_access_level::TEXT, true);
    
    -- Set as arrays for easier RLS handling
    PERFORM set_config('app.company_ids', array_to_string(accessible_companies, ','), true);
END;
$$;

-- Function to update last accessed timestamp
CREATE OR REPLACE FUNCTION update_last_accessed(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE media_company_hierarchy
    SET last_accessed_at = now()
    WHERE user_id = _user_id;
END;
$$;

-- Function to get user's current session context
CREATE OR REPLACE FUNCTION get_session_context()
RETURNS TABLE (
    accessible_companies UUID[],
    media_companies UUID[],
    max_access_level INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    string_to_array(current_setting('app.accessible_companies', true), ',')::UUID[] as accessible_companies,
    string_to_array(current_setting('app.media_companies', true), ',')::UUID[] as media_companies,
    current_setting('app.max_access_level', true)::INTEGER as max_access_level;
$$;

-- Function to clear session context
CREATE OR REPLACE FUNCTION clear_session_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.accessible_companies', '', true);
    PERFORM set_config('app.media_companies', '', true);
    PERFORM set_config('app.max_access_level', '', true);
    PERFORM set_config('app.company_ids', '', true);
END;
$$;

-- Function to check if current session has access to company
CREATE OR REPLACE FUNCTION session_has_company_access(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT _company_id = ANY(
    string_to_array(current_setting('app.company_ids', true), ',')::UUID[]
);
$$;

-- Function to get user's accessible companies from session
CREATE OR REPLACE FUNCTION session_accessible_companies()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT string_to_array(current_setting('app.company_ids', true), ',')::UUID[];
$$;

-- Function to get user's media companies from session
CREATE OR REPLACE FUNCTION session_media_companies()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT string_to_array(current_setting('app.media_companies', true), ',')::UUID[];
$$;

-- Function to check if current session is media company admin
CREATE OR REPLACE FUNCTION session_is_media_company_admin(_media_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    _media_company_id = ANY(
        string_to_array(current_setting('app.media_companies', true), ',')::UUID[]
    )
    AND current_setting('app.max_access_level', true)::INTEGER >= 5;
$$;

-- Function to refresh user permissions (called by triggers)
CREATE OR REPLACE FUNCTION refresh_user_permissions_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function will be called by database triggers
    -- to refresh materialized views for affected users
    
    -- Refresh materialized views for specific user
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM pg_notify('refresh_permissions', NEW.user_id::TEXT);
        
        -- Also refresh for old user if update
        IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
            PERFORM pg_notify('refresh_permissions', OLD.user_id::TEXT);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger for automatic permission refresh
CREATE TRIGGER trigger_refresh_media_company_hierarchy
    AFTER INSERT OR UPDATE OR DELETE
    ON media_company_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION refresh_user_permissions_trigger();

-- Function to batch refresh permissions for multiple users
CREATE OR REPLACE FUNCTION batch_refresh_permissions(_user_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user_id UUID;
BEGIN
    -- Loop through user IDs and send notifications
    FOREACH v_user_id IN ARRAY _user_ids
    LOOP
        PERFORM pg_notify('refresh_permissions', v_user_id::TEXT);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Function to get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics()
RETURNS TABLE (
    total_users BIGINT,
    total_media_companies BIGINT,
    total_child_companies BIGINT,
    avg_companies_per_user NUMERIC,
    cache_hit_rate NUMERIC,
    last_refresh TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    COUNT(DISTINCT uh.user_id) as total_users,
    COUNT(DISTINCT uh.media_company_id) as total_media_companies,
    COUNT(DISTINCT uh.child_company_id) as total_child_companies,
    AVG(array_length(up.accessible_companies, 1)) as avg_companies_per_user,
    0.0 as cache_hit_rate, -- TODO: Implement cache hit rate tracking
        MAX(up.last_updated) as last_refresh
FROM media_company_hierarchy uh
LEFT JOIN user_permissions up ON uh.user_id = up.user_id;
$$;

-- Function to cleanup old security data
CREATE OR REPLACE FUNCTION cleanup_security_data(_days_old INTEGER DEFAULT 90)
RETURNS TABLE (
    cleaned_records BIGINT,
    cleaned_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cleaned_records BIGINT := 0;
    v_cleaned_users BIGINT := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := now() - (_days_old || ' days')::INTERVAL;
    
    -- Clean up old hierarchy records for inactive users
    DELETE FROM media_company_hierarchy uh
    WHERE uh.last_accessed_at < v_cutoff_date
    AND NOT EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = uh.user_id 
        AND u.last_sign_in_at > v_cutoff_date
    );
    
    GET DIAGNOSTICS v_cleaned_records = ROW_COUNT;
    
    -- Clean up orphaned user permissions
    DELETE FROM user_permissions up
    WHERE NOT EXISTS (
        SELECT 1 FROM media_company_hierarchy uh 
        WHERE uh.user_id = up.user_id
    );
    
    GET DIAGNOSTICS v_cleaned_users = ROW_COUNT;
    
    -- Refresh materialized views
    PERFORM refresh_user_permissions();
    
    cleaned_records := v_cleaned_records;
    cleaned_users := v_cleaned_users;
    RETURN NEXT;
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION set_session_context(UUID[], UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_accessed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_context() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_session_context() TO authenticated;
GRANT EXECUTE ON FUNCTION session_has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION session_accessible_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION session_media_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION session_is_media_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_refresh_permissions(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_security_data(INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION set_session_context(UUID[], UUID[], INTEGER) IS 'Set database session variables for RLS policies';
COMMENT ON FUNCTION update_last_accessed(UUID) IS 'Update user last accessed timestamp';
COMMENT ON FUNCTION get_session_context() IS 'Get current session context variables';
COMMENT ON FUNCTION clear_session_context() IS 'Clear all session context variables';
COMMENT ON FUNCTION session_has_company_access(UUID) IS 'Check if session has access to specific company';
COMMENT ON FUNCTION session_accessible_companies() IS 'Get accessible companies from session';
COMMENT ON FUNCTION session_media_companies() IS 'Get media companies from session';
COMMENT ON FUNCTION session_is_media_company_admin(UUID) IS 'Check if session is media company admin';
COMMENT ON FUNCTION batch_refresh_permissions(UUID[]) IS 'Batch refresh permissions for multiple users';
COMMENT ON FUNCTION get_security_statistics() IS 'Get security system statistics';
COMMENT ON FUNCTION cleanup_security_data(INTEGER) IS 'Cleanup old security data';
