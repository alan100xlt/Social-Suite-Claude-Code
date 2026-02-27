
-- Create API logs table for tracking all GetLate API calls
CREATE TABLE public.api_call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid,
  profile_id text,
  function_name text NOT NULL,
  action text NOT NULL,
  request_body jsonb DEFAULT '{}'::jsonb,
  response_body jsonb DEFAULT '{}'::jsonb,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  duration_ms integer,
  account_ids text[] DEFAULT '{}'::text[],
  platform text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_api_call_logs_company_id ON public.api_call_logs(company_id);
CREATE INDEX idx_api_call_logs_created_at ON public.api_call_logs(created_at DESC);
CREATE INDEX idx_api_call_logs_function_name ON public.api_call_logs(function_name);
CREATE INDEX idx_api_call_logs_success ON public.api_call_logs(success);

-- Enable RLS
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

-- Superadmin can view all logs
CREATE POLICY "Superadmin can view all api logs"
ON public.api_call_logs FOR SELECT
USING (is_superadmin());

-- Company members can view their company logs
CREATE POLICY "Company members can view their api logs"
ON public.api_call_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Service role can insert logs
CREATE POLICY "Service role can manage api logs"
ON public.api_call_logs FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);
