-- Migration: RBAC Expansion — Part 1 (enum values)
-- ALTER TYPE ADD VALUE cannot be used inside a transaction block.
-- Supabase runs each migration file in its own transaction, but ADD VALUE IF NOT EXISTS
-- is treated specially by Postgres and auto-commits.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'collaborator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'community_manager';
