-- Add saves column to analytics snapshot tables
-- GetLate API returns saves in analytics responses (confirmed via contract tests)

ALTER TABLE post_analytics_snapshots
ADD COLUMN IF NOT EXISTS saves integer DEFAULT 0;

ALTER TABLE account_analytics_snapshots
ADD COLUMN IF NOT EXISTS saves integer DEFAULT 0;
