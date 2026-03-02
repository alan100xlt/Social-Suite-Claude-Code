-- Team Management System for Enterprise Media Companies
-- Hierarchical team structure with role-based permissions and inheritance

-- Enhanced team structure with hierarchy support
CREATE TABLE IF NOT EXISTS enterprise_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Team hierarchy
    parent_team_id UUID REFERENCES enterprise_teams(id) ON DELETE CASCADE,
    team_level INTEGER NOT NULL DEFAULT 1 CHECK (team_level >= 1),
    team_path TEXT, -- Computed path for hierarchy queries
    
    -- Team details
    name TEXT NOT NULL,
    description TEXT,
    team_code TEXT UNIQUE, -- Unique identifier for team
    team_type TEXT NOT NULL CHECK (team_type IN ('executive', 'management', 'operations', 'creative', 'technical', 'support', 'admin')),
    
    -- Team settings
    is_active BOOLEAN DEFAULT true,
    is_cross_company BOOLEAN DEFAULT false, -- Can work across multiple companies
    max_members INTEGER DEFAULT 50,
    
    -- Permission inheritance
    inherits_permissions_from UUID REFERENCES enterprise_teams(id) ON DELETE CASCADE,
    permission_inheritance_mode TEXT DEFAULT 'union' CHECK (permission_inheritance_mode IN ('union', 'intersection', 'override')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_teams_unique_code UNIQUE(media_company_id, team_code)
);

-- Team members with cross-company support
CREATE TABLE IF NOT EXISTS enterprise_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES enterprise_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Membership details
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'lead', 'senior', 'member', 'guest')),
    permissions JSONB DEFAULT '{}', -- Specific permissions override
    is_active BOOLEAN DEFAULT true,
    
    -- Assignment details
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    
    -- Company access for this team membership
    accessible_companies UUID[] DEFAULT '{}', -- Companies this member can access via this team
    primary_company_id UUID REFERENCES companies(id), -- Primary company for this membership
    
    -- Membership lifecycle
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    leave_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_team_members_unique UNIQUE(team_id, user_id)
);

-- Role definitions with inheritance rules
CREATE TABLE IF NOT EXISTS enterprise_team_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Role definition
    role_name TEXT NOT NULL,
    role_code TEXT NOT NULL,
    role_level INTEGER NOT NULL CHECK (role_level >= 1 AND role_level <= 10),
    role_type TEXT NOT NULL CHECK (role_type IN ('system', 'custom', 'inherited')),
    
    -- Permission configuration
    base_permissions JSONB DEFAULT '{}',
    inheritance_rules JSONB DEFAULT '{}', -- How permissions are inherited
    can_inherit BOOLEAN DEFAULT true,
    can_delegate BOOLEAN DEFAULT false,
    
    -- Role hierarchy
    reports_to_role_id UUID REFERENCES enterprise_team_roles(id) ON DELETE CASCADE,
    parent_role_id UUID REFERENCES enterprise_team_roles(id) ON DELETE CASCADE,
    
    -- Metadata
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_team_roles_unique_code UNIQUE(media_company_id, role_code)
);

-- Team permissions with inheritance support
CREATE TABLE IF NOT EXISTS enterprise_team_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Permission definition
    permission_key TEXT NOT NULL,
    permission_name TEXT NOT NULL,
    permission_category TEXT NOT NULL CHECK (permission_category IN ('content', 'user', 'team', 'automation', 'analytics', 'admin', 'system')),
    permission_level INTEGER NOT NULL CHECK (permission_level >= 1 AND permission_level <= 10),
    
    -- Permission details
    description TEXT,
    resource_type TEXT CHECK (resource_type IN ('all', 'content', 'user', 'team', 'automation', 'analytics', 'system')),
    
    -- Inheritance configuration
    is_inheritable BOOLEAN DEFAULT true,
    inheritance_strength NUMERIC(3,2) DEFAULT 1.0 CHECK (inheritance_strength >= 0.0 AND inheritance_strength <= 10.0),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_team_permissions_unique UNIQUE(media_company_id, permission_key)
);

-- Team permission assignments with inheritance
CREATE TABLE IF NOT EXISTS enterprise_team_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES enterprise_team_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES enterprise_team_permissions(id) ON DELETE CASCADE,
    
    -- Assignment details
    is_granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    -- Inheritance tracking
    inherited_from_role_id UUID REFERENCES enterprise_team_roles(id) ON DELETE CASCADE,
    inheritance_source TEXT CHECK (inheritance_source IN ('direct', 'inherited', 'computed')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_team_role_permissions_unique UNIQUE(role_id, permission_id)
);

