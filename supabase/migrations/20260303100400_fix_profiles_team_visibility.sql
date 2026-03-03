-- Fix profiles "team members" RLS policy.
-- The previous policy used a direct JOIN on company_memberships,
-- but the company_memberships SELECT policy (read_own_memberships)
-- only allows users to see their own rows. This caused the JOIN to
-- return empty for co-workers.
-- Solution: SECURITY DEFINER function bypasses company_memberships RLS.

CREATE OR REPLACE FUNCTION public.user_team_member_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT cm2.user_id
  FROM public.company_memberships cm1
  JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
  WHERE cm1.user_id = _user_id
$$;

DROP POLICY IF EXISTS "Users can view team members" ON profiles;
CREATE POLICY "Users can view team members" ON profiles
FOR SELECT USING (
  id IN (SELECT user_team_member_ids(auth.uid()))
);
