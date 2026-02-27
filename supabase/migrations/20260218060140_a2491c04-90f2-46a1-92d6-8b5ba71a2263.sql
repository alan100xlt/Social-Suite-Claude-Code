-- Allow users to insert their own membership when they are the company creator
CREATE POLICY "creator_insert_own_membership"
ON public.company_memberships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = company_memberships.company_id
    AND created_by = auth.uid()
  )
);