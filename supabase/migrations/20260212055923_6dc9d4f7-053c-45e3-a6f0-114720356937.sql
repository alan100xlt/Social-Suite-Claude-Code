
-- Create post_drafts table for persistent wizard state
CREATE TABLE public.post_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  updated_by UUID,
  title TEXT,
  post_source TEXT, -- 'article' | 'scratch'
  selected_article_id TEXT,
  objective TEXT DEFAULT 'reach',
  selected_account_ids TEXT[] DEFAULT '{}',
  platform_contents JSONB DEFAULT '{}'::jsonb,
  strategy TEXT,
  image_url TEXT,
  current_step INTEGER DEFAULT 0,
  compose_phase TEXT DEFAULT 'strategy',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'archived'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;

-- Company members can view all drafts in their company
CREATE POLICY "Company members can view drafts"
  ON public.post_drafts FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- Any company member can create drafts
CREATE POLICY "Company members can create drafts"
  ON public.post_drafts FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND created_by = auth.uid());

-- Any company member can update drafts (collaborative)
CREATE POLICY "Company members can update drafts"
  ON public.post_drafts FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

-- Creator or admins/owners can delete drafts
CREATE POLICY "Creator or admins can delete drafts"
  ON public.post_drafts FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'owner'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Superadmin access
CREATE POLICY "Superadmin can manage all drafts"
  ON public.post_drafts FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Auto-update updated_at
CREATE TRIGGER update_post_drafts_updated_at
  BEFORE UPDATE ON public.post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
