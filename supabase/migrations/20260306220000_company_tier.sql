-- ============================================================================
-- Phase 0.5B: Feature gating foundation (R13)
-- Adds company_tier column for future monetization infrastructure.
-- No gating enforced yet — all features available to all tiers.
-- ============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS company_tier text NOT NULL DEFAULT 'free'
  CHECK (company_tier IN ('free', 'pro', 'enterprise'));

-- Allow authenticated users to read their own company tier via RLS
-- (companies table already has RLS policies for company_memberships)
