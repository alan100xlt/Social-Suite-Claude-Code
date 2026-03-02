import { notificationService } from '../notifications/NotificationService'
import { securityContextService } from '../security/SecurityContextService'

export interface AutomationRule {
  id: string
  mediaCompanyId: string
  name: string
  description?: string
  ruleType: 'content_approval' | 'publishing' | 'team_assignment' | 'escalation' | 'performance_alert' | 'compliance_check'
  triggerConditions: Record<string, any>
  triggerEvents: string[]
  ruleConfig: Record<string, any>
  actionConfig: Record<string, any>
  isActive: boolean
  priority: number
  executionCount: number
  lastExecutedAt?: string
  lastExecutionStatus?: string
  createdAt: string
}

export interface AutomationRuleExecution {
  id: string
  ruleId: string
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  executionDurationMs?: number
  result?: Record<string, any>
  errorMessage?: string
  affectedEntities?: string[]
}

export interface AutomationRuleTemplate {
  id: string
  name: string
  description?: string
  templateType: 'content_approval' | 'team_management' | 'performance_monitoring' | 'compliance_automation'
  templateConfig: Record<string, any>
  defaultConditions: Record<string, any>
  defaultActions: Record<string, any>
  isSystemTemplate: boolean
  usageCount: number
  createdAt: string
}

export class AutomationService {
  private supabase: any

  constructor() {
    // Initialize Supabase client
    const { supabase } = require('@/integrations/supabase/client')
    this.supabase = supabase
  }

