
-- Fix: the authenticated_insert policy is RESTRICTIVE but needs to be PERMISSIVE.
-- Drop and recreate as permissive.
DROP POLICY IF EXISTS "authenticated_insert" ON public.companies;

CREATE POLICY "authenticated_insert"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
