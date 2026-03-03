-- ============================================================================
-- Platform Restoration: RLS Cleanup, Enterprise Infra Drop, Function Fixes
-- ============================================================================
-- This migration:
--   1. Removes all session-based RLS policies (they reference functions that
--      always return empty arrays since the frontend never calls set_session_context)
--   2. Drops redundant enterprise infrastructure (materialized views, session
--      functions, hierarchy table)
--   3. Extends user_is_member() to support media company hierarchy access
--   4. Adds replacement auth.uid()-based RLS policies for media company tables
-- ============================================================================

-- ============================================================================
-- TASK 1: Remove Session-Based RLS Policies
-- ============================================================================

-- account_analytics_snapshots
DROP POLICY IF EXISTS "Service role full access to account analytics" ON account_analytics_snapshots;
DROP POLICY IF EXISTS "Users can view account analytics in accessible companies" ON account_analytics_snapshots;

-- api_call_logs
DROP POLICY IF EXISTS "Service role can manage API logs" ON api_call_logs;
DROP POLICY IF EXISTS "Users can view API logs in accessible companies" ON api_call_logs;

-- automation_logs
DROP POLICY IF EXISTS "Service role can manage automation logs" ON automation_logs;
DROP POLICY IF EXISTS "Users can view automation logs in accessible companies" ON automation_logs;

-- automation_rules
DROP POLICY IF EXISTS "Users can manage automation rules in accessible companies" ON automation_rules;
DROP POLICY IF EXISTS "Users can view automation rules in accessible companies" ON automation_rules;

-- companies
DROP POLICY IF EXISTS "Service role full access to companies" ON companies;
DROP POLICY IF EXISTS "Users can view accessible companies" ON companies;

-- company_email_settings
DROP POLICY IF EXISTS "Users can manage email settings in accessible companies" ON company_email_settings;
DROP POLICY IF EXISTS "Users can view email settings in accessible companies" ON company_email_settings;

-- company_invitations
DROP POLICY IF EXISTS "Users can create invitations in accessible companies" ON company_invitations;
DROP POLICY IF EXISTS "Users can delete invitations in accessible companies" ON company_invitations;
DROP POLICY IF EXISTS "Users can update invitations in accessible companies" ON company_invitations;
DROP POLICY IF EXISTS "Users can view invitations in accessible companies" ON company_invitations;

-- company_voice_settings
DROP POLICY IF EXISTS "Users can manage voice settings in accessible companies" ON company_voice_settings;
DROP POLICY IF EXISTS "Users can view voice settings in accessible companies" ON company_voice_settings;

-- post_analytics_snapshots
DROP POLICY IF EXISTS "Service role full access to analytics" ON post_analytics_snapshots;
DROP POLICY IF EXISTS "Users can view analytics in accessible companies" ON post_analytics_snapshots;

-- post_approvals
DROP POLICY IF EXISTS "Users can create approvals in accessible companies" ON post_approvals;
DROP POLICY IF EXISTS "Users can view approvals in accessible companies" ON post_approvals;

-- post_drafts
DROP POLICY IF EXISTS "Users can create drafts in accessible companies" ON post_drafts;
DROP POLICY IF EXISTS "Users can delete drafts in accessible companies" ON post_drafts;
DROP POLICY IF EXISTS "Users can update drafts in accessible companies" ON post_drafts;
DROP POLICY IF EXISTS "Users can view drafts in accessible companies" ON post_drafts;

-- profiles
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in accessible companies" ON profiles;

-- rss_feeds
DROP POLICY IF EXISTS "Users can manage feeds in accessible companies" ON rss_feeds;
DROP POLICY IF EXISTS "Users can view feeds in accessible companies" ON rss_feeds;

-- rss_feed_items
DROP POLICY IF EXISTS "Users can view feed items for accessible companies" ON rss_feed_items;

-- media_companies
DROP POLICY IF EXISTS "Users can manage media companies they admin" ON media_companies;
DROP POLICY IF EXISTS "Users can view accessible media companies" ON media_companies;

-- media_company_children
DROP POLICY IF EXISTS "Users can manage media company children they admin" ON media_company_children;
DROP POLICY IF EXISTS "Users can view media company children they can access" ON media_company_children;

-- media_company_members
DROP POLICY IF EXISTS "Users can manage media company members they admin" ON media_company_members;
DROP POLICY IF EXISTS "Users can view media company members they can access" ON media_company_members;

-- media_company_analytics
DROP POLICY IF EXISTS "Users can view media company analytics they can access" ON media_company_analytics;

