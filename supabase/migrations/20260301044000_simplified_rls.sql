-- Simplified RLS System for Enterprise Scale
-- Replaces complex hierarchical RLS with session-based approach

-- Drop existing complex RLS policies (if they exist)
DROP POLICY IF EXISTS "Company members can view voice settings" ON company_voice_settings;
DROP POLICY IF EXISTS "Owners and admins can manage voice settings" ON company_voice_settings;
DROP POLICY IF EXISTS "Company members can view email settings" ON company_email_settings;
DROP POLICY IF EXISTS "Owners and admins can manage email settings" ON company_email_settings;
DROP POLICY IF EXISTS "Company members can view automation logs" ON automation_logs;
DROP POLICY IF EXISTS "Service role can manage automation logs" ON automation_logs;
DROP POLICY IF EXISTS "Company members can view automation rules" ON automation_rules;
DROP POLICY IF EXISTS "Owners and admins can manage automation rules" ON automation_rules;
DROP POLICY IF EXISTS "Company members can view their api logs" ON api_call_logs;
DROP POLICY IF EXISTS "Service role can manage api logs" ON api_call_logs;
DROP POLICY IF EXISTS "Company members can view drafts" ON post_drafts;
DROP POLICY IF EXISTS "Company members can create drafts" ON post_drafts;
DROP POLICY IF EXISTS "Company members can update drafts" ON post_drafts;
DROP POLICY IF EXISTS "Creator or admins/owners can delete drafts" ON post_drafts;
DROP POLICY IF EXISTS "Company members can view approvals" ON post_approvals;
DROP POLICY IF EXISTS "Owners and admins can create approvals" ON post_approvals;
DROP POLICY IF EXISTS "Company members can view their analytics" ON post_analytics_snapshots;
DROP POLICY IF EXISTS "Service role can manage all analytics" ON post_analytics_snapshots;
DROP POLICY IF EXISTS "Company members can view their account analytics" ON account_analytics_snapshots;
DROP POLICY IF EXISTS "Service role can manage all analytics" ON account_analytics_snapshots;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Users can update their company" ON companies;
DROP POLICY IF EXISTS "Company members can view invitations" ON company_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON company_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON company_invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON company_invitations;
DROP POLICY IF EXISTS "Company members can view feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Owners and admins can manage feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Company members can view feed items" ON rss_feed_items;

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_email_settings ENABLE ROW LEVEL SECURITY;

-- Simplified RLS Policies using session variables

