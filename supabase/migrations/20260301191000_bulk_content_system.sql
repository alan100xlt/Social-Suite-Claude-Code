-- SUPERSEDED by 20260303100000_platform_restoration_rls_cleanup.sql
-- The infrastructure created by this migration has been removed.
-- Bulk Content System for Enterprise Portfolio Management
-- Supports cross-company content creation and publishing

-- Content Templates Table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  platforms TEXT[] NOT NULL,
  customizations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Template metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id)
);

-- Bulk Content Posts Table
CREATE TABLE IF NOT EXISTS bulk_content_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  base_content TEXT NOT NULL,
  content_variants JSONB NOT NULL,
  target_companies UUID[] NOT NULL,
  template_id UUID REFERENCES content_templates(id),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Publishing metadata
  publishing_strategy TEXT DEFAULT 'immediate' CHECK (publishing_strategy IN ('immediate', 'scheduled', 'staggered')),
  published_company_ids UUID[] DEFAULT '{}',
  failed_company_ids UUID[] DEFAULT '{}',
  publishing_errors JSONB DEFAULT '{}',
  total_engagement INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  platform_performance JSONB DEFAULT '{}'
);

-- Publishing Jobs Table
CREATE TABLE IF NOT EXISTS publishing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bulk_post_id UUID NOT NULL REFERENCES bulk_content_posts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  content TEXT NOT NULL,
  media_files TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance tracking
  processing_time_ms INTEGER,
  api_response JSONB,
  platform_post_id TEXT
);

