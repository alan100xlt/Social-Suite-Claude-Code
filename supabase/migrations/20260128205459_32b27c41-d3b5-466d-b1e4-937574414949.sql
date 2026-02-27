-- Fix user_roles RLS policies to allow proper user management

-- Add service role policy for backend operations (invitations, triggers)
CREATE POLICY "Service role can manage all user roles"
ON public.user_roles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow users to insert their own initial role (for signup flow)
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow superadmin to manage all roles
CREATE POLICY "Superadmin can manage all roles"
ON public.user_roles
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());