
-- Add is_active column to account_analytics_snapshots
-- Defaults to true for backwards compatibility with existing data
ALTER TABLE public.account_analytics_snapshots
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add a comment explaining the field
COMMENT ON COLUMN public.account_analytics_snapshots.is_active IS 'Cached from GetLate API isActive field during hourly sync. Reflects whether the OAuth connection is valid.';
