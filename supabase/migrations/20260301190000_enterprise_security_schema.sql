-- Enterprise Security Schema for Media Company Hierarchy
-- Supports 1000+ media companies with sub-50ms permission checks

-- Core hierarchy table optimized for lookups
CREATE TABLE IF NOT EXISTS media_company_hierarchy (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  child_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  access_level INTEGER NOT NULL CHECK (access_level >= 0 AND access_level <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate user-company relationships
  UNIQUE(user_id, child_company_id)
);

-- Performance indexes for hierarchy lookups
CREATE INDEX idx_media_company_hierarchy_user_id ON media_company_hierarchy(user_id);
CREATE INDEX idx_media_company_hierarchy_media_company_id ON media_company_hierarchy(media_company_id);
CREATE INDEX idx_media_company_hierarchy_child_company_id ON media_company_hierarchy(child_company_id);
CREATE INDEX idx_media_company_hierarchy_role ON media_company_hierarchy(role);

-- Materialized view for precomputed permissions (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW user_permissions AS
SELECT 
  uh.user_id,
  array_agg(DISTINCT uh.child_company_id) as accessible_companies,
  array_agg(DISTINCT uh.media_company_id) as media_companies,
  max(uh.access_level) as max_access_level,
  max(uh.updated_at) as last_updated
FROM media_company_hierarchy uh
GROUP BY uh.user_id;

-- Unique index on materialized view for fast lookups
CREATE UNIQUE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- GIN index for company_id array operations (critical for performance)
CREATE INDEX idx_user_permissions_companies_gin ON user_permissions USING GIN(accessible_companies);
CREATE INDEX idx_user_permissions_media_companies_gin ON user_permissions USING GIN(media_companies);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
END;
$$ LANGUAGE plpgsql;

-- Security context function for RLS integration
CREATE OR REPLACE FUNCTION set_security_context(
  user_id_param UUID,
  company_ids UUID[],
  media_company_ids UUID[],
  max_access_level_param INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  -- Set session variables for RLS policies
  PERFORM set_config('app.current_user_id', user_id_param::text, true);
  PERFORM set_config('app.company_ids', company_ids::text, true);
  PERFORM set_config('app.media_company_ids', media_company_ids::text, true);
  PERFORM set_config('app.max_access_level', max_access_level_param::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION has_company_access(
  user_id_param UUID,
  company_id_param UUID
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = user_id_param 
    AND company_id_param = ANY(accessible_companies)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check media company access
CREATE OR REPLACE FUNCTION has_media_company_access(
  user_id_param UUID,
  media_company_id_param UUID
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = user_id_param 
    AND media_company_id_param = ANY(media_companies)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies using session variables

-- Posts policy with company array filtering
DROP POLICY IF EXISTS "Company data access" ON posts;
CREATE POLICY "Company data access" ON posts
FOR ALL USING (
  company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

-- Companies policy with array filtering
DROP POLICY IF EXISTS "Companies access" ON companies;
CREATE POLICY "Companies access" ON companies
FOR ALL USING (
  id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

-- Media company hierarchy policy
DROP POLICY IF EXISTS "Media company hierarchy access" ON media_company_hierarchy;
CREATE POLICY "Media company hierarchy access" ON media_company_hierarchy
FOR ALL USING (
  user_id = current_setting('app.current_user_id', true)::uuid
);

-- Analytics tables with company filtering
DROP POLICY IF EXISTS "Post analytics access" ON post_analytics_snapshots;
CREATE POLICY "Post analytics access" ON post_analytics_snapshots
FOR ALL USING (
  company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

-- Automated refresh schedule (every 15 minutes)
-- Note: This requires pg_cron extension
-- SELECT cron.schedule('refresh-user-permissions', '*/15 * * * *', 'SELECT refresh_user_permissions();');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON media_company_hierarchy TO authenticated;
GRANT SELECT ON user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION set_security_context TO authenticated;
GRANT EXECUTE ON FUNCTION has_company_access TO authenticated;
GRANT EXECUTE ON FUNCTION has_media_company_access TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_permissions TO authenticated;

-- Row level security
ALTER TABLE media_company_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Performance monitoring view
CREATE OR REPLACE VIEW security_performance_metrics AS
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT media_company_id) as total_media_companies,
  COUNT(DISTINCT child_company_id) as total_child_companies,
  AVG(array_length(accessible_companies, 1)) as avg_companies_per_user,
  MAX(array_length(accessible_companies, 1)) as max_companies_per_user
FROM user_permissions;

-- Insert sample data for testing (remove in production)
-- This would be replaced by actual user setup
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_media_company UUID := gen_random_uuid();
  test_child_company1 UUID := gen_random_uuid();
  test_child_company2 UUID := gen_random_uuid();
BEGIN
  -- Only insert if no data exists
  IF NOT EXISTS (SELECT 1 FROM media_company_hierarchy LIMIT 1) THEN
    -- Create test companies
    INSERT INTO companies (id, name, created_at) VALUES
      (test_media_company, 'Test Media Company', NOW()),
      (test_child_company1, 'Test Child Company 1', NOW()),
      (test_child_company2, 'Test Child Company 2', NOW());
    
    -- Create test hierarchy
    INSERT INTO media_company_hierarchy (user_id, media_company_id, child_company_id, role, access_level) VALUES
      (test_user_id, test_media_company, test_child_company1, 'admin', 100),
      (test_user_id, test_media_company, test_child_company2, 'admin', 100);
    
    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW user_permissions;
  END IF;
END $$;
