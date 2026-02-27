-- Create post_analytics_snapshots table for historical post performance
CREATE TABLE public.post_analytics_snapshots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account_analytics_snapshots table for historical account metrics
CREATE TABLE public.account_analytics_snapshots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    following INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_post_analytics_company_date ON public.post_analytics_snapshots(company_id, snapshot_date);
CREATE INDEX idx_post_analytics_post_date ON public.post_analytics_snapshots(post_id, snapshot_date);
CREATE INDEX idx_account_analytics_company_date ON public.account_analytics_snapshots(company_id, snapshot_date);
CREATE INDEX idx_account_analytics_account_date ON public.account_analytics_snapshots(account_id, snapshot_date);

-- Create unique constraints to prevent duplicate snapshots
CREATE UNIQUE INDEX idx_post_analytics_unique ON public.post_analytics_snapshots(post_id, snapshot_date);
CREATE UNIQUE INDEX idx_account_analytics_unique ON public.account_analytics_snapshots(account_id, snapshot_date);

-- Enable RLS
ALTER TABLE public.post_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_analytics_snapshots
CREATE POLICY "Company members can view their analytics"
ON public.post_analytics_snapshots
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Service role can manage all analytics"
ON public.post_analytics_snapshots
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for account_analytics_snapshots
CREATE POLICY "Company members can view their account analytics"
ON public.account_analytics_snapshots
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Service role can manage all account analytics"
ON public.account_analytics_snapshots
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');