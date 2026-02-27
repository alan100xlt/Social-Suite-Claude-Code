
-- 1. Fix company_memberships: restrict self-insert to require a valid pending invitation
DROP POLICY IF EXISTS "users_insert_own_membership" ON public.company_memberships;

CREATE POLICY "users_insert_own_membership"
ON public.company_memberships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.company_invitations ci
    WHERE ci.company_id = company_memberships.company_id
      AND ci.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND ci.accepted_at IS NULL
      AND ci.expires_at > now()
  )
);

-- 2. Fix profiles: replace legacy company_id-based SELECT with company_memberships lookup
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

CREATE POLICY "Users can view profiles in their company"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = profiles.id
  )
);