-- Companies table
CREATE POLICY "Users can view accessible companies" ON companies
FOR SELECT USING (
    id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role full access to companies" ON companies
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Profiles table
CREATE POLICY "Users can view profiles in accessible companies" ON profiles
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role full access to profiles" ON profiles
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Company invitations table
CREATE POLICY "Users can view invitations in accessible companies" ON company_invitations
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can create invitations in accessible companies" ON company_invitations
FOR INSERT WITH CHECK (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can update invitations in accessible companies" ON company_invitations
FOR UPDATE USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can delete invitations in accessible companies" ON company_invitations
FOR DELETE USING (
    company_id = ANY(session_accessible_companies())
);

-- RSS feeds table
CREATE POLICY "Users can view feeds in accessible companies" ON rss_feeds
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can manage feeds in accessible companies" ON rss_feeds
FOR ALL USING (
    company_id = ANY(session_accessible_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- RSS feed items table
CREATE POLICY "Users can view feed items for accessible companies" ON rss_feed_items
FOR SELECT USING (
    feed_id IN (
        SELECT id FROM rss_feeds 
        WHERE company_id = ANY(session_accessible_companies())
    )
);

-- Posts table
CREATE POLICY "Users can view posts in accessible companies" ON posts
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can create posts in accessible companies" ON posts
FOR INSERT WITH CHECK (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can update posts in accessible companies" ON posts
FOR UPDATE USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can delete posts in accessible companies" ON posts
FOR DELETE USING (
    company_id = ANY(session_accessible_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Post drafts table
CREATE POLICY "Users can view drafts in accessible companies" ON post_drafts
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can create drafts in accessible companies" ON post_drafts
FOR INSERT WITH CHECK (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can update drafts in accessible companies" ON post_drafts
FOR UPDATE USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can delete drafts in accessible companies" ON post_drafts
FOR DELETE USING (
    company_id = ANY(session_accessible_companies())
    AND (
        created_by = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.max_access_level', true)::INTEGER >= 3
    )
);

-- Post approvals table
CREATE POLICY "Users can view approvals in accessible companies" ON post_approvals
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can create approvals in accessible companies" ON post_approvals
FOR INSERT WITH CHECK (
    company_id = ANY(session_accessible_companies())
    AND created_by = current_setting('app.current_user_id', true)::UUID
);

-- Post analytics snapshots table
CREATE POLICY "Users can view analytics in accessible companies" ON post_analytics_snapshots
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role full access to analytics" ON post_analytics_snapshots
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Account analytics snapshots table
CREATE POLICY "Users can view account analytics in accessible companies" ON account_analytics_snapshots
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role full access to account analytics" ON account_analytics_snapshots
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Automation rules table
CREATE POLICY "Users can view automation rules in accessible companies" ON automation_rules
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can manage automation rules in accessible companies" ON automation_rules
FOR ALL USING (
    company_id = ANY(session_accessible_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Automation logs table
CREATE POLICY "Users can view automation logs in accessible companies" ON automation_logs
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role can manage automation logs" ON automation_logs
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- API call logs table
CREATE POLICY "Users can view API logs in accessible companies" ON api_call_logs
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Service role can manage API logs" ON api_call_logs
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Company voice settings table
CREATE POLICY "Users can view voice settings in accessible companies" ON company_voice_settings
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can manage voice settings in accessible companies" ON company_voice_settings
FOR ALL USING (
    company_id = ANY(session_accessible_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Company email settings table
CREATE POLICY "Users can view email settings in accessible companies" ON company_email_settings
FOR SELECT USING (
    company_id = ANY(session_accessible_companies())
);

CREATE POLICY "Users can manage email settings in accessible companies" ON company_email_settings
FOR ALL USING (
    company_id = ANY(session_accessible_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

-- Media company tables (if they exist)
DO $$
BEGIN
    -- Check if media_companies table exists and enable RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_companies') THEN
        ALTER TABLE media_companies ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Media company admins full access" ON media_companies;
        DROP POLICY IF EXISTS "Media company children view" ON media_companies;
        DROP POLICY IF EXISTS "Media company children edit" ON media_companies;
        
        CREATE POLICY "Users can view accessible media companies" ON media_companies
        FOR SELECT USING (
            id = ANY(session_media_companies())
        );
        
        CREATE POLICY "Users can manage media companies they admin" ON media_companies
        FOR ALL USING (
            id = ANY(session_media_companies())
            AND current_setting('app.max_access_level', true)::INTEGER >= 5
        );
    END IF;
    
    -- Check if media_company_children table exists and enable RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_company_children') THEN
        ALTER TABLE media_company_children ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Media company children view" ON media_company_children;
        DROP POLICY IF EXISTS "Media company children edit" ON media_company_children;
        
        CREATE POLICY "Users can view media company children they can access" ON media_company_children
        FOR SELECT USING (
            parent_company_id = ANY(session_media_companies())
        );
        
        CREATE POLICY "Users can manage media company children they admin" ON media_company_children
        FOR ALL USING (
            parent_company_id = ANY(session_media_companies())
            AND current_setting('app.max_access_level', true)::INTEGER >= 5
        );
    END IF;
    
    -- Check if media_company_members table exists and enable RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_company_members') THEN
        ALTER TABLE media_company_members ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Media company members view" ON media_company_members;
        DROP POLICY IF EXISTS "Media company members edit" ON media_company_members;
        
        CREATE POLICY "Users can view media company members they can access" ON media_company_members
        FOR SELECT USING (
            media_company_id = ANY(session_media_companies())
        );
        
        CREATE POLICY "Users can manage media company members they admin" ON media_company_members
        FOR ALL USING (
            media_company_id = ANY(session_media_companies())
            AND current_setting('app.max_access_level', true)::INTEGER >= 5
        );
    END IF;
    
    -- Check if media_company_analytics table exists and enable RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_company_analytics') THEN
        ALTER TABLE media_company_analytics ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Media company analytics view" ON media_company_analytics;
        
        CREATE POLICY "Users can view media company analytics they can access" ON media_company_analytics
        FOR SELECT USING (
            media_company_id = ANY(session_media_companies())
        );
    END IF;
END $$;

-- Function to set current user context (called by application)
CREATE OR REPLACE FUNCTION set_user_context(
    user_id UUID,
    user_role TEXT DEFAULT 'user'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, true);
    PERFORM set_config('app.current_user_role', user_role, true);
END;
$$;

-- Function to get current user context
CREATE OR REPLACE FUNCTION get_user_context()
RETURNS TABLE (
    user_id UUID,
    user_role TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    current_setting('app.current_user_id', true)::UUID as user_id,
    current_setting('app.current_user_role', true) as user_role;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION set_user_context(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_context() TO authenticated;

-- Comments for documentation
COMMENT ON POLICY "Users can view accessible companies" ON companies IS 'Simplified RLS using session variables';
COMMENT ON POLICY "Users can view profiles in accessible companies" ON profiles IS 'Simplified RLS using session variables';
COMMENT ON POLICY "Users can view posts in accessible companies" ON posts IS 'Simplified RLS using session variables';
COMMENT ON FUNCTION set_user_context(UUID, TEXT) IS 'Set current user context for RLS';
COMMENT ON FUNCTION get_user_context() IS 'Get current user context';

-- Performance optimization: Create indexes for common RLS queries
CREATE INDEX IF NOT EXISTS idx_posts_company_session ON posts(company_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_company_session ON post_drafts(company_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_company_session ON post_analytics_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_company_session ON automation_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_session ON profiles(company_id);