  /**
   * Create automation rule
   */
  async createAutomationRule(
    userId: string,
    mediaCompanyId: string,
    name: string,
    description?: string,
    ruleType: AutomationRule['ruleType'],
    triggerConditions: Record<string, any>,
    triggerEvents: string[],
    ruleConfig: Record<string, any>,
    actionConfig: Record<string, any>,
    priority: number = 5
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_automation_rule', {
        _media_company_id: mediaCompanyId,
        _name: name,
        _description: description || null,
        _rule_type: ruleType,
        _trigger_conditions: triggerConditions,
        _trigger_events: triggerEvents,
        _rule_config: ruleConfig,
        _action_config: actionConfig,
        _priority: priority,
        _created_by: userId
      })

      if (error) {
        throw new Error(`Failed to create automation rule: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Automation Rule Created',
        `Created "${name}" automation rule for ${ruleType}`,
        [`Rule ID: ${data}`, `Type: ${ruleType}`, `Priority: ${priority}`]
      )

      return data
    } catch (error) {
      console.error('AutomationService.createAutomationRule error:', error)
      await notificationService.sendErrorNotification(
        'Automation Rule Creation Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}, Rule: ${name}`
      )
      return null
    }
  }

  /**
   * Execute automation rule
   */
  async executeAutomationRule(
    userId: string,
    ruleId: string,
    triggerEvent: Record<string, any> = {},
    triggerContext: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('execute_automation_rule', {
        _rule_id: ruleId,
        _trigger_event: triggerEvent,
        _trigger_context: triggerContext
      })

      if (error) {
        throw new Error(`Failed to execute automation rule: ${error.message}`)
      }

      const execution = data as AutomationRuleExecution
      
      await notificationService.sendMilestoneNotification(
        'Automation Rule Executed',
        `Executed automation rule with status: ${execution.status}`,
        [`Rule ID: ${ruleId}`, `Status: ${execution.status}`, `Duration: ${execution.executionDurationMs}ms`]
      )

      return data
    } catch (error) {
      console.error('AutomationService.executeAutomationRule error:', error)
      await notificationService.sendErrorNotification(
        'Automation Rule Execution Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Rule ID: ${ruleId}`
      )
      return null
    }
  }

  /**
   * Get automation rules for media company
   */
  async getAutomationRules(
    userId: string,
    mediaCompanyId: string,
    ruleType?: AutomationRule['ruleType'],
    isActive?: boolean
  ): Promise<AutomationRule[]> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      const { data, error } = await this.supabase.rpc('get_automation_rules', {
        _media_company_id: mediaCompanyId,
        _rule_type: ruleType || null,
        _is_active: isActive !== undefined ? isActive : null
      })

      if (error) {
        throw new Error(`Failed to get automation rules: ${error.message}`)
      }

      return data as AutomationRule[]
    } catch (error) {
      console.error('AutomationService.getAutomationRules error:', error)
      await notificationService.sendErrorNotification(
        'Failed to Get Automation Rules',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}`
      )
      return []
    }
  }

  /**
   * Get automation rule execution history
   */
  async getAutomationRuleExecutions(
    userId: string,
    ruleId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AutomationRuleExecution[]> {
    try {
      // Verify user has access to rule
      const rules = await this.getAutomationRules(userId, '', undefined, true)
      const hasAccess = rules.some(rule => rule.id === ruleId)
      if (!hasAccess) {
        throw new Error('User does not have access to this automation rule')
      }

      const { data, error } = await this.supabase.rpc('get_automation_rule_executions', {
        _rule_id: ruleId,
        _limit: limit,
        _offset: offset
      })

      if (error) {
        throw new Error(`Failed to get rule executions: ${error.message}`)
      }

      return data as AutomationRuleExecution[]
    } catch (error) {
      console.error('AutomationService.getAutomationRuleExecutions error:', error)
      await notificationService.sendErrorNotification(
        'Failed to Get Rule Executions',
        error instanceof Error ? error.message : 'Unknown error',
        `Rule ID: ${ruleId}`
      )
      return []
    }
  }

  /**
   * Create automation rule from template
   */
  async createAutomationRuleFromTemplate(
    userId: string,
    templateId: string,
    mediaCompanyId: string,
    name: string,
    customConfig: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_automation_rule_from_template', {
        _template_id: templateId,
        _media_company_id: mediaCompanyId,
        _name: name,
        _custom_config: customConfig,
        _created_by: userId
      })

      if (error) {
        throw new Error(`Failed to create automation rule from template: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Automation Rule Created from Template',
        `Created "${name}" from template`,
        [`Rule ID: ${data}`, `Template ID: ${templateId}`, `Customizations: ${Object.keys(customConfig).length}`]
      )

      return data
    } catch (error) {
      console.error('AutomationService.createAutomationRuleFromTemplate error:', error)
      await notificationService.sendErrorNotification(
        'Template Rule Creation Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Template ID: ${templateId}, Name: ${name}`
      )
      return null
    }
  }

  /**
   * Get automation rule templates
   */
  async getAutomationRuleTemplates(
    userId: string,
    templateType?: AutomationRuleTemplate['templateType']
  ): Promise<AutomationRuleTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('automation_rule_templates')
        .select('*')
        .or('template_type', templateType ? `eq.${templateType}` : undefined)
        .or('created_by', 'eq.' + userId)
        .or('is_system_template', 'eq.true')
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get automation rule templates: ${error.message}`)
      }

      return data as AutomationRuleTemplate[]
    } catch (error) {
      console.error('AutomationService.getAutomationRuleTemplates error:', error)
      await notificationService.sendErrorNotification(
        'Failed to Get Automation Templates',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return []
    }
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(
    userId: string,
    ruleId: string,
    updates: Partial<AutomationRule>
  ): Promise<boolean> {
    try {
      // Verify user has access to rule
      const rules = await this.getAutomationRules(userId, '', undefined, true)
      const hasAccess = rules.some(rule => rule.id === ruleId)
      if (!hasAccess) {
        throw new Error('User does not have access to this automation rule')
      }

      const { data, error } = await this.supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()

      if (error) {
        throw new Error(`Failed to update automation rule: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Automation Rule Updated',
        `Updated automation rule: ${updates.name || ruleId}`,
        Object.keys(updates).map(key => `${key}: ${JSON.stringify(updates[key as any])}`)
      )

      return true
    } catch (error) {
      console.error('AutomationService.updateAutomationRule error:', error)
      await notificationService.sendErrorNotification(
        'Automation Rule Update Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Rule ID: ${ruleId}`
      )
      return false
    }
  }

  /**
   * Delete automation rule
   */
  async deleteAutomationRule(
    userId: string,
    ruleId: string
  ): Promise<boolean> {
    try {
      // Verify user has access to rule
      const rules = await this.getAutomationRules(userId, '', undefined, true)
      const hasAccess = rules.some(rule => rule.id === ruleId)
      if (!hasAccess) {
        throw new Error('User does not have access to this automation rule')
      }

      const { data, error } = await this.supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId)

      if (error) {
        throw new Error(`Failed to delete automation rule: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Automation Rule Deleted',
        `Deleted automation rule: ${ruleId}`,
        [`Rule ID: ${ruleId}`]
      )

      return true
    } catch (error) {
      console.error('AutomationService.deleteAutomationRule error:', error)
      await notificationService.sendErrorNotification(
        'Automation Rule Deletion Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Rule ID: ${ruleId}`
      )
      return false
    }
  }

  /**
   * Toggle automation rule active status
   */
  async toggleAutomationRule(
    userId: string,
    ruleId: string,
    isActive: boolean
  ): Promise<boolean> {
    try {
      // Verify user has access to rule
      const rules = await this.getAutomationRules(userId, '', undefined, true)
      const hasAccess = rules.some(rule => rule.id === ruleId)
      if (!hasAccess) {
        throw new Error('User does not have access to this automation rule')
      }

      const { data, error } = await this.supabase
        .from('automation_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId)
        .select()

      if (error) {
        throw new Error(`Failed to toggle automation rule: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Automation Rule Status Changed',
        `${isActive ? 'Activated' : 'Deactivated'} automation rule: ${ruleId}`,
        [`Rule ID: ${ruleId}`, `New Status: ${isActive ? 'Active' : 'Inactive'}`]
      )

      return true
    } catch (error) {
      console.error('AutomationService.toggleAutomationRule error:', error)
      await notificationService.sendErrorNotification(
        'Automation Rule Toggle Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Rule ID: ${ruleId}`
      )
      return false
    }
  }

  /**
   * Get automation statistics
   */
  async getAutomationStatistics(
    userId: string,
    mediaCompanyId: string
  ): Promise<{
    totalRules: number
    activeRules: number
    totalExecutions: number
    successRate: number
    averageExecutionTime: number
  }> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      // Get rules and executions in parallel
      const [rulesResult, executionsResult] = await Promise.all([
        this.supabase
          .from('automation_rules')
          .select('id, is_active, execution_count')
          .eq('media_company_id', mediaCompanyId),
        this.supabase
          .from('automation_rule_executions')
          .select('status, execution_duration_ms')
          .eq('rule_id', (await this.getAutomationRules(userId, mediaCompanyId)).map(r => r.id))
      ])

      if (rulesResult.error || executionsResult.error) {
        throw new Error('Failed to get automation statistics')
      }

      const rules = rulesResult.data || []
      const executions = executionsResult.data || []

      const totalRules = rules.length
      const activeRules = rules.filter((rule: any) => rule.is_active).length
      const totalExecutions = executions.length
      const successfulExecutions = executions.filter((exec: any) => exec.status === 'completed').length
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
      const averageExecutionTime = executions.length > 0 
        ? executions.reduce((sum: number, exec: any) => sum + (exec.execution_duration_ms || 0), 0) / executions.length 
        : 0

      return {
        totalRules,
        activeRules,
        totalExecutions,
        successRate,
        averageExecutionTime
      }
    } catch (error) {
      console.error('AutomationService.getAutomationStatistics error:', error)
      await notificationService.sendErrorNotification(
        'Failed to Get Automation Statistics',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}`
      )
      return {
        totalRules: 0,
        activeRules: 0,
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0
      }
    }
  }
}

// Singleton instance
export const automationService = new AutomationService()
