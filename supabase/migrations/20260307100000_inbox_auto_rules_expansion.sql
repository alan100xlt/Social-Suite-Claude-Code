-- ============================================================================
-- Phase 2A: Expanded Auto-Respond Rules
-- Adds new trigger types and action types for AI-powered automation.
-- ============================================================================

-- Drop and recreate trigger_type CHECK to add new values
ALTER TABLE inbox_auto_rules
  DROP CONSTRAINT IF EXISTS inbox_auto_rules_trigger_type_check;

ALTER TABLE inbox_auto_rules
  ADD CONSTRAINT inbox_auto_rules_trigger_type_check
  CHECK (trigger_type IN (
    'keyword', 'regex', 'sentiment', 'all_new',
    'message_type', 'editorial_value', 'language', 'repeat_contact', 'after_hours'
  ));

-- Drop and recreate action_type CHECK to add new values
ALTER TABLE inbox_auto_rules
  DROP CONSTRAINT IF EXISTS inbox_auto_rules_action_type_check;

ALTER TABLE inbox_auto_rules
  ADD CONSTRAINT inbox_auto_rules_action_type_check
  CHECK (action_type IN (
    'canned_reply', 'ai_response',
    'notify_editor', 'hide_comment', 'acknowledge'
  ));

-- Add new columns for expanded rule configuration
ALTER TABLE inbox_auto_rules
  ADD COLUMN IF NOT EXISTS notify_user_ids uuid[],
  ADD COLUMN IF NOT EXISTS notify_via text[],
  ADD COLUMN IF NOT EXISTS after_hours_config jsonb;

-- Index for after_hours rules (need to check frequently during sync)
CREATE INDEX IF NOT EXISTS idx_inbox_auto_rules_enabled_trigger
  ON inbox_auto_rules(company_id, enabled, trigger_type)
  WHERE enabled = true;