-- Content Performance Analytics Table
CREATE TABLE IF NOT EXISTS content_performance_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bulk_post_id UUID REFERENCES bulk_content_posts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  reach INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Assets Table for Cross-Company Sharing
CREATE TABLE IF NOT EXISTS content_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  cdn_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Platform Customization Templates
CREATE TABLE IF NOT EXISTS platform_customizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES content_templates(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  max_length INTEGER DEFAULT 280,
  hashtags_allowed BOOLEAN DEFAULT true,
  mentions_allowed BOOLEAN DEFAULT true,
  media_types TEXT[] DEFAULT '{}',
  tone_options TEXT[] DEFAULT '{}',
  formatting_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(template_id, platform)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_user_id ON bulk_content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_media_company_id ON bulk_content_posts(media_company_id);
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_status ON bulk_content_posts(status);
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_scheduled_at ON bulk_content_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_created_at ON bulk_content_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_bulk_post_id ON publishing_jobs(bulk_post_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_company_id ON publishing_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON publishing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_at ON publishing_jobs(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_platform ON publishing_jobs(platform);

CREATE INDEX IF NOT EXISTS idx_content_performance_bulk_post_id ON content_performance_analytics(bulk_post_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_company_id ON content_performance_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_published_at ON content_performance_analytics(published_at);
CREATE INDEX IF NOT EXISTS idx_content_performance_platform ON content_performance_analytics(platform);

CREATE INDEX IF NOT EXISTS idx_content_assets_user_id ON content_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_media_company_id ON content_assets(media_company_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_file_hash ON content_assets(file_hash);
CREATE INDEX IF NOT EXISTS idx_content_assets_tags ON content_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_content_assets_created_at ON content_assets(created_at);

-- GIN Index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_variants_gin ON bulk_content_posts USING GIN(content_variants);
CREATE INDEX IF NOT EXISTS idx_bulk_content_posts_platform_performance_gin ON bulk_content_posts USING GIN(platform_performance);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_api_response_gin ON publishing_jobs USING GIN(api_response);
CREATE INDEX IF NOT EXISTS idx_content_assets_metadata_gin ON content_assets USING GIN(metadata);

-- Functions for Bulk Content Operations

-- Function to create bulk content post with variants
CREATE OR REPLACE FUNCTION create_bulk_content_post(
  p_user_id UUID,
  p_media_company_id UUID,
  p_title TEXT,
  p_base_content TEXT,
  p_target_companies UUID[],
  p_template_id UUID,
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_publishing_strategy TEXT DEFAULT 'immediate'
)
RETURNS UUID AS $$
DECLARE
  v_post_id UUID;
  v_variants JSONB;
BEGIN
  -- Create the bulk post
  INSERT INTO bulk_content_posts (
    user_id,
    media_company_id,
    title,
    base_content,
    target_companies,
    template_id,
    scheduled_at,
    status,
    publishing_strategy,
    content_variants
  ) VALUES (
    p_user_id,
    p_media_company_id,
    p_title,
    p_base_content,
    p_target_companies,
    p_template_id,
    p_scheduled_at,
    CASE 
      WHEN p_scheduled_at IS NULL THEN 'publishing'
      ELSE 'scheduled'
    END,
    p_publishing_strategy,
    '{}' -- Will be populated by trigger
  )
  RETURNING id INTO v_post_id;
  
  -- Return the new post ID
  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get portfolio publishing statistics
CREATE OR REPLACE FUNCTION get_portfolio_publishing_stats(
  p_media_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_posts BIGINT,
  successful_posts BIGINT,
  failed_posts BIGINT,
  pending_posts BIGINT,
  success_rate DECIMAL(5,2),
  avg_engagement_rate DECIMAL(5,2),
  total_impressions BIGINT,
  total_engagement BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE status = 'published') as successful_posts,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'retrying')) as pending_posts,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'published')::DECIMAL / COUNT(*)::DECIMAL) * 100
      ELSE 0 
    END as success_rate,
    AVG(platform_performance->>'engagementRate'::DECIMAL) as avg_engagement_rate,
    COALESCE(SUM(total_impressions), 0) as total_impressions,
    COALESCE(SUM(total_engagement), 0) as total_engagement
  FROM bulk_content_posts
  WHERE media_company_id = p_media_company_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform performance breakdown
CREATE OR REPLACE FUNCTION get_platform_performance_breakdown(
  p_media_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  platform TEXT,
  posts BIGINT,
  engagement BIGINT,
  engagement_rate DECIMAL(5,2),
  growth DECIMAL(5,2),
  avg_processing_time_ms DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.platform,
    COUNT(*) as posts,
    COALESCE(SUM(cpa.engagement), 0) as engagement,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COALESCE(SUM(cpa.engagement), 0)::DECIMAL / COUNT(*)::DECIMAL)
      ELSE 0 
    END as engagement_rate,
    0.0 as growth, -- Calculate based on historical data
    COALESCE(AVG(pj.processing_time_ms), 0) as avg_processing_time_ms
  FROM publishing_jobs pj
  LEFT JOIN content_performance_analytics cpa ON pj.id = cpa.bulk_post_id
  WHERE pj.bulk_post_id IN (
    SELECT id FROM bulk_content_posts 
    WHERE media_company_id = p_media_company_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days
  )
  GROUP BY pj.platform;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically generate content variants
CREATE OR REPLACE FUNCTION generate_content_variants()
RETURNS TRIGGER AS $$
DECLARE
  v_companies RECORD;
  v_platforms TEXT[];
  v_variant JSONB;
  v_variants JSONB := '[]'::JSONB;
BEGIN
  -- Get target companies and their platforms
  FOR v_companies IN 
    SELECT c.id, c.platforms 
    FROM companies c
    WHERE c.id = ANY(NEW.target_companies)
  LOOP
    -- Generate variants for each platform
    FOREACH platform IN ARRAY v_companies.platforms
    LOOP
      v_variant := jsonb_build_object(
        'platform', platform,
        'content', NEW.base_content,
        'media_files', '{}'::TEXT[],
        'hashtags', '{}'::TEXT[],
        'mentions', '{}'::TEXT[]
      );
      
      v_variants := v_variants || v_variant;
    END LOOP;
  END LOOP;
  
  -- Update the post with generated variants
  NEW.content_variants := v_variants;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic variant generation
DROP TRIGGER IF EXISTS trg_generate_content_variants ON bulk_content_posts;
CREATE TRIGGER trg_generate_content_variants
  BEFORE INSERT ON bulk_content_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_content_variants();

-- Function to process publishing queue
CREATE OR REPLACE FUNCTION process_publishing_queue()
RETURNS TABLE (
  jobs_processed BIGINT,
  jobs_successful BIGINT,
  jobs_failed BIGINT
) AS $$
DECLARE
  v_jobs_processed BIGINT := 0;
  v_jobs_successful BIGINT := 0;
  v_jobs_failed BIGINT := 0;
  v_job RECORD;
BEGIN
  -- Get pending jobs
  FOR v_job IN 
    SELECT * FROM publishing_jobs
    WHERE status IN ('pending', 'retrying')
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Update job status to processing
    UPDATE publishing_jobs 
    SET status = 'processing', updated_at = NOW()
    WHERE id = v_job.id;
    
    -- Simulate processing (replace with actual platform API calls)
    PERFORM pg_sleep(0.1); -- 100ms delay
    
    -- Update job result (90% success rate)
    IF random() > 0.1 THEN
      UPDATE publishing_jobs 
      SET status = 'completed', 
          published_at = NOW(),
          processing_time_ms = FLOOR(random() * 2000 + 500)::INTEGER,
          updated_at = NOW()
      WHERE id = v_job.id;
      v_jobs_successful := v_jobs_successful + 1;
    ELSE
      UPDATE publishing_jobs 
      SET status = 'failed',
          error_message = 'Platform API error',
          retry_count = CASE 
            WHEN retry_count < max_retries THEN retry_count + 1
            ELSE retry_count
          END,
          updated_at = NOW()
      WHERE id = v_job.id;
      v_jobs_failed := v_jobs_failed + 1;
    END IF;
    
    v_jobs_processed := v_jobs_processed + 1;
  END LOOP;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE bulk_content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Bulk posts access" ON bulk_content_posts
FOR ALL USING (
  media_company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

CREATE POLICY "Publishing jobs access" ON publishing_jobs
FOR ALL USING (
  company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

CREATE POLICY "Content assets access" ON content_assets
FOR ALL USING (
  media_company_id = ANY(
    COALESCE(
      NULLIF(current_setting('app.company_ids', true), '')::uuid[],
      ARRAY[]::uuid[]
    )
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON content_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_content_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON publishing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_performance_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_customizations TO authenticated;

GRANT EXECUTE ON FUNCTION create_bulk_content_post TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_publishing_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_performance_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION process_publishing_queue TO authenticated;
GRANT EXECUTE ON FUNCTION generate_content_variants TO authenticated;

-- Insert default content templates
INSERT INTO content_templates (id, name, description, platforms, customizations, created_by) VALUES
  (
    gen_random_uuid(),
    'Standard Post',
    'General purpose template for social media posts',
    ARRAY['twitter', 'facebook', 'linkedin', 'instagram'],
    '{
      "twitter": {
        "maxLength": 280,
        "hashtags": true,
        "mentions": true,
        "mediaTypes": ["image", "video"],
        "tone": ["casual", "professional", "urgent"]
      },
      "facebook": {
        "maxLength": 63206,
        "hashtags": true,
        "mentions": true,
        "mediaTypes": ["image", "video", "document"],
        "tone": ["casual", "professional", "promotional"]
      },
      "linkedin": {
        "maxLength": 3000,
        "hashtags": false,
        "mentions": true,
        "mediaTypes": ["image", "document", "presentation"],
        "tone": ["professional", "formal", "thought-leadership"]
      },
      "instagram": {
        "maxLength": 2200,
        "hashtags": true,
        "mentions": true,
        "mediaTypes": ["image", "video", "carousel"],
        "tone": ["visual", "inspirational", "behind-the-scenes"]
      }
    }'::jsonb,
    (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
  ),
  (
    gen_random_uuid(),
    'Breaking News',
    'Template for urgent news and announcements',
    ARRAY['twitter', 'facebook', 'linkedin'],
    '{
      "twitter": {
        "maxLength": 280,
        "hashtags": true,
        "mentions": true,
        "mediaTypes": ["image"],
        "tone": ["urgent", "factual", "breaking"]
      },
      "facebook": {
        "maxLength": 63206,
        "hashtags": true,
        "mentions": true,
        "mediaTypes": ["image", "video"],
        "tone": ["informative", "urgent", "community-focused"]
      },
      "linkedin": {
        "maxLength": 3000,
        "hashtags": false,
        "mentions": true,
        "mediaTypes": ["image", "document"],
        "tone": ["professional", "analytical", "industry-insight"]
      }
    }'::jsonb,
    (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
  )
ON CONFLICT DO NOTHING;
