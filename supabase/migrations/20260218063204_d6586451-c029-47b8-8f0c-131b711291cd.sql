
-- Fix creator_insert_own_membership: must be PERMISSIVE for company creators
DROP POLICY IF EXISTS "creator_insert_own_membership" ON public.company_memberships;

CREATE POLICY "creator_insert_own_membership"
  ON public.company_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_memberships.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- Also fix users_insert_own_membership for invitation acceptance
DROP POLICY IF EXISTS "users_insert_own_membership" ON public.company_memberships;

CREATE POLICY "users_insert_own_membership"
  ON public.company_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM company_invitations ci
      WHERE ci.company_id = company_memberships.company_id
      AND ci.email = auth_email()
      AND ci.accepted_at IS NULL
      AND ci.expires_at > now()
    )
  );
