-- SUPERSEDED by 20260303100000_platform_restoration_rls_cleanup.sql
-- The infrastructure created by this migration has been removed.
-- Comprehensive Audit Trail System for Enterprise Media Companies
-- Tracks all changes across entities with full context and attribution

-- Main audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity information
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'company', 'media_company', 'team', 'team_member', 'automation_rule', 'automation_execution', 'content', 'asset', 'permission', 'role', 'security_context')),
    entity_id UUID NOT NULL,
    entity_name TEXT,
    
    -- Action information
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'activate', 'deactivate', 'assign', 'unassign', 'execute', 'approve', 'reject', 'login', 'logout', 'access_granted', 'access_denied', 'permission_change', 'role_change', 'export', 'import')),
    action_details JSONB DEFAULT '{}',
    
    -- User and session context
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Company and team context
    media_company_id UUID REFERENCES media_companies(id),
    company_id UUID REFERENCES companies(id),
    team_id UUID REFERENCES enterprise_teams(id),
    
    -- Security context
    access_level INTEGER,
    previous_access_level INTEGER,
    permission_granted BOOLEAN DEFAULT false,
    permission_denied BOOLEAN DEFAULT false,
    
    -- Timing and location
    action_timestamp TIMESTAMPTZ DEFAULT now(),
    duration_ms INTEGER,
    timezone TEXT,
    country TEXT,
    city TEXT,
    
    -- Additional context
    referrer TEXT,
    request_id TEXT,
    correlation_id UUID DEFAULT gen_random_uuid(),
    
    -- Result and error information
    success BOOLEAN DEFAULT true,
    error_code TEXT,
    error_message TEXT,
    affected_rows INTEGER DEFAULT 1,
    
    -- Metadata
    source TEXT DEFAULT 'system',
    client_version TEXT,
    server_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trail configuration
CREATE TABLE IF NOT EXISTS audit_trail_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Configuration
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Retention and cleanup
    retention_days INTEGER DEFAULT 365,
    cleanup_frequency TEXT DEFAULT 'daily' CHECK (cleanup_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
    last_cleanup_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT audit_trail_config_unique UNIQUE(media_company_id, config_key)
);

-- Audit trail summaries for performance
CREATE TABLE IF NOT EXISTS audit_trail_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Summary period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    summary_type TEXT NOT NULL CHECK (summary_type IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Summary metrics
    total_actions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_entities INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 0.0,
    
    -- Breakdown by type
    action_breakdown JSONB DEFAULT '{}',
    entity_breakdown JSONB DEFAULT '{}',
    user_breakdown JSONB DEFAULT '{}',
    
    -- Performance metrics
    processing_time_ms INTEGER DEFAULT 0,
    storage_size_bytes BIGINT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT audit_trail_summaries_unique UNIQUE(media_company_id, period_start, period_end, summary_type)
);

-- Audit trail exports for compliance
CREATE TABLE IF NOT EXISTS audit_trail_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Export details
    export_type TEXT NOT NULL CHECK (export_type IN ('full', 'filtered', 'compliance', 'security', 'performance')),
    export_format TEXT NOT NULL CHECK (export_format IN ('json', 'csv', 'xml', 'pdf')),
    
    -- Export parameters
    filters JSONB DEFAULT '{}',
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    
    -- Export tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path TEXT,
    file_size_bytes BIGINT,
    download_count INTEGER DEFAULT 0,
    
    -- Export metadata
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT audit_trail_exports_unique UNIQUE(media_company_id, export_type, date_range_start, date_range_end)
);

