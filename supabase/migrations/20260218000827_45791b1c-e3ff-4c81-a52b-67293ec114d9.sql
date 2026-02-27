
-- ===== STEP 1: Create company_memberships table =====

CREATE TABLE public.company_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_company_memberships_user_id ON public.company_memberships(user_id);
CREATE INDEX idx_company_memberships_company_id ON public.company_memberships(company_id);
CREATE INDEX idx_company_memberships_user_company ON public.company_memberships(user_id, company_id);

-- ===== RLS on company_memberships =====

-- Users can read their own memberships
CREATE POLICY "read_own_memberships" ON public.company_memberships
FOR SELECT USING (
  user_id = auth.uid() OR is_superadmin()
);

-- Only service_role can write (managed by edge functions)
CREATE POLICY "service_role_write_memberships" ON public.company_memberships
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_memberships" ON public.company_memberships
FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_role_delete_memberships" ON public.company_memberships
FOR DELETE USING (auth.role() = 'service_role');

-- Users can insert their own membership (needed for company creation flow)
CREATE POLICY "users_insert_own_membership" ON public.company_memberships
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Superadmin can manage all memberships
CREATE POLICY "superadmin_manage_memberships" ON public.company_memberships
FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ===== STEP 1b: New helper functions =====

-- Returns all company IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_memberships
  WHERE user_id = _user_id
$$;

-- Boolean: is user a member of this company?
CREATE OR REPLACE FUNCTION public.user_is_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
  )
$$;

-- Boolean: does user have one of the specified roles in this company?
CREATE OR REPLACE FUNCTION public.user_has_company_role(_user_id uuid, _company_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND role = ANY(_roles)
  )
$$;

-- ===== STEP 2: Migrate existing data =====

INSERT INTO public.company_memberships (user_id, company_id, role)
SELECT p.id, p.company_id, COALESCE(ur.role, 'member'::app_role)
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;
