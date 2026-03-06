-- ============================================================================
-- Phase 1A Migration 1: inbox_conversations AI columns + indexes
-- Part of Inbox AI Expansion — Classification Engine
-- ============================================================================

-- Add AI classification columns to inbox_conversations
ALTER TABLE inbox_conversations
  ADD COLUMN IF NOT EXISTS message_type text,
  ADD COLUMN IF NOT EXISTS message_subtype text,
  ADD COLUMN IF NOT EXISTS editorial_value smallint CHECK (editorial_value BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS ai_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS correction_status text CHECK (correction_status IN ('received', 'reviewing', 'fixed')),
  ADD COLUMN IF NOT EXISTS article_url text,
  ADD COLUMN IF NOT EXISTS article_title text;

-- Indexes for classification queries
CREATE INDEX IF NOT EXISTS idx_inbox_conv_company_type
  ON inbox_conversations(company_id, message_type);

CREATE INDEX IF NOT EXISTS idx_inbox_conv_company_editorial
  ON inbox_conversations(company_id, editorial_value DESC)
  WHERE editorial_value >= 3;

CREATE INDEX IF NOT EXISTS idx_inbox_conv_company_correction
  ON inbox_conversations(company_id, correction_status)
  WHERE correction_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbox_conv_company_language
  ON inbox_conversations(company_id, detected_language);

CREATE INDEX IF NOT EXISTS idx_inbox_conv_company_classified
  ON inbox_conversations(company_id, ai_classified_at)
  WHERE ai_classified_at IS NULL;
