-- Fix analytics snapshot unique constraints to allow daily tracking.
-- The 20260128 migration changed both constraints to exclude snapshot_date,
-- which causes every sync to overwrite the same row instead of creating
-- a new row per day. This broke ALL sparklines and time-series charts.

-- Fix post_analytics_snapshots: one row per company + post + date
DROP INDEX IF EXISTS idx_post_analytics_unique;
CREATE UNIQUE INDEX idx_post_analytics_unique
  ON post_analytics_snapshots(company_id, post_id, snapshot_date);

-- Fix account_analytics_snapshots: one row per company + account + date
DROP INDEX IF EXISTS idx_account_analytics_unique;
CREATE UNIQUE INDEX idx_account_analytics_unique
  ON account_analytics_snapshots(company_id, account_id, snapshot_date);
