-- Multi-Company Automation Rules System for Enterprise Media Companies
-- Enables cross-company workflow automation and intelligent rule processing

-- Automation rules definition
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_company_id UUID NOT NULL REFERENCES media_companies(id) ON DELETE CASCADE,
    
    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('content_approval', 'publishing', 'team_assignment', 'escalation', 'performance_alert', 'compliance_check')),
    
    -- Trigger conditions
    trigger_conditions JSONB DEFAULT '{}',
    trigger_events TEXT[] DEFAULT '{}',
    
    -- Rule configuration
    rule_config JSONB DEFAULT '{}',
    action_config JSONB DEFAULT '{}',
    
    -- Rule state
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Execution tracking
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    last_execution_status TEXT,
    last_execution_result JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT automation_rules_unique_name UNIQUE(media_company_id, name)
);

-- Rule execution history
CREATE TABLE IF NOT EXISTS automation_rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Execution details
    execution_id TEXT DEFAULT gen_random_uuid()::TEXT,
    trigger_event JSONB,
    trigger_context JSONB DEFAULT '{}',
    
    -- Execution state
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    execution_duration_ms INTEGER,
    
    -- Results
    result JSONB DEFAULT '{}',
    error_message TEXT,
    affected_entities UUID[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rule conditions and actions
CREATE TABLE IF NOT EXISTS automation_rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Condition definition
    condition_type TEXT NOT NULL CHECK (condition_type IN ('entity_type', 'property_value', 'performance_metric', 'time_based', 'event_based')),
    condition_operator TEXT NOT NULL CHECK (condition_operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in', 'between')),
    condition_value JSONB,
    
    -- Logic
    logical_operator TEXT DEFAULT 'and' CHECK (logical_operator IN ('and', 'or')),
    condition_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_rule_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Action definition
    action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject', 'assign', 'escalate', 'notify', 'publish', 'schedule', 'update_property', 'create_task')),
    action_config JSONB DEFAULT '{}',
    
    -- Execution order
    action_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rule templates for common automation patterns
CREATE TABLE IF NOT EXISTS automation_rule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template definition
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('content_approval', 'team_management', 'performance_monitoring', 'compliance_automation')),
    
    -- Template content
    template_config JSONB DEFAULT '{}',
    default_conditions JSONB DEFAULT '{}',
    default_actions JSONB DEFAULT '{}',
    
    -- Template metadata
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT automation_rule_templates_unique_name UNIQUE(name, template_type)
);

-- Performance indexes for automation rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_media_company ON automation_rules(media_company_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_type_active ON automation_rules(rule_type, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON automation_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_last_executed ON automation_rules(last_executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_rule_executions_rule ON automation_rule_executions(rule_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rule_executions_status ON automation_rule_executions(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_rule_conditions_rule ON automation_rule_conditions(rule_id, condition_order);
CREATE INDEX IF NOT EXISTS idx_automation_rule_actions_rule ON automation_rule_actions(rule_id, action_order);

CREATE INDEX IF NOT EXISTS idx_automation_rule_templates_type ON automation_rule_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_automation_rule_templates_usage ON automation_rule_templates(usage_count DESC);

-- RLS Policies for automation rules
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rule_templates ENABLE ROW LEVEL SECURITY;

-- Automation rules RLS
CREATE POLICY "Users can view automation rules for their media companies" ON automation_rules
FOR SELECT USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Users can create automation rules for their media companies" ON automation_rules
FOR INSERT WITH CHECK (
    media_company_id = ANY(session_media_companies())
    AND current_setting('app.max_access_level', true)::INTEGER >= 3
);

CREATE POLICY "Users can update automation rules for their media companies" ON automation_rules
FOR UPDATE USING (
    media_company_id = ANY(session_media_companies())
);

CREATE POLICY "Service role full access to automation rules" ON automation_rules
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Automation rule executions RLS
CREATE POLICY "Users can view executions for their automation rules" ON automation_rule_executions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM automation_rules ar
        WHERE ar.id = automation_rule_executions.rule_id
        AND ar.media_company_id = ANY(session_media_companies())
    )
);

CREATE POLICY "Service role full access to rule executions" ON automation_rule_executions
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Automation rule conditions and actions RLS
CREATE POLICY "Users can view conditions for their automation rules" ON automation_rule_conditions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM automation_rules ar
        WHERE ar.id = automation_rule_conditions.rule_id
        AND ar.media_company_id = ANY(session_media_companies())
    )
);

CREATE POLICY "Service role full access to rule conditions" ON automation_rule_conditions
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

CREATE POLICY "Users can view actions for their automation rules" ON automation_rule_actions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM automation_rules ar
        WHERE ar.id = automation_rule_actions.rule_id
        AND ar.media_company_id = ANY(session_media_companies())
    )
);

CREATE POLICY "Service role full access to rule actions" ON automation_rule_actions
FOR ALL USING (
    current_setting('app.current_user_role', true) = 'service_role'
);

-- Automation rule templates RLS
CREATE POLICY "Users can view automation rule templates" ON automation_rule_templates
FOR SELECT USING (
    is_system_template = true
    OR created_by = current_setting('app.current_user_id', true)::UUID
);

