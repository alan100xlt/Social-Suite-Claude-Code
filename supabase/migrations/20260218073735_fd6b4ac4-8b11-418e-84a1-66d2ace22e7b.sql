
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;
