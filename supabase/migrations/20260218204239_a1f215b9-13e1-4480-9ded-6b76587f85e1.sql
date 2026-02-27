
-- Create superadmins table
CREATE TABLE public.superadmins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Only service_role and existing superadmins can read
CREATE POLICY "superadmins_read" ON public.superadmins
  FOR SELECT USING (
    auth.role() = 'service_role'::text
    OR EXISTS (SELECT 1 FROM public.superadmins sa WHERE sa.user_id = auth.uid())
  );

-- Only service_role can insert/update/delete
CREATE POLICY "superadmins_service_write" ON public.superadmins
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Update is_superadmin() to check the new table instead of hardcoded email
CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins
    WHERE user_id = auth.uid()
  )
$$;
