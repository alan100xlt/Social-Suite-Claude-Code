
CREATE POLICY "Superadmin can manage all rss feeds"
ON public.rss_feeds
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());
