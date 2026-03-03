// Stubbed — enterprise automation RPCs and tables do not exist yet.
// The existing automation_rules table works via direct queries in hooks/useAutomation.ts.
// This service was for enterprise-level media company automation which isn't built.

export interface AutomationRule {
  id: string
  mediaCompanyId: string
  name: string
  description?: string
  ruleType: string
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
  status: string
  startedAt: string
  completedAt?: string
  executionDurationMs?: number
  result?: Record<string, any>
  errorMessage?: string
}

export interface AutomationRuleTemplate {
  id: string
  name: string
  description?: string
  templateType: string
  templateConfig: Record<string, any>
  isSystemTemplate: boolean
  usageCount: number
  createdAt: string
}

const NOT_IMPLEMENTED = 'AutomationService: enterprise automation infrastructure not yet built'

export class AutomationService {
  async createAutomationRule(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async executeAutomationRule(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async getAutomationRules(..._args: any[]): Promise<AutomationRule[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async getAutomationRuleExecutions(..._args: any[]): Promise<AutomationRuleExecution[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async createAutomationRuleFromTemplate(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async getAutomationRuleTemplates(..._args: any[]): Promise<AutomationRuleTemplate[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async updateAutomationRule(..._args: any[]): Promise<boolean> {
    console.warn(NOT_IMPLEMENTED)
    return false
  }
  async deleteAutomationRule(..._args: any[]): Promise<boolean> {
    console.warn(NOT_IMPLEMENTED)
    return false
  }
  async toggleAutomationRule(..._args: any[]): Promise<boolean> {
    console.warn(NOT_IMPLEMENTED)
    return false
  }
  async getAutomationStatistics(..._args: any[]): Promise<{
    totalRules: number
    activeRules: number
    totalExecutions: number
    successRate: number
    averageExecutionTime: number
  }> {
    console.warn(NOT_IMPLEMENTED)
    return { totalRules: 0, activeRules: 0, totalExecutions: 0, successRate: 0, averageExecutionTime: 0 }
  }
}

export const automationService = new AutomationService()
