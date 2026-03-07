-- Per-user notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  event_type text NOT NULL CHECK (event_type IN ('assignment','mention','reply','status_change','correction','escalation','sla_breach')),
  in_app boolean DEFAULT true,
  email boolean DEFAULT false,
  PRIMARY KEY (user_id, company_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());