-- Team performance metrics
CREATE TABLE IF NOT EXISTS enterprise_team_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES enterprise_teams(id) ON DELETE CASCADE,
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Performance period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Team metrics
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    new_members INTEGER DEFAULT 0,
    members_left INTEGER DEFAULT 0,
    
    -- Performance metrics
    tasks_completed INTEGER DEFAULT 0,
    tasks_assigned INTEGER DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0.0,
    average_task_duration_hours NUMERIC(8,2) DEFAULT 0.0,
    
    -- Quality metrics
    satisfaction_score NUMERIC(3,1) DEFAULT 0.0 CHECK (satisfaction_score >= 0.0 AND satisfaction_score <= 10.0),
    engagement_score NUMERIC(5,2) DEFAULT 0.0,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT enterprise_team_performance_unique_period UNIQUE(team_id, period_start, period_end, period_type)
);

-- Cross-company team assignments
CREATE TABLE IF NOT EXISTS cross_company_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES enterprise_teams(id) ON DELETE CASCADE,
    
    -- Assignment details
    source_company_id UUID NOT NULL REFERENCES companies(id),
    target_company_ids UUID[] NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('collaboration', 'support', 'oversight', 'project_based')),
    
    -- Assignment configuration
    permissions JSONB DEFAULT '{}',
    access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write', 'admin', 'full')),
    is_active BOOLEAN DEFAULT true,
    
    -- Lifecycle
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes for team management
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_media_company ON enterprise_teams(media_company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_parent ON enterprise_teams(parent_team_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_level ON enterprise_teams(team_level);
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_type ON enterprise_teams(team_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_active ON enterprise_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_enterprise_teams_cross_company ON enterprise_teams(is_cross_company) WHERE is_cross_company = true;

CREATE INDEX IF NOT EXISTS idx_enterprise_team_members_team ON enterprise_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_members_user ON enterprise_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_members_role ON enterprise_team_members(role);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_members_active ON enterprise_team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_members_companies ON enterprise_team_members USING GIN(accessible_companies);

CREATE INDEX IF NOT EXISTS idx_enterprise_team_roles_media_company ON enterprise_team_roles(media_company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_roles_level ON enterprise_team_roles(role_level);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_roles_type ON enterprise_team_roles(role_type);

CREATE INDEX IF NOT EXISTS idx_enterprise_team_permissions_media_company ON enterprise_team_permissions(media_company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_permissions_category ON enterprise_team_permissions(permission_category);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_permissions_inheritable ON enterprise_team_permissions(is_inheritable) WHERE is_inheritable = true;

CREATE INDEX IF NOT EXISTS idx_enterprise_team_role_permissions_role ON enterprise_team_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_role_permissions_permission ON enterprise_team_role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_team_performance_team ON enterprise_team_performance(team_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_team_performance_period ON enterprise_team_performance(period_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_cross_company_assignments_team ON cross_company_team_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_cross_company_assignments_source ON cross_company_team_assignments(source_company_id);
CREATE INDEX IF NOT EXISTS idx_cross_company_assignments_active ON cross_company_team_assignments(is_active) WHERE is_active = true;

-- RLS Policies for team management
ALTER TABLE enterprise_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_company_team_assignments ENABLE ROW LEVEL SECURITY;

-- Enterprise teams RLS
CREATE POLICY "Users can view teams for their media companies" ON enterprise_teams
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can create teams for their media companies" ON enterprise_teams
FOR INSERT WITH CHECK (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

CREATE POLICY "Users can update teams for their media companies" ON enterprise_teams
FOR UPDATE USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to teams" ON enterprise_teams
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Team members RLS
CREATE POLICY "Users can view team memberships for accessible teams" ON enterprise_team_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM enterprise_teams et
        WHERE et.id = enterprise_team_members.team_id
        AND et.media_company_id = ANY(session_media_companies())
    )
);

CREATE POLICY "Users can manage team memberships for their teams" ON enterprise_team_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM enterprise_teams et
        WHERE et.id = enterprise_team_members.team_id
        AND et.media_company_id = ANY(session_media_companies())
    )
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Team roles and permissions RLS
CREATE POLICY "Users can view roles for their media companies" ON enterprise_team_roles
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Admins can manage roles for their media companies" ON enterprise_team_roles
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

CREATE POLICY "Service role full access to roles" ON enterprise_team_roles
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Team permissions RLS
CREATE POLICY "Users can view permissions for their media companies" ON enterprise_team_permissions
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Admins can manage permissions for their media companies" ON enterprise_team_permissions
FOR ALL USING (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Team performance RLS
CREATE POLICY "Users can view performance for their teams" ON enterprise_team_performance
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM enterprise_teams et
        WHERE et.id = enterprise_team_performance.team_id
        AND et.media_company_id = ANY(session_media_companies())
    )
);

CREATE POLICY "Service role full access to team performance" ON enterprise_team_performance
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Cross-company assignments RLS
CREATE POLICY "Users can view cross-company assignments" ON cross_company_team_assignments
FOR SELECT USING (
    source_company_id = ANY(session_media_companies())
    OR target_company_ids && session_media_companies()
);

CREATE POLICY "Admins can manage cross-company assignments" ON cross_company_team_assignments
FOR ALL USING (
    source_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Functions for team management

-- Function to create team with hierarchy
CREATE OR REPLACE FUNCTION create_enterprise_team(
    _media_company_id UUID,
    _name TEXT,
    _description TEXT DEFAULT NULL,
    _team_code TEXT,
    _team_type TEXT,
    _parent_team_id UUID DEFAULT NULL,
    _is_cross_company BOOLEAN DEFAULT false,
    _max_members INTEGER DEFAULT 50,
    _created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_id UUID;
    v_team_level INTEGER := 1;
BEGIN
    -- Validate user has access to media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = _created_by
        AND _media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this media company';
    END IF;
    
    -- Validate user has admin access
    IF current_setting('app.max_access_level', true)::INTEGER < 3 THEN
        RAISE EXCEPTION 'User does not have permission to create teams';
    END IF;
    
    -- Calculate team level based on parent
    IF _parent_team_id IS NOT NULL THEN
        SELECT team_level INTO v_team_level
        FROM enterprise_teams
        WHERE id = _parent_team_id;
        v_team_level := v_team_level + 1;
    END IF;
    
    -- Create team
    INSERT INTO enterprise_teams (
        media_company_id,
        parent_team_id,
        team_level,
        team_path,
        name,
        description,
        team_code,
        team_type,
        is_cross_company,
        max_members,
        created_by
    ) VALUES (
        _media_company_id,
        _parent_team_id,
        v_team_level,
        COALESCE(
            (SELECT team_path FROM enterprise_teams WHERE id = _parent_team_id),
            ''
        ) || '/' || _team_code,
        _name,
        _description,
        _team_code,
        _team_type,
        _is_cross_company,
        _max_members,
        _created_by
    ) RETURNING id INTO v_team_id;
    
    RETURN v_team_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create enterprise team: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to add team member with permissions
CREATE OR REPLACE FUNCTION add_team_member(
    _team_id UUID,
    _user_id UUID,
    _role TEXT,
    _permissions JSONB DEFAULT '{}',
    _accessible_companies UUID[] DEFAULT '{}',
    _primary_company_id UUID DEFAULT NULL,
    _assigned_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_membership_id UUID;
BEGIN
    -- Validate user has access to team
    IF NOT EXISTS (
        SELECT 1 FROM enterprise_teams et
        WHERE et.id = _team_id
        AND et.media_company_id = ANY(session_media_companies())
    ) THEN
        RAISE EXCEPTION 'User does not have access to this team';
    END IF;
    
    -- Validate user has admin access
    IF current_setting('app.max_access_level', true)::INTEGER < 3 THEN
        RAISE EXCEPTION 'User does not have permission to manage team members';
    END IF;
    
    -- Check team member limit
    IF (SELECT COUNT(*) FROM enterprise_team_members WHERE team_id = _team_id AND is_active = true) >= 
       (SELECT max_members FROM enterprise_teams WHERE id = _team_id) THEN
        RAISE EXCEPTION 'Team member limit exceeded';
    END IF;
    
    -- Add team member
    INSERT INTO enterprise_team_members (
        team_id,
        user_id,
        role,
        permissions,
        accessible_companies,
        primary_company_id,
        assigned_by
    ) VALUES (
        _team_id,
        _user_id,
        _role,
        _permissions,
        _accessible_companies,
        _primary_company_id,
        _assigned_by
    ) RETURNING id INTO v_membership_id;
    
    RETURN v_membership_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add team member: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to get team hierarchy
CREATE OR REPLACE FUNCTION get_team_hierarchy(
    _media_company_id UUID,
    _root_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    team_code TEXT,
    team_level INTEGER,
    parent_team_id UUID,
    team_path TEXT,
    team_type TEXT,
    is_active BOOLEAN,
    member_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH RECURSIVE team_hierarchy AS (
    -- Base case
    SELECT 
        et.id,
        et.name,
        et.team_code,
        et.team_level,
        et.parent_team_id,
        et.team_path,
        et.team_type,
        et.is_active,
        0::BIGINT as member_count,
        et.created_at
    FROM enterprise_teams et
    WHERE 
        et.media_company_id = _media_company_id
        AND (_root_team_id IS NULL OR et.id = _root_team_id)
    
    UNION ALL
    
    -- Recursive case
    SELECT 
        et.id,
        et.name,
        et.team_code,
        et.team_level,
        et.parent_team_id,
        et.team_path,
        et.team_type,
        et.is_active,
        (SELECT COUNT(*) FROM enterprise_team_members etm WHERE etm.team_id = et.id AND etm.is_active = true) as member_count,
        et.created_at
    FROM enterprise_teams et
    INNER JOIN team_hierarchy th ON et.parent_team_id = th.id
    WHERE et.media_company_id = _media_company_id
)
SELECT 
    id,
    name,
    team_code,
    team_level,
    parent_team_id,
    team_path,
    team_type,
    is_active,
    member_count,
    created_at
FROM team_hierarchy
ORDER BY team_level, name;
$$;

-- Function to calculate inherited permissions
CREATE OR REPLACE FUNCTION get_user_inherited_permissions(
    _user_id UUID,
    _team_id UUID DEFAULT NULL
)
RETURNS TABLE (
    permission_key TEXT,
    permission_name TEXT,
    permission_category TEXT,
    permission_level INTEGER,
    inheritance_source TEXT,
    team_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH user_teams AS (
    SELECT etm.team_id, etm.role, etm.permissions
    FROM enterprise_team_members etm
    INNER JOIN enterprise_teams et ON et.id = etm.team_id
    WHERE etm.user_id = _user_id
    AND etm.is_active = true
),
team_permissions AS (
    SELECT 
        etrp.permission_key,
        etrp.permission_name,
        etrp.permission_category,
        etrp.permission_level,
        'direct' as inheritance_source,
        et.name as team_name
    FROM user_teams ut
    INNER JOIN enterprise_team_role_permissions etrp ON ut.team_id = etrp.role_id
    INNER JOIN enterprise_team_permissions etp ON etrp.permission_id = etp.id
),
inherited_permissions AS (
    SELECT 
        etp.permission_key,
        etp.permission_name,
        etp.permission_category,
        etp.permission_level,
        'inherited' as inheritance_source,
        et.name as team_name
    FROM user_teams ut
    INNER JOIN enterprise_teams et ON ut.team_id = et.id
    INNER JOIN enterprise_team_roles etr ON et.parent_team_id = etr.id
    INNER JOIN enterprise_team_role_permissions etrp ON etr.id = etrp.role_id
    INNER JOIN enterprise_team_permissions etp ON etrp.permission_id = etp.id
    WHERE etp.is_inheritable = true
)
SELECT * FROM team_permissions
UNION ALL
SELECT * FROM inherited_permissions;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_enterprise_team(UUID, TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_team_member(UUID, UUID, TEXT, JSONB, UUID[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_hierarchy(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_inherited_permissions(UUID, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE enterprise_teams IS 'Hierarchical team structure with cross-company support';
COMMENT ON TABLE enterprise_team_members IS 'Team members with role-based permissions and company access';
COMMENT ON TABLE enterprise_team_roles IS 'Role definitions with inheritance rules and hierarchy';
COMMENT ON TABLE enterprise_team_permissions IS 'Granular permissions with inheritance support';
COMMENT ON TABLE enterprise_team_role_permissions IS 'Role-permission assignments with inheritance tracking';
COMMENT ON TABLE enterprise_team_performance IS 'Team performance metrics and analytics';
COMMENT ON TABLE cross_company_team_assignments IS 'Cross-company team collaboration assignments';

COMMENT ON FUNCTION create_enterprise_team(UUID, TEXT, TEXT, TEXT, UUID, BOOLEAN, INTEGER, UUID) IS 'Create hierarchical team with level calculation';
COMMENT ON FUNCTION add_team_member(UUID, UUID, TEXT, JSONB, UUID[], UUID, UUID) IS 'Add team member with permissions and company access';
COMMENT ON FUNCTION get_team_hierarchy(UUID, UUID) IS 'Get complete team hierarchy with member counts';
COMMENT ON FUNCTION get_user_inherited_permissions(UUID, UUID) IS 'Calculate user permissions including inheritance from team structure';
