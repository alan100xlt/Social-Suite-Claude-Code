-- Migration: Content Workflow Infrastructure
-- Adds workflow columns to post_drafts (assignment, review, approval).
-- Extends inbox_activity_log with entity_type + entity_id for content activity.
-- Seeds notification preferences for content workflow events.

-- ===== STEP 1: Extend post_drafts with workflow columns =====
ALTER TABLE public.post_drafts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_post_drafts_assigned_to ON public.post_drafts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_drafts_status ON public.post_drafts(status);

-- Status values (TEXT, no enum): draft, awaiting_approval, approved, rejected, scheduled, published, pulled, archived

-- ===== STEP 2: Extend inbox_activity_log for multi-entity support =====
ALTER TABLE public.inbox_activity_log
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'conversation',
  ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Backfill entity_id from conversation_id for existing rows
UPDATE public.inbox_activity_log SET entity_id = conversation_id WHERE entity_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.inbox_activity_log(entity_type, entity_id);

-- ===== STEP 3: Seed notification preferences for content workflow events =====
INSERT INTO public.notification_preferences (user_id, company_id, event_type, in_app, email)
SELECT cm.user_id, cm.company_id, evt.type, true, false
FROM public.company_memberships cm
CROSS JOIN (VALUES ('content_submitted'), ('content_approved'), ('content_rejected'), ('content_published')) AS evt(type)
ON CONFLICT DO NOTHING;
