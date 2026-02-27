-- Remove time-series: keep only one row per post (latest snapshot)

-- Step 1: Remove old data, keeping only the most recent snapshot per post
DELETE FROM post_analytics_snapshots p1
WHERE EXISTS (
  SELECT 1 FROM post_analytics_snapshots p2
  WHERE p2.post_id = p1.post_id 
    AND p2.company_id = p1.company_id
    AND p2.snapshot_date > p1.snapshot_date
);

-- Step 2: Drop the old unique index that included snapshot_date
DROP INDEX IF EXISTS idx_post_analytics_unique;

-- Step 3: Create new unique index on just post_id + company_id
CREATE UNIQUE INDEX idx_post_analytics_unique ON post_analytics_snapshots(company_id, post_id);

-- Step 4: Same for account_analytics_snapshots - keep only latest per account
DELETE FROM account_analytics_snapshots a1
WHERE EXISTS (
  SELECT 1 FROM account_analytics_snapshots a2
  WHERE a2.account_id = a1.account_id 
    AND a2.company_id = a1.company_id
    AND a2.snapshot_date > a1.snapshot_date
);

-- Step 5: Drop old account index if exists
DROP INDEX IF EXISTS idx_account_analytics_unique;

-- Step 6: Create new unique index for accounts
CREATE UNIQUE INDEX idx_account_analytics_unique ON account_analytics_snapshots(company_id, account_id);