-- Performance indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_media_company ON audit_trail(media_company_id, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_company ON audit_trail(company_id, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_team ON audit_trail(team_id, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_correlation ON audit_trail(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_session ON audit_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type, action_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_config_media_company ON audit_trail_config(media_company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_audit_trail_summaries_period ON audit_trail_summaries(media_company_id, period_start, period_end, summary_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_summaries_created ON audit_trail_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_exports_media_company ON audit_trail_exports(media_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_exports_status ON audit_trail_exports(status, created_at DESC);

-- RLS Policies for audit trail
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_exports ENABLE ROW LEVEL SECURITY;

-- Audit trail RLS
CREATE POLICY "Users can view audit trail for their media companies" ON audit_trail
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to audit trail" ON audit_trail
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Audit trail config RLS
CREATE POLICY "Users can view audit config for their media companies" ON audit_trail_config
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Admins can manage audit config for their media companies" ON audit_trail_config
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Audit trail summaries RLS
CREATE POLICY "Users can view audit summaries for their media companies" ON audit_trail_summaries
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to audit summaries" ON audit_trail_summaries
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Audit trail exports RLS
CREATE POLICY "Users can view audit exports for their media companies" ON audit_trail_exports
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
    AND requested_by = current_setting('app.current_user_id', true)::UUID
);

CREATE POLICY "Admins can manage audit exports for their media companies" ON audit_trail_exports
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Functions for audit trail

-- Function to create audit trail entry
CREATE OR REPLACE FUNCTION create_audit_entry(
    _entity_type TEXT,
    _entity_id UUID,
    _entity_name TEXT DEFAULT NULL,
    _action_type TEXT,
    _action_details JSONB DEFAULT '{}',
    _user_id UUID DEFAULT NULL,
    _media_company_id UUID DEFAULT NULL,
    _company_id UUID DEFAULT NULL,
    _team_id UUID DEFAULT NULL,
    _access_level INTEGER DEFAULT NULL,
    _previous_access_level INTEGER DEFAULT NULL,
    _permission_granted BOOLEAN DEFAULT false,
    _permission_denied BOOLEAN DEFAULT false,
    _success BOOLEAN DEFAULT true,
    _error_code TEXT DEFAULT NULL,
    _error_message TEXT DEFAULT NULL,
    _affected_rows INTEGER DEFAULT 1,
    _source TEXT DEFAULT 'system',
    _client_version TEXT DEFAULT NULL,
    _correlation_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    -- Create audit entry
    INSERT INTO audit_trail (
        entity_type,
        entity_id,
        entity_name,
        action_type,
        action_details,
        user_id,
        media_company_id,
        company_id,
        team_id,
        access_level,
        previous_access_level,
        permission_granted,
        permission_denied,
        success,
        error_code,
        error_message,
        affected_rows,
        source,
        client_version,
        correlation_id
    ) VALUES (
        _entity_type,
        _entity_id,
        _entity_name,
        _action_type,
        _action_details,
        _user_id,
        _media_company_id,
        _company_id,
        _team_id,
        _access_level,
        _previous_access_level,
        _permission_granted,
        _permission_denied,
        _success,
        _error_code,
        _error_message,
        _affected_rows,
        _source,
        _client_version,
        _correlation_id
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create audit entry: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to get audit trail entries
CREATE OR REPLACE FUNCTION get_audit_trail(
    _media_company_id UUID DEFAULT NULL,
    _entity_type TEXT DEFAULT NULL,
    _entity_id UUID DEFAULT NULL,
    _user_id UUID DEFAULT NULL,
    _action_type TEXT DEFAULT NULL,
    _date_start TIMESTAMPTZ DEFAULT NULL,
    _date_end TIMESTAMPTZ DEFAULT NULL,
    _limit INTEGER DEFAULT 100,
    _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    entity_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    action_type TEXT,
    action_details JSONB,
    user_id UUID,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    media_company_id UUID,
    company_id UUID,
    team_id UUID,
    access_level INTEGER,
    action_timestamp TIMESTAMPTZ,
    duration_ms INTEGER,
    timezone TEXT,
    country TEXT,
    city TEXT,
    success BOOLEAN,
    error_code TEXT,
    error_message TEXT,
    correlation_id UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    at.id,
    at.entity_type,
    at.entity_id,
    at.entity_name,
    at.action_type,
    at.action_details,
    at.user_id,
    at.session_id,
    at.ip_address,
    at.user_agent,
    at.media_company_id,
    at.company_id,
    at.team_id,
    at.access_level,
    at.action_timestamp,
    at.duration_ms,
    at.timezone,
    at.country,
    at.city,
    at.success,
    at.error_code,
    at.error_message,
    at.correlation_id,
    at.created_at
FROM audit_trail at
WHERE 
    (_media_company_id IS NULL OR at.media_company_id = _media_company_id)
    AND (_entity_type IS NULL OR at.entity_type = _entity_type)
    AND (_entity_id IS NULL OR at.entity_id = _entity_id)
    AND (_user_id IS NULL OR at.user_id = _user_id)
    AND (_action_type IS NULL OR at.action_type = _action_type)
    AND (_date_start IS NULL OR at.action_timestamp >= _date_start)
    AND (_date_end IS NULL OR at.action_timestamp <= _date_end)
ORDER BY at.action_timestamp DESC
LIMIT _limit
OFFSET _offset;
$$;

-- Function to create audit trail summary
CREATE OR REPLACE FUNCTION create_audit_summary(
    _media_company_id UUID,
    _period_start TIMESTAMPTZ,
    _period_end TIMESTAMPTZ,
    _summary_type TEXT,
    _total_actions INTEGER DEFAULT 0,
    _unique_users INTEGER DEFAULT 0,
    _unique_entities INTEGER DEFAULT 0,
    _error_count INTEGER DEFAULT 0,
    _action_breakdown JSONB DEFAULT '{}',
    _entity_breakdown JSONB DEFAULT '{}',
    _user_breakdown JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_summary_id UUID;
BEGIN
    -- Create audit summary
    INSERT INTO audit_trail_summaries (
        media_company_id,
        period_start,
        period_end,
        summary_type,
        total_actions,
        unique_users,
        unique_entities,
        error_count,
        success_rate,
        action_breakdown,
        entity_breakdown,
        user_breakdown
    ) VALUES (
        _media_company_id,
        _period_start,
        _period_end,
        _summary_type,
        _total_actions,
        _unique_users,
        _unique_entities,
        _error_count,
        CASE WHEN _total_actions > 0 THEN (_total_actions - _error_count)::NUMERIC / _total_actions * 100 ELSE 0 END,
        _action_breakdown,
        _entity_breakdown,
        _user_breakdown
    ) RETURNING id INTO v_summary_id;
    
    RETURN v_summary_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create audit summary: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to export audit trail
CREATE OR REPLACE FUNCTION export_audit_trail(
    _media_company_id UUID,
    _export_type TEXT,
    _export_format TEXT,
    _filters JSONB DEFAULT '{}',
    _date_range_start TIMESTAMPTZ DEFAULT NULL,
    _date_range_end TIMESTAMPTZ DEFAULT NULL,
    _requested_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_export_id UUID;
BEGIN
    -- Create export record
    INSERT INTO audit_trail_exports (
        media_company_id,
        export_type,
        export_format,
        filters,
        date_range_start,
        date_range_end,
        requested_by,
        status
    ) VALUES (
        _media_company_id,
        _export_type,
        _export_format,
        _filters,
        _date_range_start,
        _date_range_end,
        _requested_by,
        'pending'
    ) RETURNING id INTO v_export_id;
    
    RETURN v_export_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create audit export: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to cleanup old audit entries
CREATE OR REPLACE FUNCTION cleanup_audit_trail(
    _media_company_id UUID,
    _retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_deleted_count INTEGER := 0;
BEGIN
    -- Calculate cutoff date
    v_cutoff_date := now() - (_retention_days || ' days')::INTERVAL;
    
    -- Delete old audit entries
    DELETE FROM audit_trail 
    WHERE media_company_id = _media_company_id
    AND action_timestamp < v_cutoff_date
    AND id NOT IN (
        SELECT audit_id FROM audit_trail_exports 
        WHERE media_company_id = _media_company_id 
        AND status = 'processing'
    );
    
    GET DIAGNOSTICS v_deleted_count;
    
    -- Update last cleanup timestamp
    UPDATE audit_trail_config
    SET last_cleanup_at = now()
    WHERE media_company_id = _media_company_id
    AND config_key = 'retention_cleanup';
    
    RETURN v_deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to cleanup audit trail: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_audit_entry(TEXT, UUID, TEXT, TEXT, JSONB, UUID, UUID, UUID, UUID, UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_trail(UUID, TEXT, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER, INTEGER, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION export_audit_trail(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_audit_trail(UUID, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE audit_trail IS 'Comprehensive audit trail for all system changes with full context';
COMMENT ON TABLE audit_trail_config IS 'Configuration for audit trail retention and cleanup';
COMMENT ON TABLE audit_trail_summaries IS 'Performance-optimized summaries of audit trail data';
COMMENT ON TABLE audit_trail_exports IS 'Audit trail export tracking for compliance and reporting';

COMMENT ON FUNCTION create_audit_entry(TEXT, UUID, TEXT, TEXT, JSONB, UUID, UUID, UUID, UUID, UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, UUID) IS 'Create audit trail entry with full context and correlation tracking';
COMMENT ON FUNCTION get_audit_trail(UUID, TEXT, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) IS 'Retrieve audit trail entries with advanced filtering and pagination';
COMMENT ON FUNCTION create_audit_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER, INTEGER, JSONB, JSONB, JSONB) IS 'Create performance-optimized audit summaries';
COMMENT ON FUNCTION export_audit_trail(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS 'Create audit trail export with tracking and compliance support';
COMMENT ON FUNCTION cleanup_audit_trail(UUID, INTEGER) IS 'Cleanup old audit entries based on retention policies';