-- ============================================================================
-- TASK 2: Drop Redundant Enterprise Infrastructure
-- ============================================================================

-- Drop triggers first (wrapped in DO block since table may not exist)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_refresh_media_company_hierarchy ON media_company_hierarchy;
  DROP TRIGGER IF EXISTS set_media_company_hierarchy_timestamp ON media_company_hierarchy;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS user_security_hierarchy;
DROP MATERIALIZED VIEW IF EXISTS user_permissions;

-- Drop the redundant hierarchy table
DROP TABLE IF EXISTS media_company_hierarchy;

-- Drop session functions
DROP FUNCTION IF EXISTS set_session_context(UUID[], UUID[], INTEGER);
DROP FUNCTION IF EXISTS get_session_context();
DROP FUNCTION IF EXISTS clear_session_context();
DROP FUNCTION IF EXISTS session_has_company_access(UUID);
DROP FUNCTION IF EXISTS session_accessible_companies();
DROP FUNCTION IF EXISTS session_media_companies();
DROP FUNCTION IF EXISTS session_is_media_company_admin(UUID);
DROP FUNCTION IF EXISTS set_user_context(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_context();

-- Drop enterprise helper functions that depended on removed infrastructure
DROP FUNCTION IF EXISTS refresh_user_permissions();
DROP FUNCTION IF EXISTS refresh_user_permissions_trigger();
DROP FUNCTION IF EXISTS batch_refresh_permissions(UUID[]);
DROP FUNCTION IF EXISTS get_security_statistics();
DROP FUNCTION IF EXISTS cleanup_security_data(INTEGER);
DROP FUNCTION IF EXISTS get_user_security_hierarchy(UUID);
DROP FUNCTION IF EXISTS has_company_access(UUID, UUID);
DROP FUNCTION IF EXISTS add_media_company_access(UUID, UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS remove_media_company_access(UUID, UUID);
DROP FUNCTION IF EXISTS update_last_accessed(UUID);

-- ============================================================================
-- TASK 3: Extend user_is_member() for Media Company Support
-- ============================================================================

-- Extend user_is_member to also check media company hierarchy
CREATE OR REPLACE FUNCTION public.user_is_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id
    UNION ALL
    SELECT 1 FROM public.media_company_members mcm
    JOIN public.media_company_children mcc ON mcc.parent_company_id = mcm.media_company_id
    WHERE mcm.user_id = _user_id AND mcc.child_company_id = _company_id AND mcm.is_active = true
  )
$$;

-- Fix user_belongs_to_company to delegate to user_is_member
-- (analytics RPCs use this function, it was checking profiles.company_id which is always NULL)
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.user_is_member(_user_id, _company_id)
$$;

-- ============================================================================
-- TASK 4: Add Missing RLS Policies
-- ============================================================================

-- Profiles: Allow viewing team members in shared companies
CREATE POLICY "Users can view team members" ON profiles
FOR SELECT USING (
  id IN (
    SELECT cm2.user_id FROM company_memberships cm1
    JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
  )
);

-- Media companies: auth.uid()-based policies (replacing session-based)
CREATE POLICY "Media company members can view" ON media_companies
FOR SELECT USING (
  id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND is_active = true)
  OR is_superadmin()
);

CREATE POLICY "Media company admins can manage" ON media_companies
FOR ALL USING (
  id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true)
  OR is_superadmin()
  OR auth.role() = 'service_role'
);

-- Media company children
CREATE POLICY "Media company members can view children" ON media_company_children
FOR SELECT USING (
  parent_company_id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND is_active = true)
  OR is_superadmin()
);

CREATE POLICY "Media company admins can manage children" ON media_company_children
FOR ALL USING (
  parent_company_id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true)
  OR is_superadmin()
  OR auth.role() = 'service_role'
);

-- Media company members
CREATE POLICY "Media company members can view each other" ON media_company_members
FOR SELECT USING (
  media_company_id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND is_active = true)
  OR is_superadmin()
);

CREATE POLICY "Media company admins can manage members" ON media_company_members
FOR ALL USING (
  media_company_id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true)
  OR is_superadmin()
  OR auth.role() = 'service_role'
);

-- Media company analytics
CREATE POLICY "Media company members can view analytics" ON media_company_analytics
FOR SELECT USING (
  media_company_id IN (SELECT media_company_id FROM media_company_members WHERE user_id = auth.uid() AND is_active = true)
  OR is_superadmin()
);

CREATE POLICY "Service role can manage media analytics" ON media_company_analytics
FOR ALL USING (auth.role() = 'service_role');
