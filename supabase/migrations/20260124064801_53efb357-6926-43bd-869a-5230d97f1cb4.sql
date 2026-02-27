-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Create enum for RSS item status
CREATE TYPE public.rss_item_status AS ENUM ('pending', 'posted', 'failed', 'skipped');

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    getlate_profile_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create company_invitations table
CREATE TABLE public.company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rss_feeds table
CREATE TABLE public.rss_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_publish BOOLEAN NOT NULL DEFAULT false,
    poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_polled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rss_feed_items table
CREATE TABLE public.rss_feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID REFERENCES public.rss_feeds(id) ON DELETE CASCADE NOT NULL,
    guid TEXT NOT NULL,
    title TEXT,
    link TEXT,
    description TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    post_id TEXT,
    status rss_item_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (feed_id, guid)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX idx_rss_feeds_company_id ON public.rss_feeds(company_id);
CREATE INDEX idx_rss_feed_items_feed_id ON public.rss_feed_items(feed_id);
CREATE INDEX idx_rss_feed_items_status ON public.rss_feed_items(status);

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM public.profiles
    WHERE id = _user_id
$$;

-- Create function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = _user_id
        AND company_id = _company_id
    )
$$;

-- Create trigger function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rss_feeds_updated_at
    BEFORE UPDATE ON public.rss_feeds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feed_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their company"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id(auth.uid()));

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
    ON public.companies FOR SELECT
    TO authenticated
    USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create companies"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and admins can update their company"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (
        id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
    );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view roles in their company"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = user_roles.user_id
            AND p.company_id = public.get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "Owners can manage roles in their company"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner')
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = user_roles.user_id
            AND p.company_id = public.get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "Admins can manage member roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        AND user_roles.role = 'member'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = user_roles.user_id
            AND p.company_id = public.get_user_company_id(auth.uid())
        )
    );

-- RLS Policies for company_invitations
CREATE POLICY "Owners and admins can view invitations"
    ON public.company_invitations FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "Owners and admins can create invitations"
    ON public.company_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id(auth.uid())
        AND invited_by = auth.uid()
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "Owners and admins can delete invitations"
    ON public.company_invitations FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
    );

-- Allow anyone to view invitations by token (for accepting)
CREATE POLICY "Anyone can view invitations by token"
    ON public.company_invitations FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for rss_feeds
CREATE POLICY "Company members can view feeds"
    ON public.rss_feeds FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners and admins can manage feeds"
    ON public.rss_feeds FOR ALL
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
    );

-- RLS Policies for rss_feed_items
CREATE POLICY "Company members can view feed items"
    ON public.rss_feed_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.rss_feeds f
            WHERE f.id = rss_feed_items.feed_id
            AND f.company_id = public.get_user_company_id(auth.uid())
        )
    );

-- Allow service role to manage feed items (for the poller edge function)
CREATE POLICY "Service role can manage feed items"
    ON public.rss_feed_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);