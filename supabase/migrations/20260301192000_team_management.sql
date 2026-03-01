-- Team Management System for Enterprise Portfolio
-- Supports role-based permissions, inheritance, and audit trails

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive', 'suspended')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, media_company_id),
  UNIQUE(email, media_company_id)
);

-- Company Access Table (for cross-company permissions)
CREATE TABLE IF NOT EXISTS company_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  permissions TEXT[] DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_inherited BOOLEAN DEFAULT false,
  inherited_from UUID REFERENCES team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(team_member_id, company_id)
);

-- Role Templates Table
CREATE TABLE IF NOT EXISTS role_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(media_company_id, name)
);

-- Permission Categories Table
CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES permission_categories(id),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource_type TEXT,
  action TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Member Permissions Table
CREATE TABLE IF NOT EXISTS team_member_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_inherited BOOLEAN DEFAULT false,
  inherited_from_team_member_id UUID REFERENCES team_members(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(team_member_id, permission_id, company_id)
);

-- Team Activity Log Table (Audit Trail)
CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  company_id UUID REFERENCES companies(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_template_id UUID REFERENCES role_templates(id),
  role TEXT CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
  message TEXT,
  token UUID DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Invitations Table
CREATE TABLE IF NOT EXISTS bulk_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_template_id UUID REFERENCES role_templates(id),
  file_name TEXT,
  file_path TEXT,
  total_emails INTEGER DEFAULT 0,
  successful_invites INTEGER DEFAULT 0,
  failed_invites INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Invitation Details Table
CREATE TABLE IF NOT EXISTS bulk_invitation_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bulk_invitation_id UUID NOT NULL REFERENCES bulk_invitations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'failed', 'accepted', 'declined')),
  error_message TEXT,
  invitation_id UUID REFERENCES team_invitations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_media_company_id ON team_members(media_company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_joined_at ON team_members(joined_at);
CREATE INDEX IF NOT EXISTS idx_team_members_last_active ON team_members(last_active_at);

CREATE INDEX IF NOT EXISTS idx_company_access_team_member_id ON company_access(team_member_id);
CREATE INDEX IF NOT EXISTS idx_company_access_company_id ON company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_company_access_role ON company_access(role);
CREATE INDEX IF NOT EXISTS idx_company_access_granted_at ON company_access(granted_at);
CREATE INDEX IF NOT EXISTS idx_company_access_is_inherited ON company_access(is_inherited);

CREATE INDEX IF NOT EXISTS idx_role_templates_media_company_id ON role_templates(media_company_id);
CREATE INDEX IF NOT EXISTS idx_role_templates_is_default ON role_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_role_templates_usage_count ON role_templates(usage_count);

CREATE INDEX IF NOT EXISTS idx_permissions_category_id ON permissions(category_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_type ON permissions(resource_type);

CREATE INDEX IF NOT EXISTS idx_team_member_permissions_team_member_id ON team_member_permissions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_permissions_permission_id ON team_member_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_team_member_permissions_company_id ON team_member_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_team_member_permissions_is_inherited ON team_member_permissions(is_inherited);

CREATE INDEX IF NOT EXISTS idx_team_activity_log_team_member_id ON team_activity_log(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_performed_by ON team_activity_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_action ON team_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_created_at ON team_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_company_id ON team_activity_log(company_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_bulk_invitations_batch_id ON bulk_invitations(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_invitations_status ON bulk_invitations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_invitation_details_bulk_invitation_id ON bulk_invitation_details(bulk_invitation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_invitation_details_status ON bulk_invitation_details(status);

-- GIN Indexes for array columns
CREATE INDEX IF NOT EXISTS idx_company_access_permissions_gin ON company_access USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_role_templates_permissions_gin ON role_templates USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_team_members_preferences_gin ON team_members USING GIN(preferences);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_old_values_gin ON team_activity_log USING GIN(old_values);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_new_values_gin ON team_activity_log USING GIN(new_values);

-- Functions for Team Management

-- Function to invite team member
CREATE OR REPLACE FUNCTION invite_team_member(
  p_email TEXT,
  p_name TEXT,
  p_media_company_id UUID,
  p_role TEXT DEFAULT 'viewer',
  p_role_template_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_existing_member_id UUID;
BEGIN
  -- Check if user already exists as team member
  SELECT id INTO v_existing_member_id
  FROM team_members
  WHERE email = p_email AND media_company_id = p_media_company_id;
  
  IF v_existing_member_id IS NOT NULL THEN
    RAISE EXCEPTION 'User is already a team member';
  END IF;
  
  -- Create invitation
  INSERT INTO team_invitations (
    email,
    invited_by,
    media_company_id,
    role_template_id,
    role,
    message,
    token,
    expires_at
  ) VALUES (
    p_email,
    p_invited_by,
    p_media_company_id,
    p_role_template_id,
    p_role,
    p_message,
    gen_random_uuid(),
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_token UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_team_member_id UUID;
  v_permissions TEXT[];
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Get permissions from role template if specified
  IF v_invitation.role_template_id IS NOT NULL THEN
    SELECT permissions INTO v_permissions
    FROM role_templates
    WHERE id = v_invitation.role_template_id;
  END IF;
  
  -- Create team member
  INSERT INTO team_members (
    user_id,
    media_company_id,
    email,
    name,
    role,
    status,
    invited_by,
    joined_at
  ) VALUES (
    p_user_id,
    v_invitation.media_company_id,
    v_invitation.email,
    COALESCE(v_invitation.name, split_part(v_invitation.email, '@', 1)),
    v_invitation.role,
    'active',
    v_invitation.invited_by,
    NOW()
  )
  RETURNING id INTO v_team_member_id;
  
  -- Grant permissions if template was used
  IF v_permissions IS NOT NULL THEN
    INSERT INTO team_member_permissions (team_member_id, permission_id, granted_by, granted_at)
    SELECT 
      v_team_member_id,
      p.id,
      v_invitation.invited_by,
      NOW()
    FROM permissions p
    WHERE p.name = ANY(v_permissions);
  END IF;
  
  -- Update invitation status
  UPDATE team_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN v_team_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team member with permissions
CREATE OR REPLACE FUNCTION get_team_member_with_permissions(
  p_media_company_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  team_member_id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  status TEXT,
  company_access JSONB,
  permissions JSONB,
  last_active_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH member_companies AS (
    SELECT 
      tm.id as team_member_id,
      tm.email,
      tm.name,
      tm.role,
      tm.status,
      tm.last_active_at,
      ca.company_id,
      ca.role as company_role,
      ca.permissions as company_permissions,
      ca.is_inherited
    FROM team_members tm
    LEFT JOIN company_access ca ON tm.id = ca.team_member_id
    WHERE tm.media_company_id = p_media_company_id 
      AND (tm.user_id = p_user_id OR tm.email = (SELECT email FROM auth.users WHERE id = p_user_id))
  ),
  member_permissions AS (
    SELECT 
      mc.team_member_id,
      json_agg(
        json_build_object(
          'permission_id', p.id,
          'permission_name', p.name,
          'category', pc.name,
          'granted', COALESCE(tmp.granted, true),
          'granted_at', tmp.granted_at,
          'is_inherited', COALESCE(tmp.is_inherited, false)
        )
      ) FILTER (WHERE p.id IS NOT NULL) as permissions
    FROM member_companies mc
    LEFT JOIN team_member_permissions tmp ON mc.team_member_id = tmp.team_member_id
    LEFT JOIN permissions p ON tmp.permission_id = p.id
    LEFT JOIN permission_categories pc ON p.category_id = pc.id
    GROUP BY mc.team_member_id
  )
  SELECT 
    mc.team_member_id,
    mc.email,
    mc.name,
    mc.role,
    mc.status,
    json_agg(
      json_build_object(
        'company_id', mc.company_id,
        'role', mc.company_role,
        'permissions', mc.company_permissions,
        'is_inherited', mc.is_inherited
      )
    ) FILTER (WHERE mc.company_id IS NOT NULL) as company_access,
    mp.permissions,
    mc.last_active_at
  FROM member_companies mc
  LEFT JOIN member_permissions mp ON mc.team_member_id = mp.team_member_id
  GROUP BY mc.team_member_id, mc.email, mc.name, mc.role, mc.status, mc.last_active_at, mp.permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update team member permissions
CREATE OR REPLACE FUNCTION update_team_member_permissions(
  p_team_member_id UUID,
  p_company_id UUID,
  p_permission_ids UUID[],
  p_granted_by UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Remove existing permissions for this company
  DELETE FROM team_member_permissions
  WHERE team_member_id = p_team_member_id 
    AND company_id = p_company_id;
  
  -- Add new permissions
  INSERT INTO team_member_permissions (team_member_id, permission_id, company_id, granted_by, granted_at)
  SELECT 
    p_team_member_id,
    permission_id,
    p_company_id,
    p_granted_by,
    NOW()
  FROM unnest(p_permission_ids) as permission_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log activity
  INSERT INTO team_activity_log (
    team_member_id,
    performed_by,
    action,
    resource_type,
    new_values,
    company_id
  ) VALUES (
    p_team_member_id,
    p_granted_by,
    'permissions_updated',
    'team_member_permissions',
    json_build_object('permission_ids', p_permission_ids),
    p_company_id
  );
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log team activity
CREATE OR REPLACE FUNCTION log_team_activity(
  p_team_member_id UUID,
  p_performed_by UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO team_activity_log (
    team_member_id,
    performed_by,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    company_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_team_member_id,
    p_performed_by,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_company_id,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team statistics
CREATE OR REPLACE FUNCTION get_team_statistics(
  p_media_company_id UUID
)
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  pending_invites BIGINT,
  role_distribution JSONB,
  activity_last_30_days BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM team_members WHERE media_company_id = p_media_company_id) as total_members,
    (SELECT COUNT(*) FROM team_members WHERE media_company_id = p_media_company_id AND status = 'active') as active_members,
    (SELECT COUNT(*) FROM team_invitations WHERE media_company_id = p_media_company_id AND status = 'pending') as pending_invites,
    (SELECT jsonb_object_agg(role, member_count) 
     FROM (
       SELECT role, COUNT(*) as member_count 
       FROM team_members 
       WHERE media_company_id = p_media_company_id 
       GROUP BY role
     ) role_counts
    ) as role_distribution,
    (SELECT COUNT(*) FROM team_activity_log 
     WHERE company_id = p_media_company_id 
       AND created_at >= NOW() - INTERVAL '30 days'
    ) as activity_last_30_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members access" ON team_members
FOR ALL USING (
  media_company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

CREATE POLICY "Company access access" ON company_access
FOR ALL USING (
  company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

CREATE POLICY "Team member permissions access" ON team_member_permissions
FOR ALL USING (
  team_member_id IN (
    SELECT id FROM team_members 
    WHERE media_company_id = ANY(
      COALESCE(
        NULLIF(current_setting('app.company_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

CREATE POLICY "Team activity log access" ON team_activity_log
FOR SELECT USING (
  company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON permission_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_member_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_invitation_details TO authenticated;

GRANT EXECUTE ON FUNCTION invite_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_member_with_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_member_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION log_team_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_statistics TO authenticated;

-- Insert default permission categories
INSERT INTO permission_categories (id, name, description, icon, sort_order) VALUES
  (gen_random_uuid(), 'Content', 'Content creation and management permissions', 'file-text', 1),
  (gen_random_uuid(), 'Analytics', 'Analytics and reporting permissions', 'bar-chart', 2),
  (gen_random_uuid(), 'Team', 'Team management permissions', 'users', 3),
  (gen_random_uuid(), 'Automation', 'Automation and workflow permissions', 'bot', 4),
  (gen_random_uuid(), 'Settings', 'System and configuration permissions', 'settings', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (category_id, name, description, resource_type, action, is_system) VALUES
  -- Content permissions
  ((SELECT id FROM permission_categories WHERE name = 'Content'), 'content.create', 'Create new content', 'content', 'create', true),
  ((SELECT id FROM permission_categories WHERE name = 'Content'), 'content.edit', 'Edit existing content', 'content', 'edit', true),
  ((SELECT id FROM permission_categories WHERE name = 'Content'), 'content.delete', 'Delete content', 'content', 'delete', true),
  ((SELECT id FROM permission_categories WHERE name = 'Content'), 'content.publish', 'Publish content', 'content', 'publish', true),
  ((SELECT id FROM permission_categories WHERE name = 'Content'), 'content.schedule', 'Schedule content', 'content', 'schedule', true),
  
  -- Analytics permissions
  ((SELECT id FROM permission_categories WHERE name = 'Analytics'), 'analytics.view', 'View analytics and reports', 'analytics', 'view', true),
  ((SELECT id FROM permission_categories WHERE name = 'Analytics'), 'analytics.export', 'Export analytics data', 'analytics', 'export', true),
  
  -- Team permissions
  ((SELECT id FROM permission_categories WHERE name = 'Team'), 'team.invite', 'Invite team members', 'team', 'invite', true),
  ((SELECT id FROM permission_categories WHERE name = 'Team'), 'team.manage', 'Manage team members', 'team', 'manage', true),
  ((SELECT id FROM permission_categories WHERE name = 'Team'), 'team.permissions', 'Manage team permissions', 'team', 'permissions', true),
  
  -- Automation permissions
  ((SELECT id FROM permission_categories WHERE name = 'Automation'), 'automation.create', 'Create automation rules', 'automation', 'create', true),
  ((SELECT id FROM permission_categories WHERE name = 'Automation'), 'automation.manage', 'Manage automation rules', 'automation', 'manage', true),
  ((SELECT id FROM permission_categories WHERE name = 'Automation'), 'automation.execute', 'Execute automation rules', 'automation', 'execute', true),
  
  -- Settings permissions
  ((SELECT id FROM permission_categories WHERE name = 'Settings'), 'settings.view', 'View system settings', 'settings', 'view', true),
  ((SELECT id FROM permission_categories WHERE name = 'Settings'), 'settings.manage', 'Manage system settings', 'settings', 'manage', true)
ON CONFLICT (name) DO NOTHING;
