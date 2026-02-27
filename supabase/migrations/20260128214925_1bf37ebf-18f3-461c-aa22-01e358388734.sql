-- Allow users to update invitation accepted_at when accepting
CREATE POLICY "Users can accept invitations for their email"
ON public.company_invitations
FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));