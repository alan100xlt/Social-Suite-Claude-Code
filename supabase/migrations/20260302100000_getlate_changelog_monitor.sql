-- Create table to track processed GetLate changelog entries
CREATE TABLE IF NOT EXISTS public.getlate_changelog_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_entry_id TEXT,           -- e.g. "2026-02-15" or slug from changelog
  entries_found INT NOT NULL DEFAULT 0,
  new_entries JSONB,                 -- array of { id, title, date, content }
  ai_analysis JSONB,                 -- { impact_score, impact_summary, code_changes, business_value }
  slack_message_ts TEXT,             -- Slack message timestamp (for updating the message)
  linear_issue_url TEXT,             -- Set after user clicks "Create Linear Issue"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'no_new', 'analyzed', 'error')),
  error_message TEXT
);

-- Only superadmin / service role should access this
ALTER TABLE public.getlate_changelog_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.getlate_changelog_checks
  USING (false);  -- blocks all anon/user access; service role bypasses RLS

-- Index for quickly finding the latest check
CREATE INDEX IF NOT EXISTS idx_changelog_checks_checked_at
  ON public.getlate_changelog_checks (checked_at DESC);