CREATE POLICY "Admins can create automation rule templates" ON automation_rule_templates
FOR INSERT WITH CHECK (
    is_system_template = false
    AND created_by = current_setting('app.current_user_id', true)::UUID
);

CREATE POLICY "Users can update their own templates" ON automation_rule_templates
FOR UPDATE USING (
    created_by = current_setting('app.current_user_id', true)::UUID
);

-- Functions for automation rules

-- Function to create automation rule
CREATE OR REPLACE FUNCTION create_automation_rule(
    _media_company_id UUID,
    _name TEXT,
    _description TEXT DEFAULT NULL,
    _rule_type TEXT,
    _trigger_conditions JSONB DEFAULT '{}',
    _trigger_events TEXT[] DEFAULT '{}',
    _rule_config JSONB DEFAULT '{}',
    _action_config JSONB DEFAULT '{}',
    _priority INTEGER DEFAULT 5,
    _created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule_id UUID;
BEGIN
    -- Validate user has access to media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = _created_by
        AND _media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this media company';
    END IF;
    
    -- Validate user has admin access
    IF current_setting('app.max_access_level', true)::INTEGER < 3 THEN
        RAISE EXCEPTION 'User does not have permission to create automation rules';
    END IF;
    
    -- Insert automation rule
    INSERT INTO automation_rules (
        media_company_id,
        name,
        description,
        rule_type,
        trigger_conditions,
        trigger_events,
        rule_config,
        action_config,
        priority,
        created_by
    ) VALUES (
        _media_company_id,
        _name,
        _description,
        _rule_type,
        _trigger_conditions,
        _trigger_events,
        _rule_config,
        _action_config,
        _priority,
        _created_by
    ) RETURNING id INTO v_rule_id;
    
    -- Create default conditions and actions if provided
    IF _trigger_conditions IS NOT NULL THEN
        INSERT INTO automation_rule_conditions (rule_id, condition_type, condition_operator, condition_value)
        SELECT v_rule_id, key, value
        FROM jsonb_each_text(_trigger_conditions) AS t(key, value);
    END IF;
    
    RETURN v_rule_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create automation rule: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Function to execute automation rule
CREATE OR REPLACE FUNCTION execute_automation_rule(
    _rule_id UUID,
    _trigger_event JSONB DEFAULT '{}',
    _trigger_context JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_execution_id UUID;
    v_rule_record RECORD;
    v_execution_start TIMESTAMPTZ := clock_timestamp();
    v_execution_result JSONB := '{}';
    v_affected_entities UUID[] := '{}';
    v_status TEXT := 'completed';
BEGIN
    -- Get rule details
    SELECT * INTO v_rule_record
    FROM automation_rules
    WHERE id = _rule_id
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Automation rule not found or inactive';
    END IF;
    
    -- Validate user has access to rule's media company
    IF NOT EXISTS (
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = current_setting('app.current_user_id', true)::UUID
        AND v_rule_record.media_company_id = ANY(up.media_companies)
    ) THEN
        RAISE EXCEPTION 'User does not have access to this automation rule';
    END IF;
    
    -- Create execution record
    INSERT INTO automation_rule_executions (
        rule_id,
        execution_id,
        trigger_event,
        trigger_context,
        status,
        started_at
    ) VALUES (
        _rule_id,
        gen_random_uuid()::TEXT,
        _trigger_event,
        _trigger_context,
        'running',
        v_execution_start
    ) RETURNING id INTO v_execution_id;
    
    -- Execute rule logic (simplified - would be expanded based on rule type)
    BEGIN
        -- Update rule execution count and timestamp
        UPDATE automation_rules
        SET 
            execution_count = execution_count + 1,
            last_executed_at = v_execution_start,
            last_execution_status = v_status,
            last_execution_result = v_execution_result
        WHERE id = _rule_id;
        
        -- Simulate rule execution based on type
        CASE v_rule_record.rule_type
            WHEN 'content_approval' THEN
                v_execution_result := jsonb_build_object(
                    'action', 'content_approved',
                    'entities_processed', jsonb_array_length(_affected_entities),
                    'execution_time', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start))
                );
                
            WHEN 'publishing' THEN
                v_execution_result := jsonb_build_object(
                    'action', 'content_published',
                    'entities_processed', jsonb_array_length(_affected_entities),
                    'execution_time', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start))
                );
                
            WHEN 'team_assignment' THEN
                v_execution_result := jsonb_build_object(
                    'action', 'team_assigned',
                    'entities_processed', jsonb_array_length(_affected_entities),
                    'execution_time', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start))
                );
                
            ELSE
                v_execution_result := jsonb_build_object(
                    'action', 'rule_executed',
                    'entities_processed', jsonb_array_length(_affected_entities),
                    'execution_time', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start))
                );
        END CASE;
        
    END;
    
    -- Update execution record
    UPDATE automation_rule_executions
    SET 
        status = v_status,
        completed_at = clock_timestamp(),
        execution_duration_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start)),
        result = v_execution_result,
        affected_entities = v_affected_entities
    WHERE id = v_execution_id;
    
    RETURN v_execution_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Update execution record with error
        UPDATE automation_rule_executions
        SET 
            status = 'failed',
            completed_at = clock_timestamp(),
            execution_duration_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - v_execution_start)),
            error_message = SQLERRM
        WHERE id = v_execution_id;
        
        RAISE NOTICE 'Failed to execute automation rule: %', SQLERRM;
        RETURN v_execution_id;
