
-- ============================================================
-- Step 5: Replace all RLS policies with thin tenant-isolation
-- ============================================================
-- Pattern: user_is_member(auth.uid(), company_id) OR is_superadmin() OR service_role
-- This removes all granular RBAC from RLS. RBAC moves to edge functions.

-- ────────────────────────────────────────────────────────────
-- 1. COMPANIES
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Superadmin can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Owners and admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Superadmin can update all companies" ON public.companies;

-- Any member can SELECT their companies
CREATE POLICY "tenant_iso_select" ON public.companies
  FOR SELECT USING (
    user_is_member(auth.uid(), id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- Authenticated users can create companies (they become owner via edge function)
CREATE POLICY "authenticated_insert" ON public.companies
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Members can update their company (RBAC checked in edge functions)
CREATE POLICY "tenant_iso_update" ON public.companies
  FOR UPDATE USING (
    user_is_member(auth.uid(), id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 2. RSS_FEEDS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view feeds" ON public.rss_feeds;
DROP POLICY IF EXISTS "Owners and admins can manage feeds" ON public.rss_feeds;
DROP POLICY IF EXISTS "Superadmin can manage all rss feeds" ON public.rss_feeds;
DROP POLICY IF EXISTS "Superadmin can view all rss feeds" ON public.rss_feeds;

CREATE POLICY "tenant_isolation" ON public.rss_feeds
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 3. RSS_FEED_ITEMS (joined via rss_feeds)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view feed items" ON public.rss_feed_items;
DROP POLICY IF EXISTS "Service role can manage feed items" ON public.rss_feed_items;
DROP POLICY IF EXISTS "Superadmin can view all rss feed items" ON public.rss_feed_items;

CREATE POLICY "tenant_isolation" ON public.rss_feed_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rss_feeds f
      WHERE f.id = rss_feed_items.feed_id
      AND user_is_member(auth.uid(), f.company_id)
    )
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rss_feeds f
      WHERE f.id = rss_feed_items.feed_id
      AND user_is_member(auth.uid(), f.company_id)
    )
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 4. AUTOMATION_RULES
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view automation rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Owners and admins can manage automation rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Superadmin can manage all automation rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Superadmin can view all automation rules" ON public.automation_rules;

CREATE POLICY "tenant_isolation" ON public.automation_rules
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 5. AUTOMATION_LOGS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view automation logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Service role can manage automation logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Superadmin can view all automation logs" ON public.automation_logs;

CREATE POLICY "tenant_isolation" ON public.automation_logs
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 6. COMPANY_VOICE_SETTINGS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view voice settings" ON public.company_voice_settings;
DROP POLICY IF EXISTS "Owners and admins can manage voice settings" ON public.company_voice_settings;
DROP POLICY IF EXISTS "Service role can read voice settings" ON public.company_voice_settings;
DROP POLICY IF EXISTS "Superadmin can manage all voice settings" ON public.company_voice_settings;

CREATE POLICY "tenant_isolation" ON public.company_voice_settings
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 7. COMPANY_EMAIL_SETTINGS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view email settings" ON public.company_email_settings;
DROP POLICY IF EXISTS "Owners and admins can manage email settings" ON public.company_email_settings;
DROP POLICY IF EXISTS "Service role can read email settings" ON public.company_email_settings;
DROP POLICY IF EXISTS "Superadmin can manage all email settings" ON public.company_email_settings;

CREATE POLICY "tenant_isolation" ON public.company_email_settings
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 8. POST_DRAFTS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view drafts" ON public.post_drafts;
DROP POLICY IF EXISTS "Company members can create drafts" ON public.post_drafts;
DROP POLICY IF EXISTS "Company members can update drafts" ON public.post_drafts;
DROP POLICY IF EXISTS "Creator or admins can delete drafts" ON public.post_drafts;
DROP POLICY IF EXISTS "Superadmin can manage all drafts" ON public.post_drafts;

CREATE POLICY "tenant_isolation" ON public.post_drafts
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 9. POST_APPROVALS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view approval by token" ON public.post_approvals;
DROP POLICY IF EXISTS "Company members can view approvals" ON public.post_approvals;
DROP POLICY IF EXISTS "Owners and admins can create approvals" ON public.post_approvals;
DROP POLICY IF EXISTS "Service role can manage approvals" ON public.post_approvals;

-- post_approvals needs public SELECT for token-based approval flow
CREATE POLICY "public_select_by_token" ON public.post_approvals
  FOR SELECT USING (true);

CREATE POLICY "tenant_iso_write" ON public.post_approvals
  FOR INSERT WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_iso_update" ON public.post_approvals
  FOR UPDATE USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_iso_delete" ON public.post_approvals
  FOR DELETE USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 10. POST_ANALYTICS_SNAPSHOTS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view their analytics" ON public.post_analytics_snapshots;
DROP POLICY IF EXISTS "Service role can manage all analytics" ON public.post_analytics_snapshots;
DROP POLICY IF EXISTS "Superadmin can view all post analytics" ON public.post_analytics_snapshots;

CREATE POLICY "tenant_isolation" ON public.post_analytics_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 11. ACCOUNT_ANALYTICS_SNAPSHOTS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view their account analytics" ON public.account_analytics_snapshots;
DROP POLICY IF EXISTS "Service role can manage all account analytics" ON public.account_analytics_snapshots;
DROP POLICY IF EXISTS "Superadmin can view all account analytics" ON public.account_analytics_snapshots;

CREATE POLICY "tenant_isolation" ON public.account_analytics_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 12. API_CALL_LOGS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view their api logs" ON public.api_call_logs;
DROP POLICY IF EXISTS "Service role can manage api logs" ON public.api_call_logs;
DROP POLICY IF EXISTS "Superadmin can view all api logs" ON public.api_call_logs;

CREATE POLICY "tenant_isolation" ON public.api_call_logs
  FOR ALL USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

-- ────────────────────────────────────────────────────────────
-- 13. COMPANY_INVITATIONS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can delete invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can view invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Superadmin can create invitations for any company" ON public.company_invitations;
DROP POLICY IF EXISTS "Superadmin can delete any invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Superadmin can view all invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Users can accept invitations for their email" ON public.company_invitations;

-- Public SELECT for token-based invitation acceptance
CREATE POLICY "public_select_by_token" ON public.company_invitations
  FOR SELECT USING (true);

CREATE POLICY "tenant_iso_insert" ON public.company_invitations
  FOR INSERT WITH CHECK (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_iso_update" ON public.company_invitations
  FOR UPDATE USING (
    -- Members can update (accept) + service role for backend ops
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
    -- Also allow the invited user to accept (they may not be a member yet)
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  );

CREATE POLICY "tenant_iso_delete" ON public.company_invitations
  FOR DELETE USING (
    user_is_member(auth.uid(), company_id)
    OR is_superadmin()
    OR auth.role() = 'service_role'
  );
