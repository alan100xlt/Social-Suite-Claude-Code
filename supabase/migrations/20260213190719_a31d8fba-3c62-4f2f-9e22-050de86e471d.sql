-- Create automation audit log table
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  feed_id UUID REFERENCES public.rss_feeds(id) ON DELETE SET NULL,
  feed_item_id UUID REFERENCES public.rss_feed_items(id) ON DELETE SET NULL,
  article_title TEXT,
  article_link TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL, -- 'success', 'error', 'skipped'
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Company members can view their automation logs
CREATE POLICY "Company members can view automation logs"
  ON public.automation_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- Service role can insert logs
CREATE POLICY "Service role can manage automation logs"
  ON public.automation_logs FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Superadmin can view all
CREATE POLICY "Superadmin can view all automation logs"
  ON public.automation_logs FOR SELECT
  USING (is_superadmin());

-- Index for efficient queries
CREATE INDEX idx_automation_logs_company_id ON public.automation_logs(company_id);
CREATE INDEX idx_automation_logs_rule_id ON public.automation_logs(rule_id);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);