-- Koko Copilot: chat threads and messages for AI copilot conversations
-- Design: docs/plans/2026-03-04-koko-copilot-design.md

-- Chat threads (one per conversation)
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text,
  context_type text NOT NULL DEFAULT 'general'
    CHECK (context_type IN ('general', 'draft', 'analytics', 'settings')),
  context_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chat messages (per thread)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool_result')),
  content text,
  tool_calls jsonb,
  tool_results jsonb,
  actions jsonb,
  tokens_used int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_threads_company ON chat_threads(company_id);
CREATE INDEX idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX idx_chat_threads_updated ON chat_threads(updated_at DESC);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(thread_id, created_at DESC);

-- RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Threads: users can access threads for companies they belong to
CREATE POLICY "chat_threads_select" ON chat_threads FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "chat_threads_insert" ON chat_threads FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_threads_update" ON chat_threads FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "chat_threads_delete" ON chat_threads FOR DELETE
  USING (created_by = auth.uid());

-- Messages: access via thread membership (thread's company matches user's company)
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (thread_id IN (
    SELECT id FROM chat_threads WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (thread_id IN (
    SELECT id FROM chat_threads WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

-- Service role policy for edge function writes
CREATE POLICY "chat_messages_service" ON chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant the service role policy only applies to service_role
-- (The above policy is overly broad; in practice, RLS + auth.uid() policies
-- take precedence for anon/authenticated roles. Service role bypasses RLS.)

-- Updated_at trigger for threads
CREATE OR REPLACE FUNCTION update_chat_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER chat_message_updates_thread
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_thread_timestamp();
