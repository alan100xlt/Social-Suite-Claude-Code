-- Expand inbox_activity_log action CHECK constraint to include content workflow actions
ALTER TABLE public.inbox_activity_log
  DROP CONSTRAINT IF EXISTS inbox_activity_log_action_check;

ALTER TABLE public.inbox_activity_log
  ADD CONSTRAINT inbox_activity_log_action_check
  CHECK (action IN (
    'assigned','status_changed','replied','noted','labeled','escalated',
    'correction_created','correction_resolved',
    'content_submitted','content_approved','content_rejected','content_pulled','content_assigned'
  ));
