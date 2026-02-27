-- Add policy allowing superadmin to create invitations for any company
CREATE POLICY "Superadmin can create invitations for any company"
ON public.company_invitations
FOR INSERT
WITH CHECK (is_superadmin());

-- Add policy allowing superadmin to view invitations for any company
CREATE POLICY "Superadmin can view all invitations"
ON public.company_invitations
FOR SELECT
USING (is_superadmin());

-- Add policy allowing superadmin to delete invitations for any company
CREATE POLICY "Superadmin can delete any invitations"
ON public.company_invitations
FOR DELETE
USING (is_superadmin());