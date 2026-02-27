-- Create a function to check if the current user is a superadmin
-- This allows RLS policies to grant superadmin access to all data
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email = 'superadmin@getlate.dev' 
     FROM auth.users 
     WHERE id = auth.uid()),
    false
  )
$$;

-- Add policy for superadmin to view ALL companies
CREATE POLICY "Superadmin can view all companies"
ON public.companies
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to update ALL companies
CREATE POLICY "Superadmin can update all companies"
ON public.companies
FOR UPDATE
USING (is_superadmin());

-- Add policy for superadmin to view ALL profiles
CREATE POLICY "Superadmin can view all profiles"
ON public.profiles
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to view ALL user_roles
CREATE POLICY "Superadmin can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to view ALL post analytics
CREATE POLICY "Superadmin can view all post analytics"
ON public.post_analytics_snapshots
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to view ALL account analytics
CREATE POLICY "Superadmin can view all account analytics"
ON public.account_analytics_snapshots
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to view ALL RSS feeds
CREATE POLICY "Superadmin can view all rss feeds"
ON public.rss_feeds
FOR SELECT
USING (is_superadmin());

-- Add policy for superadmin to view ALL RSS feed items
CREATE POLICY "Superadmin can view all rss feed items"
ON public.rss_feed_items
FOR SELECT
USING (is_superadmin());