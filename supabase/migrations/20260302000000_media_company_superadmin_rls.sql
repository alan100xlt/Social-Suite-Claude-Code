-- Superadmin bypass RLS policies for media company tables
-- The is_superadmin() function (defined in migration 20260124071653) checks
-- if the current user is superadmin@getlate.dev.
-- The media company hierarchy tables (20260301042000) only grant access to
-- media company members — this migration adds full access for superadmins.

-- media_companies: superadmin full access
CREATE POLICY "Superadmin full access to media companies"
ON public.media_companies
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- media_company_children: superadmin full access
CREATE POLICY "Superadmin full access to media company children"
ON public.media_company_children
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- media_company_members: superadmin full access
CREATE POLICY "Superadmin full access to media company members"
ON public.media_company_members
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- media_company_analytics: superadmin full access
CREATE POLICY "Superadmin full access to media company analytics"
ON public.media_company_analytics
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());
