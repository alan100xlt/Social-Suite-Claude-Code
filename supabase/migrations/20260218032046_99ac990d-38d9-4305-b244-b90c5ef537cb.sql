
-- 1. Create a security definer function to safely get the current user's email
CREATE OR REPLACE FUNCTION public.auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- 2. Fix company_invitations: scoped_select_invitations
DROP POLICY IF EXISTS "scoped_select_invitations" ON public.company_invitations;
CREATE POLICY "scoped_select_invitations"
ON public.company_invitations
FOR SELECT
USING (
  user_is_member(auth.uid(), company_id)
  OR is_superadmin()
  OR (auth.role() = 'service_role'::text)
  OR (email = public.auth_email())
);

-- 3. Fix company_invitations: tenant_iso_update
DROP POLICY IF EXISTS "tenant_iso_update" ON public.company_invitations;
CREATE POLICY "tenant_iso_update"
ON public.company_invitations
FOR UPDATE
USING (
  user_is_member(auth.uid(), company_id)
  OR is_superadmin()
  OR (auth.role() = 'service_role'::text)
  OR (email = public.auth_email())
);

-- 4. Fix company_invitations: tenant_iso_insert
DROP POLICY IF EXISTS "tenant_iso_insert" ON public.company_invitations;
CREATE POLICY "tenant_iso_insert"
ON public.company_invitations
FOR INSERT
WITH CHECK (
  user_is_member(auth.uid(), company_id)
  OR is_superadmin()
  OR (auth.role() = 'service_role'::text)
);

-- 5. Fix company_memberships: users_insert_own_membership (also referenced auth.users)
DROP POLICY IF EXISTS "users_insert_own_membership" ON public.company_memberships;
CREATE POLICY "users_insert_own_membership"
ON public.company_memberships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.company_invitations ci
    WHERE ci.company_id = company_memberships.company_id
      AND ci.email = public.auth_email()
      AND ci.accepted_at IS NULL
      AND ci.expires_at > now()
  )
);
