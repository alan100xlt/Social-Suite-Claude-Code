-- Webhook infrastructure for real-time GetLate event ingestion (SOC-184)

-- ── webhook_registrations: tracks registered webhooks per company ──
CREATE TABLE public.webhook_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'getlate',
  webhook_id text,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  consecutive_failures int NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, provider)
);

-- RLS: service_role only (no user-facing access)
ALTER TABLE public.webhook_registrations ENABLE ROW LEVEL SECURITY;

-- ── webhook_event_log: raw event log for debugging + idempotency ──
CREATE TABLE public.webhook_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  provider text NOT NULL DEFAULT 'getlate',
  event_type text NOT NULL,
  event_id text,
  payload jsonb NOT NULL DEFAULT '{}',
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'skipped', 'failed')),
  error_message text,
  duration_ms int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);

ALTER TABLE public.webhook_event_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_webhook_log_created ON webhook_event_log(created_at);
CREATE INDEX idx_webhook_log_company ON webhook_event_log(company_id, created_at DESC);
CREATE INDEX idx_webhook_log_failed ON webhook_event_log(processing_status) WHERE processing_status = 'failed';

-- ── Dedup safety index on inbox_messages ──
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_msg_dedup
  ON inbox_messages(platform_message_id, conversation_id)
  WHERE platform_message_id IS NOT NULL;

-- ── Auto-cleanup: delete webhook logs older than 7 days ──
SELECT cron.schedule('webhook-log-cleanup', '0 3 * * *',
  $$DELETE FROM public.webhook_event_log WHERE created_at < now() - interval '7 days'$$);