END;
$$;

-- Function to get automation rules for media company
CREATE OR REPLACE FUNCTION get_automation_rules(
    _media_company_id UUID,
    _rule_type TEXT DEFAULT NULL,
    _is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    rule_type TEXT,
    trigger_conditions JSONB,
    trigger_events TEXT[],
    rule_config JSONB,
    action_config JSONB,
    is_active BOOLEAN,
    priority INTEGER,
    execution_count INTEGER,
    last_executed_at TIMESTAMPTZ,
    last_execution_status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    ar.id,
    ar.name,
    ar.description,
    ar.rule_type,
    ar.trigger_conditions,
    ar.trigger_events,
    ar.rule_config,
    ar.action_config,
    ar.is_active,
    ar.priority,
    ar.execution_count,
    ar.last_executed_at,
    ar.last_execution_status,
    ar.created_at
FROM automation_rules ar
WHERE 
    ar.media_company_id = _media_company_id
    AND (_rule_type IS NULL OR ar.rule_type = _rule_type)
    AND (_is_active IS NULL OR ar.is_active = _is_active)
ORDER BY ar.priority DESC, ar.created_at DESC;
$$;

-- Function to get automation rule execution history
CREATE OR REPLACE FUNCTION get_automation_rule_executions(
    _rule_id UUID,
    _limit INTEGER DEFAULT 50,
    _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    execution_id TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_duration_ms INTEGER,
    result JSONB,
    error_message TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    are.id,
    are.execution_id,
    are.status,
    are.started_at,
    are.completed_at,
    are.execution_duration_ms,
    are.result,
    are.error_message
FROM automation_rule_executions are
WHERE are.rule_id = _rule_id
ORDER BY are.started_at DESC
LIMIT _limit
OFFSET _offset;
$$;

-- Function to create automation rule from template
CREATE OR REPLACE FUNCTION create_automation_rule_from_template(
    _template_id UUID,
    _media_company_id UUID,
    _name TEXT,
    _custom_config JSONB DEFAULT '{}',
    _created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_record RECORD;
    v_rule_id UUID;
    v_rule_config JSONB;
    v_trigger_conditions JSONB;
    v_action_config JSONB;
BEGIN
    -- Get template details
    SELECT * INTO v_template_record
    FROM automation_rule_templates
    WHERE id = _template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Validate user has admin access
    IF current_setting('app.max_access_level', true)::INTEGER < 3 THEN
        RAISE EXCEPTION 'User does not have permission to create automation rules';
    END IF;
    
    -- Merge template config with custom config
    v_rule_config := v_template_record.template_config || _custom_config;
    v_trigger_conditions := v_template_record.default_conditions;
    v_action_config := v_template_record.default_actions;
    
    -- Create automation rule
    INSERT INTO automation_rules (
        media_company_id,
        name,
        description,
        rule_type,
        trigger_conditions,
        rule_config,
        action_config,
        priority,
        created_by
    ) VALUES (
        _media_company_id,
        _name,
        v_template_record.description,
        v_template_record.template_type,
        v_trigger_conditions,
        v_rule_config,
        v_action_config,
        5,
        _created_by
    ) RETURNING id INTO v_rule_id;
    
    -- Update template usage count
    UPDATE automation_rule_templates
    SET usage_count = usage_count + 1
    WHERE id = _template_id;
    
    RETURN v_rule_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create automation rule from template: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_automation_rule(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[], JSONB, JSONB, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_automation_rule(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_rules(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_rule_executions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_automation_rule_from_template(UUID, UUID, TEXT, JSONB, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE automation_rules IS 'Multi-company automation rules for workflow automation';
COMMENT ON TABLE automation_rule_executions IS 'Execution history for automation rules with detailed tracking';
COMMENT ON TABLE automation_rule_conditions IS 'Conditions for automation rule triggers';
COMMENT ON TABLE automation_rule_actions IS 'Actions to be executed by automation rules';
COMMENT ON TABLE automation_rule_templates IS 'Reusable templates for common automation patterns';

COMMENT ON FUNCTION create_automation_rule(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[], JSONB, JSONB, INTEGER, UUID) IS 'Create new automation rule with conditions and actions';
COMMENT ON FUNCTION execute_automation_rule(UUID, JSONB, JSONB) IS 'Execute automation rule with tracking and error handling';
COMMENT ON FUNCTION get_automation_rules(UUID, TEXT, BOOLEAN) IS 'Retrieve automation rules for media company with filtering';
COMMENT ON FUNCTION get_automation_rule_executions(UUID, INTEGER, INTEGER) IS 'Get execution history for automation rule';
COMMENT ON FUNCTION create_automation_rule_from_template(UUID, UUID, TEXT, JSONB, UUID) IS 'Create automation rule from template with customization';
