-- Fix missing table-level GRANTs for all public tables.
-- Without these, even service_role gets "permission denied" (42501)
-- because rolbypassrls only bypasses RLS policies, not table GRANTs.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role', tbl.table_name);
  END LOOP;
END $$;

-- Grant usage on sequences
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon, authenticated, service_role', seq.sequence_name);
  END LOOP;
END $$;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
