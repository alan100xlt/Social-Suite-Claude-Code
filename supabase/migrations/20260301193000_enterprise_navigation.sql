-- Enterprise Navigation and User Experience System
-- Supports intelligent navigation, responsive design, and performance optimization

-- User Navigation Preferences Table
CREATE TABLE IF NOT EXISTS user_navigation_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  view_mode TEXT DEFAULT 'grid' CHECK (view_mode IN ('grid', 'list', 'compact')),
  default_dashboard TEXT DEFAULT 'overview',
  favorite_companies UUID[] DEFAULT '{}',
  recently_viewed_companies UUID[] DEFAULT '{}',
  navigation_order TEXT[] DEFAULT '{}',
  quick_access_links JSONB DEFAULT '{}',
  sidebar_collapsed BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, media_company_id)
);

-- Navigation Analytics Table
CREATE TABLE IF NOT EXISTS navigation_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  session_id UUID,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer_path TEXT,
  user_agent TEXT,
  ip_address INET,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  screen_resolution TEXT,
  viewport_size TEXT,
  load_time_ms INTEGER,
  interaction_time_ms INTEGER,
  time_on_page_ms INTEGER,
  scroll_depth DECIMAL(5,2),
  clicks INTEGER DEFAULT 0,
  key_presses INTEGER DEFAULT 0,
  touch_gestures INTEGER DEFAULT 0,
  is_pwa BOOLEAN DEFAULT false,
  is_offline BOOLEAN DEFAULT false,
  connection_type TEXT,
  battery_level DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  session_id UUID,
  load_time_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  largest_contentful_paint_ms INTEGER,
  cumulative_layout_shift DECIMAL(5,3),
  first_input_delay_ms INTEGER,
  time_to_interactive_ms INTEGER,
  memory_usage_mb INTEGER,
  network_requests INTEGER,
  cache_hit_rate DECIMAL(5,2),
  bundle_size_kb INTEGER,
  image_optimization_rate DECIMAL(5,2),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  connection_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'ux', 'performance')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  description TEXT,
  page_url TEXT,
  browser_info JSONB,
  device_info JSONB,
  screenshots TEXT[],
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B Testing Table
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  variants JSONB NOT NULL,
  traffic_allocation JSONB NOT NULL,
  target_audience JSONB DEFAULT '{}',
  success_metrics TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  sample_size INTEGER DEFAULT 1000,
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B Test Participants Table
CREATE TABLE IF NOT EXISTS ab_test_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(test_id, user_id)
);

-- A/B Test Results Table
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4),
  sample_size INTEGER,
  conversion_rate DECIMAL(5,4),
  statistical_significance BOOLEAN DEFAULT false,
  confidence_interval JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_user_id ON user_navigation_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_media_company_id ON user_navigation_preferences(media_company_id);
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_favorite_companies_gin ON user_navigation_preferences USING GIN(favorite_companies);
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_recently_viewed_gin ON user_navigation_preferences USING GIN(recently_viewed_companies);

