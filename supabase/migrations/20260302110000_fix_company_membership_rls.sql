-- Fix circular RLS dependency on company_memberships INSERT.
-- The original creator_insert_own_membership policy checks companies.created_by
-- via a subquery, but that subquery is itself blocked by RLS for users with
-- no memberships yet (session_accessible_companies() returns empty).
-- Replace with a simple user_id check — company ownership is already enforced
-- by the companies INSERT policy (created_by = auth.uid()).

DROP POLICY IF EXISTS "creator_insert_own_membership" ON public.company_memberships;

CREATE POLICY "creator_insert_own_membership"
ON public.company_memberships
FOR INSERT
WITH CHECK (user_id = auth.uid());
