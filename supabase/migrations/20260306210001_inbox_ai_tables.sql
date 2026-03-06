-- ============================================================================
-- Phase 1A Migration 2: inbox_ai_results, inbox_ai_feedback, inbox_ai_settings
-- Part of Inbox AI Expansion — Classification Engine
-- ============================================================================

-- Persist all AI results (not ephemeral)
CREATE TABLE IF NOT EXISTS inbox_ai_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  result_type text NOT NULL CHECK (result_type IN ('classification', 'sentiment', 'summary', 'suggestions', 'translation')),
  result_data jsonb NOT NULL DEFAULT '{}',
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_ai_results_conv ON inbox_ai_results(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_ai_results_company_type ON inbox_ai_results(company_id, result_type);
CREATE INDEX IF NOT EXISTS idx_inbox_ai_results_created ON inbox_ai_results(company_id, created_at DESC);

ALTER TABLE inbox_ai_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_ai_results_select" ON inbox_ai_results FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "inbox_ai_results_insert" ON inbox_ai_results FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT ON inbox_ai_results TO authenticated;
GRANT ALL ON inbox_ai_results TO service_role, postgres;

-- Agent corrections for feedback loop
CREATE TABLE IF NOT EXISTS inbox_ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('classification', 'editorial_value', 'sentiment')),
  original_value jsonb,
  corrected_value jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_ai_feedback_company ON inbox_ai_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_inbox_ai_feedback_conv ON inbox_ai_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_ai_feedback_recent ON inbox_ai_feedback(company_id, created_at DESC);

ALTER TABLE inbox_ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_ai_feedback_select" ON inbox_ai_feedback FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "inbox_ai_feedback_insert" ON inbox_ai_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON inbox_ai_feedback TO authenticated;
GRANT ALL ON inbox_ai_feedback TO service_role, postgres;

-- Per-company AI configuration
CREATE TABLE IF NOT EXISTS inbox_ai_settings (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  company_type text NOT NULL DEFAULT 'media' CHECK (company_type IN ('media', 'brand', 'agency')),
  auto_classify boolean NOT NULL DEFAULT false,
  smart_acknowledgment boolean NOT NULL DEFAULT false,
  crisis_detection boolean NOT NULL DEFAULT false,
  crisis_threshold int NOT NULL DEFAULT 5,
  crisis_window_minutes int NOT NULL DEFAULT 30,
  auto_translate boolean NOT NULL DEFAULT false,
  content_recycling boolean NOT NULL DEFAULT false,
  ai_calls_count int NOT NULL DEFAULT 0,
  ai_calls_reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inbox_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_ai_settings_select" ON inbox_ai_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

-- Only owner/admin can modify AI settings
CREATE POLICY "inbox_ai_settings_upsert" ON inbox_ai_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

GRANT SELECT ON inbox_ai_settings TO authenticated;
GRANT ALL ON inbox_ai_settings TO service_role, postgres;

-- RPC: increment AI call counter (called by edge functions after Gemini calls)
CREATE OR REPLACE FUNCTION public.increment_ai_calls(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO inbox_ai_settings (company_id, ai_calls_count, ai_calls_reset_at)
  VALUES (_company_id, 1, now())
  ON CONFLICT (company_id)
  DO UPDATE SET
    ai_calls_count = CASE
      WHEN inbox_ai_settings.ai_calls_reset_at < date_trunc('month', now())
      THEN 1  -- reset counter at start of new month
      ELSE inbox_ai_settings.ai_calls_count + 1
    END,
    ai_calls_reset_at = CASE
      WHEN inbox_ai_settings.ai_calls_reset_at < date_trunc('month', now())
      THEN now()
      ELSE inbox_ai_settings.ai_calls_reset_at
    END,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ai_calls(uuid) TO service_role, postgres;

-- VIEW deferred to Tier 2 migration (R16)
-- inbox_article_intelligence view would do a full table scan with aggregation.
-- At 10K+ conversations with RLS overhead, it will be slow (200ms-5s).
-- When Tier 2 ships, use a materialized view or dedicated summary table.