CREATE INDEX IF NOT EXISTS idx_navigation_analytics_user_id ON navigation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_media_company_id ON navigation_analytics(media_company_id);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_session_id ON navigation_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_page_path ON navigation_analytics(page_path);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_device_type ON navigation_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_created_at ON navigation_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_media_company_id ON performance_metrics(media_company_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_device_type ON performance_metrics(device_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_performance_score ON performance_metrics(performance_score);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_media_company_id ON user_feedback(media_company_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_priority ON user_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_tags_gin ON user_feedback USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_by ON ab_tests(created_by);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_at ON ab_tests(created_at);

CREATE INDEX IF NOT EXISTS idx_ab_test_participants_test_id ON ab_test_participants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_participants_user_id ON ab_test_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_participants_variant ON ab_test_participants(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_participants_converted ON ab_test_participants(converted);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON ab_test_results(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_metric_name ON ab_test_results(metric_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_calculated_at ON ab_test_results(calculated_at);

-- GIN Indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_browser_info_gin ON navigation_analytics USING GIN(browser_info);
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_device_info_gin ON navigation_analytics USING GIN(device_info);
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_quick_access_gin ON user_navigation_preferences USING GIN(quick_access_links);
CREATE INDEX IF NOT EXISTS idx_ab_tests_variants_gin ON ab_tests USING GIN(variants);
CREATE INDEX IF NOT EXISTS idx_ab_tests_traffic_allocation_gin ON ab_tests USING GIN(traffic_allocation);
CREATE INDEX IF NOT EXISTS idx_ab_tests_target_audience_gin ON ab_tests USING GIN(target_audience);

-- Functions for Navigation and Performance

-- Function to update user navigation preferences
CREATE OR REPLACE FUNCTION update_navigation_preferences(
  p_user_id UUID,
  p_media_company_id UUID,
  p_preferences JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_navigation_preferences (
    user_id,
    media_company_id,
    view_mode,
    default_dashboard,
    favorite_companies,
    recently_viewed_companies,
    navigation_order,
    quick_access_links,
    sidebar_collapsed,
    theme,
    language,
    timezone
  ) VALUES (
    p_user_id,
    p_media_company_id,
    COALESCE(p_preferences->>'view_mode', 'grid'),
    COALESCE(p_preferences->>'default_dashboard', 'overview'),
    COALESCE((p_preferences->'favorite_companies')::uuid[], '{}'),
    COALESCE((p_preferences->'recently_viewed_companies')::uuid[], '{}'),
    COALESCE((p_preferences->'navigation_order')::text[], '{}'),
    COALESCE(p_preferences->'quick_access_links', '{}'),
    COALESCE((p_preferences->>'sidebar_collapsed')::boolean, false),
    COALESCE(p_preferences->>'theme', 'light'),
    COALESCE(p_preferences->>'language', 'en'),
    COALESCE(p_preferences->>'timezone', 'UTC')
  )
  ON CONFLICT (user_id, media_company_id) DO UPDATE SET
    view_mode = EXCLUDED.view_mode,
    default_dashboard = EXCLUDED.default_dashboard,
    favorite_companies = EXCLUDED.favorite_companies,
    recently_viewed_companies = EXCLUDED.recently_viewed_companies,
    navigation_order = EXCLUDED.navigation_order,
    quick_access_links = EXCLUDED.quick_access_links,
    sidebar_collapsed = EXCLUDED.sidebar_collapsed,
    theme = EXCLUDED.theme,
    language = EXCLUDED.language,
    timezone = EXCLUDED.timezone,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track navigation analytics
CREATE OR REPLACE FUNCTION track_navigation_analytics(
  p_user_id UUID,
  p_media_company_id UUID,
  p_session_id UUID,
  p_page_path TEXT,
  p_page_title TEXT DEFAULT NULL,
  p_referrer_path TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL,
  p_performance_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO navigation_analytics (
    user_id,
    media_company_id,
    session_id,
    page_path,
    page_title,
    referrer_path,
    user_agent,
    ip_address,
    device_type,
    screen_resolution,
    viewport_size,
    load_time_ms,
    interaction_time_ms,
    is_pwa,
    is_offline,
    connection_type,
    battery_level
  ) VALUES (
    p_user_id,
    p_media_company_id,
    p_session_id,
    p_page_path,
    p_page_title,
    p_referrer_path,
    COALESCE(p_device_info->>'user_agent', NULL),
    (p_device_info->>'ip_address')::inet,
    COALESCE(p_device_info->>'device_type', NULL),
    COALESCE(p_device_info->>'screen_resolution', NULL),
    COALESCE(p_device_info->>'viewport_size', NULL),
    COALESCE((p_performance_data->>'load_time_ms')::integer, NULL),
    COALESCE((p_performance_data->>'interaction_time_ms')::integer, NULL),
    COALESCE((p_device_info->>'is_pwa')::boolean, false),
    COALESCE((p_device_info->>'is_offline')::boolean, false),
    COALESCE(p_device_info->>'connection_type', NULL),
    COALESCE((p_device_info->>'battery_level')::decimal, NULL)
  )
  RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metrics(
  p_user_id UUID,
  p_media_company_id UUID,
  p_session_id UUID,
  p_metrics JSONB
)
RETURNS UUID AS $$
DECLARE
  v_metrics_id UUID;
BEGIN
  INSERT INTO performance_metrics (
    user_id,
    media_company_id,
    session_id,
    load_time_ms,
    first_contentful_paint_ms,
    largest_contentful_paint_ms,
    cumulative_layout_shift,
    first_input_delay_ms,
    time_to_interactive_ms,
    memory_usage_mb,
    network_requests,
    cache_hit_rate,
    bundle_size_kb,
    image_optimization_rate,
    performance_score,
    device_type,
    connection_type
  ) VALUES (
    p_user_id,
    p_media_company_id,
    p_session_id,
    COALESCE((p_metrics->>'load_time_ms')::integer, NULL),
    COALESCE((p_metrics->>'first_contentful_paint_ms')::integer, NULL),
    COALESCE((p_metrics->>'largest_contentful_paint_ms')::integer, NULL),
    COALESCE((p_metrics->>'cumulative_layout_shift')::decimal, NULL),
    COALESCE((p_metrics->>'first_input_delay_ms')::integer, NULL),
    COALESCE((p_metrics->>'time_to_interactive_ms')::integer, NULL),
    COALESCE((p_metrics->>'memory_usage_mb')::integer, NULL),
    COALESCE((p_metrics->>'network_requests')::integer, NULL),
    COALESCE((p_metrics->>'cache_hit_rate')::decimal, NULL),
    COALESCE((p_metrics->>'bundle_size_kb')::integer, NULL),
    COALESCE((p_metrics->>'image_optimization_rate')::decimal, NULL),
    COALESCE((p_metrics->>'performance_score')::integer, NULL),
    COALESCE(p_metrics->>'device_type', NULL),
    COALESCE(p_metrics->>'connection_type', NULL)
  )
  RETURNING id INTO v_metrics_id;
  
  RETURN v_metrics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user navigation analytics
CREATE OR REPLACE FUNCTION get_user_navigation_analytics(
  p_user_id UUID,
  p_media_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_page_views BIGINT,
  unique_pages_visited BIGINT,
  avg_time_on_page_ms INTEGER,
  total_interactions BIGINT,
  device_distribution JSONB,
  performance_metrics JSONB,
  most_visited_pages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_page_views,
    COUNT(DISTINCT page_path) as unique_pages_visited,
    ROUND(AVG(time_on_page_ms))::INTEGER as avg_time_on_page_ms,
    SUM(clicks + key_presses + touch_gestures) as total_interactions,
    jsonb_build_object(
      'mobile', COUNT(*) FILTER (WHERE device_type = 'mobile'),
      'tablet', COUNT(*) FILTER (WHERE device_type = 'tablet'),
      'desktop', COUNT(*) FILTER (WHERE device_type = 'desktop')
    ) as device_distribution,
    jsonb_build_object(
      'avg_load_time', ROUND(AVG(load_time_ms))::INTEGER,
      'avg_interaction_time', ROUND(AVG(interaction_time_ms))::INTEGER,
      'performance_score', ROUND(AVG(performance_score))::INTEGER
    ) as performance_metrics,
    jsonb_agg(
      jsonb_build_object(
        'page_path', page_path,
        'page_title', page_title,
        'visits', COUNT(*),
        'avg_time', ROUND(AVG(time_on_page_ms))::INTEGER
      ) ORDER BY COUNT(*) DESC LIMIT 10
    ) FILTER (WHERE page_path IS NOT NULL) as most_visited_pages
  FROM navigation_analytics
  WHERE user_id = p_user_id
    AND media_company_id = p_media_company_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign A/B test variant
CREATE OR REPLACE FUNCTION assign_ab_test_variant(
  p_user_id UUID,
  p_test_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_test RECORD;
  v_existing_variant TEXT;
  v_random_number DECIMAL;
  v_cumulative_allocation DECIMAL := 0;
  v_assigned_variant TEXT;
BEGIN
  -- Check if user is already assigned
  SELECT variant INTO v_existing_variant
  FROM ab_test_participants
  WHERE test_id = p_test_id AND user_id = p_user_id;
  
  IF v_existing_variant IS NOT NULL THEN
    RETURN v_existing_variant;
  END IF;
  
  -- Get test details
  SELECT * INTO v_test
  FROM ab_tests
  WHERE id = p_test_id AND status = 'running';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found or not running';
  END IF;
  
  -- Assign variant based on traffic allocation
  v_random_number := RANDOM();
  
  FOR variant IN SELECT jsonb_object_keys(v_test.variants)
  LOOP
    v_cumulative_allocation := v_cumulative_allocation + 
      COALESCE((v_test.traffic_allocation->>variant)::decimal, 0);
    
    IF v_random_number <= v_cumulative_allocation THEN
      v_assigned_variant := variant;
      EXIT;
    END IF;
  END LOOP;
  
  -- If no variant assigned (shouldn't happen), use first variant
  IF v_assigned_variant IS NULL THEN
    v_assigned_variant := jsonb_object_keys(v_test.variants)->0;
  END IF;
  
  -- Record assignment
  INSERT INTO ab_test_participants (
    test_id,
    user_id,
    variant,
    assigned_at
  ) VALUES (
    p_test_id,
    p_user_id,
    v_assigned_variant,
    NOW()
  );
  
  RETURN v_assigned_variant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE user_navigation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "User navigation preferences access" ON user_navigation_preferences
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Navigation analytics access" ON navigation_analytics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Performance metrics access" ON performance_metrics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "User feedback access" ON user_feedback
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "A/B test participants access" ON ab_test_participants
FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_navigation_preferences TO authenticated;
GRANT SELECT, INSERT ON navigation_analytics TO authenticated;
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_feedback TO authenticated;
GRANT SELECT ON ab_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ab_test_participants TO authenticated;
GRANT SELECT ON ab_test_results TO authenticated;

GRANT EXECUTE ON FUNCTION update_navigation_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION track_navigation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION record_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_navigation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION assign_ab_test_variant TO authenticated;

-- Insert default A/B test examples
INSERT INTO ab_tests (id, name, description, hypothesis, variants, traffic_allocation, success_metrics, status) VALUES
  (
    gen_random_uuid(),
    'Navigation Layout Test',
    'Test grid vs list view for company navigation',
    'Grid view will improve user engagement by 15%',
    '{"grid": {"layout": "grid", "items_per_row": 2}, "list": {"layout": "list", "show_descriptions": true}}',
    '{"grid": 0.5, "list": 0.5}',
    ARRAY['engagement_time', 'click_through_rate', 'user_satisfaction'],
    'draft'
  ),
  (
    gen_random_uuid(),
    'Dashboard Layout Optimization',
    'Test different dashboard layouts for better user experience',
    'Compact layout will reduce time to first action by 20%',
    '{"standard": {"layout": "standard", "widget_count": 6}, "compact": {"layout": "compact", "widget_count": 4}, "detailed": {"layout": "detailed", "widget_count": 8}}',
    '{"standard": 0.4, "compact": 0.4, "detailed": 0.2}',
    ARRAY['time_to_first_action', 'task_completion_rate', 'user_satisfaction'],
    'draft'
  )
ON CONFLICT DO NOTHING;
