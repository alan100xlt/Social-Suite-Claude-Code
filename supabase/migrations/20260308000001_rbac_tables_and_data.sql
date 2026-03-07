-- Migration: RBAC Expansion — Part 2 (tables, data, functions)
-- Creates user_permissions and role_default_permissions tables.
-- Migrates existing 'member' role to 'collaborator'.
-- Seeds default permission sets per role.

-- ===== STEP 1: Migrate existing 'member' to 'collaborator' =====
UPDATE public.company_memberships
SET role = 'collaborator'::app_role
WHERE role = 'member'::app_role;

-- ===== STEP 2: Create user_permissions table =====
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, permission_name)
);

CREATE INDEX idx_user_permissions_user_company ON public.user_permissions(user_id, company_id);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins_manage_permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "service_role_permissions"
  ON public.user_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== STEP 3: Create role_default_permissions table =====
CREATE TABLE public.role_default_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_name TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (role, permission_name)
);

ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_defaults"
  ON public.role_default_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_defaults"
  ON public.role_default_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== STEP 4: Seed default permissions =====
INSERT INTO public.role_default_permissions (role, permission_name, granted) VALUES
  -- Owner: everything
  ('owner', 'view_content', true),
  ('owner', 'create_content', true),
  ('owner', 'edit_content', true),
  ('owner', 'delete_content', true),
  ('owner', 'publish', true),
  ('owner', 'schedule', true),
  ('owner', 'manage_feeds', true),
  ('owner', 'manage_campaigns', true),
  ('owner', 'manage_team', true),
  ('owner', 'manage_settings', true),
  ('owner', 'view_analytics', true),
  ('owner', 'manage_breaking_news', true),
  ('owner', 'manage_automations', true),
  ('owner', 'manage_inbox', true),
  ('owner', 'respond_inbox', true),
  -- Admin
  ('admin', 'view_content', true),
  ('admin', 'create_content', true),
  ('admin', 'edit_content', true),
  ('admin', 'delete_content', true),
  ('admin', 'publish', true),
  ('admin', 'schedule', true),
  ('admin', 'manage_feeds', true),
  ('admin', 'manage_campaigns', true),
  ('admin', 'manage_team', true),
  ('admin', 'manage_settings', true),
  ('admin', 'view_analytics', true),
  ('admin', 'manage_breaking_news', true),
  ('admin', 'manage_automations', true),
  ('admin', 'manage_inbox', true),
  ('admin', 'respond_inbox', true),
  -- Manager
  ('manager', 'view_content', true),
  ('manager', 'create_content', true),
  ('manager', 'edit_content', true),
  ('manager', 'delete_content', true),
  ('manager', 'publish', true),
  ('manager', 'schedule', true),
  ('manager', 'manage_feeds', true),
  ('manager', 'manage_campaigns', true),
  ('manager', 'manage_team', false),
  ('manager', 'manage_settings', false),
  ('manager', 'view_analytics', true),
  ('manager', 'manage_breaking_news', true),
  ('manager', 'manage_automations', true),
  ('manager', 'manage_inbox', true),
  ('manager', 'respond_inbox', true),
  -- Collaborator (was 'member')
  ('collaborator', 'view_content', true),
  ('collaborator', 'create_content', true),
  ('collaborator', 'edit_content', true),
  ('collaborator', 'delete_content', false),
  ('collaborator', 'publish', false),
  ('collaborator', 'schedule', true),
  ('collaborator', 'manage_feeds', false),
  ('collaborator', 'manage_campaigns', false),
  ('collaborator', 'manage_team', false),
  ('collaborator', 'manage_settings', false),
  ('collaborator', 'view_analytics', true),
  ('collaborator', 'manage_breaking_news', false),
  ('collaborator', 'manage_automations', false),
  ('collaborator', 'manage_inbox', false),
  ('collaborator', 'respond_inbox', true),
  -- Community Manager
  ('community_manager', 'view_content', true),
  ('community_manager', 'create_content', false),
  ('community_manager', 'edit_content', false),
  ('community_manager', 'delete_content', false),
  ('community_manager', 'publish', false),
  ('community_manager', 'schedule', false),
  ('community_manager', 'manage_feeds', false),
  ('community_manager', 'manage_campaigns', false),
  ('community_manager', 'manage_team', false),
  ('community_manager', 'manage_settings', false),
  ('community_manager', 'view_analytics', true),
  ('community_manager', 'manage_breaking_news', false),
  ('community_manager', 'manage_automations', false),
  ('community_manager', 'manage_inbox', true),
  ('community_manager', 'respond_inbox', true);

-- ===== STEP 5: Permission check helper function =====
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id UUID,
  _company_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.user_permissions
     WHERE user_id = _user_id AND company_id = _company_id AND permission_name = _permission),
    (SELECT rdp.granted FROM public.role_default_permissions rdp
     JOIN public.company_memberships cm ON cm.role = rdp.role
     WHERE cm.user_id = _user_id AND cm.company_id = _company_id AND rdp.permission_name = _permission),
    false
  );
$$;
