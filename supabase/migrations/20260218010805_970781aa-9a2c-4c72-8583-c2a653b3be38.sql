
-- Drop the overly permissive public_select_by_token policy on company_invitations
-- and replace with a scoped version that only allows:
-- 1. Members of the company to view its invitations
-- 2. The invited user (by email match) to view their own invitation
-- 3. Superadmins
-- 4. Service role

DROP POLICY IF EXISTS "public_select_by_token" ON public.company_invitations;

CREATE POLICY "scoped_select_invitations"
  ON public.company_invitations
  FOR SELECT
  USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR (auth.role() = 'service_role'::text)
    OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
