-- Fix infinite recursion in media_company_members RLS policies.
-- The SELECT policy on media_company_members referenced media_company_members itself.
-- Solution: use SECURITY DEFINER functions that bypass RLS for the inner check.

CREATE OR REPLACE FUNCTION public.user_media_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT media_company_id FROM public.media_company_members
  WHERE user_id = _user_id AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.user_is_media_company_admin(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT media_company_id FROM public.media_company_members
  WHERE user_id = _user_id AND role = 'admin' AND is_active = true
$$;

-- Recreate all media company policies using the helper functions

DROP POLICY IF EXISTS "Media company members can view" ON media_companies;
DROP POLICY IF EXISTS "Media company admins can manage" ON media_companies;
CREATE POLICY "Media company members can view" ON media_companies
FOR SELECT USING (id IN (SELECT user_media_company_ids(auth.uid())) OR is_superadmin());
CREATE POLICY "Media company admins can manage" ON media_companies
FOR ALL USING (id IN (SELECT user_is_media_company_admin(auth.uid())) OR is_superadmin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Media company members can view children" ON media_company_children;
DROP POLICY IF EXISTS "Media company admins can manage children" ON media_company_children;
CREATE POLICY "Media company members can view children" ON media_company_children
FOR SELECT USING (parent_company_id IN (SELECT user_media_company_ids(auth.uid())) OR is_superadmin());
CREATE POLICY "Media company admins can manage children" ON media_company_children
FOR ALL USING (parent_company_id IN (SELECT user_is_media_company_admin(auth.uid())) OR is_superadmin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Media company members can view each other" ON media_company_members;
DROP POLICY IF EXISTS "Media company admins can manage members" ON media_company_members;
CREATE POLICY "Media company members can view each other" ON media_company_members
FOR SELECT USING (media_company_id IN (SELECT user_media_company_ids(auth.uid())) OR is_superadmin());
CREATE POLICY "Media company admins can manage members" ON media_company_members
FOR ALL USING (media_company_id IN (SELECT user_is_media_company_admin(auth.uid())) OR is_superadmin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Media company members can view analytics" ON media_company_analytics;
CREATE POLICY "Media company members can view analytics" ON media_company_analytics
FOR SELECT USING (media_company_id IN (SELECT user_media_company_ids(auth.uid())) OR is_superadmin());
