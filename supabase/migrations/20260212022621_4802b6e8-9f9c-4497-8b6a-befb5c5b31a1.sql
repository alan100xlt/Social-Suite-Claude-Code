
-- Table to store post approval requests
CREATE TABLE public.post_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  platform_contents JSONB NOT NULL DEFAULT '{}'::jsonb,
  article_title TEXT,
  article_link TEXT,
  article_image_url TEXT,
  objective TEXT,
  image_url TEXT,
  selected_account_ids TEXT[] NOT NULL DEFAULT '{}',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.post_approvals ENABLE ROW LEVEL SECURITY;

-- Company members can view their approvals
CREATE POLICY "Company members can view approvals"
  ON public.post_approvals
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- Owners and admins can create approvals
CREATE POLICY "Owners and admins can create approvals"
  ON public.post_approvals
  FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND created_by = auth.uid()
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
  );

-- Service role can manage all approvals (for edge functions)
CREATE POLICY "Service role can manage approvals"
  ON public.post_approvals
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Anyone can view by token (for the magic link approval page)
CREATE POLICY "Anyone can view approval by token"
  ON public.post_approvals
  FOR SELECT
  USING (true);
