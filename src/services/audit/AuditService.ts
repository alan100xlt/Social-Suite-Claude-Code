import { notificationService } from '../notifications/NotificationService'
import { securityContextService } from '../security/SecurityContextService'

export interface AuditEntry {
  id: string
  entityType: 'user' | 'company' | 'media_company' | 'team' | 'team_member' | 'automation_rule' | 'automation_execution' | 'content' | 'asset' | 'permission' | 'role' | 'security_context'
  entityId: string
  entityName?: string
  actionType: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'assign' | 'unassign' | 'execute' | 'approve' | 'reject' | 'login' | 'logout' | 'access_granted' | 'access_denied' | 'permission_change' | 'role_change' | 'export' | 'import'
  actionDetails: Record<string, any>
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  mediaCompanyId?: string
  companyId?: string
  teamId?: string
  accessLevel?: number
  previousAccessLevel?: number
  permissionGranted?: boolean
  permissionDenied?: boolean
  actionTimestamp: string
  durationMs?: number
  timezone?: string
  country?: string
  city?: string
  success: boolean
  errorCode?: string
  errorMessage?: string
  affectedRows?: number
  source?: string
  clientVersion?: string
  correlationId?: string
  createdAt: string
}

export interface AuditSummary {
  id: string
  mediaCompanyId: string
  periodStart: string
  periodEnd: string
  summaryType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  totalActions: number
  uniqueUsers: number
  uniqueEntities: number
  errorCount: number
  successRate: number
  actionBreakdown: Record<string, any>
  entityBreakdown: Record<string, any>
  userBreakdown: Record<string, any>
  processingTimeMs?: number
  storageSizeBytes?: number
  createdAt: string
}

export interface AuditExport {
  id: string
  mediaCompanyId: string
  exportType: 'full' | 'filtered' | 'compliance' | 'security' | 'performance'
  exportFormat: 'json' | 'csv' | 'xml' | 'pdf'
  filters: Record<string, any>
  dateRangeStart?: string
  dateRangeEnd?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filePath?: string
  fileSizeBytes?: number
  downloadCount?: number
  requestedBy: string
  processedBy?: string
  createdAt: string
  completedAt?: string
}

export class AuditService {
  private supabase: any

  constructor() {
    // Initialize Supabase client
    const { supabase } = require('@/integrations/supabase/client')
    this.supabase = supabase
  }

  /**
   * Create audit trail entry
   */
  async createAuditEntry(
    userId: string,
    entityType: AuditEntry['entityType'],
    entityId: string,
    entityName?: string,
    actionType: AuditEntry['actionType'],
    actionDetails: Record<string, any> = {},
    mediaCompanyId?: string,
    companyId?: string,
    teamId?: string,
    accessLevel?: number,
    previousAccessLevel?: number,
    permissionGranted?: boolean,
    permissionDenied?: boolean,
    success: boolean = true,
    errorCode?: string,
    errorMessage?: string,
    affectedRows: number = 1,
    source: string = 'system',
    clientVersion?: string,
    correlationId?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_audit_entry', {
        _entity_type: entityType,
        _entity_id: entityId,
        _entity_name: entityName || null,
        _action_type: actionType,
        _action_details: actionDetails,
        _user_id: userId,
        _media_company_id: mediaCompanyId || null,
        _company_id: companyId || null,
        _team_id: teamId || null,
        _access_level: accessLevel || null,
        _previous_access_level: previousAccessLevel || null,
        _permission_granted: permissionGranted || false,
        _permission_denied: permissionDenied || false,
        _success: success,
        _error_code: errorCode || null,
        _error_message: errorMessage || null,
        _affected_rows: affectedRows,
        _source: source,
        _client_version: clientVersion || null,
        _correlation_id: correlationId || null
      })

      if (error) {
        throw new Error(`Failed to create audit entry: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('AuditService.createAuditEntry error:', error)
      return null
    }
  }

  /**
   * Get audit trail entries
   */
  async getAuditTrail(
    userId: string,
    mediaCompanyId?: string,
    entityType?: AuditEntry['entityType'],
    entityId?: string,
    actionType?: AuditEntry['actionType'],
    dateStart?: string,
    dateEnd?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditEntry[]> {
    try {
      // Verify user has access to media company if specified
      if (mediaCompanyId) {
        const securityContext = await securityContextService.getSecurityContext(userId)
        if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
          throw new Error('User does not have access to this media company')
        }
      }

      const { data, error } = await this.supabase.rpc('get_audit_trail', {
        _media_company_id: mediaCompanyId || null,
        _entity_type: entityType || null,
        _entity_id: entityId || null,
        _user_id: userId || null,
        _action_type: actionType || null,
        _date_start: dateStart || null,
        _date_end: dateEnd || null,
        _limit: limit,
        _offset: offset
      })

      if (error) {
        throw new Error(`Failed to get audit trail: ${error.message}`)
      }

      return data as AuditEntry[]
    } catch (error) {
      console.error('AuditService.getAuditTrail error:', error)
      return []
    }
  }

  /**
   * Create audit summary
   */
  async createAuditSummary(
    userId: string,
    mediaCompanyId: string,
    periodStart: string,
    periodEnd: string,
    summaryType: AuditSummary['summaryType'],
    totalActions: number = 0,
    uniqueUsers: number = 0,
    uniqueEntities: number = 0,
    errorCount: number = 0,
    actionBreakdown: Record<string, any> = {},
    entityBreakdown: Record<string, any> = {},
    userBreakdown: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      // Verify user has admin access
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      if (securityContext.maxAccessLevel < 3) {
        throw new Error('User does not have permission to create audit summaries')
      }

      const { data, error } = await this.supabase.rpc('create_audit_summary', {
        _media_company_id: mediaCompanyId,
        _period_start: periodStart,
        _period_end: periodEnd,
        _summary_type: summaryType,
        _total_actions: totalActions,
        _unique_users: uniqueUsers,
        _unique_entities: uniqueEntities,
        _error_count: errorCount,
        _action_breakdown: actionBreakdown,
        _entity_breakdown: entityBreakdown,
        _user_breakdown: userBreakdown
      })

      if (error) {
        throw new Error(`Failed to create audit summary: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Audit Summary Created',
        `Created ${summaryType} audit summary for ${periodStart} to ${periodEnd}`,
        [`Total Actions: ${totalActions}`, `Unique Users: ${uniqueUsers}`, `Success Rate: ${errorCount > 0 ? ((totalActions - errorCount) / totalActions * 100).toFixed(1) : '100'}%`]
      )

      return data
    } catch (error) {
      console.error('AuditService.createAuditSummary error:', error)
      await notificationService.sendErrorNotification(
        'Audit Summary Creation Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}, Summary Type: ${summaryType}`
      )
      return null
    }
  }

  /**
   * Export audit trail
   */
  async exportAuditTrail(
    userId: string,
    mediaCompanyId: string,
    exportType: AuditExport['exportType'],
    exportFormat: AuditExport['exportFormat'] = 'json',
    filters: Record<string, any> = {},
    dateRangeStart?: string,
    dateRangeEnd?: string
  ): Promise<string | null> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      const { data, error } = await this.supabase.rpc('export_audit_trail', {
        _media_company_id: mediaCompanyId,
        _export_type: exportType,
        _export_format: exportFormat,
        _filters: filters,
        _date_range_start: dateRangeStart || null,
        _date_range_end: dateRangeEnd || null,
        _requested_by: userId
      })

      if (error) {
        throw new Error(`Failed to export audit trail: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Audit Export Created',
        `Created ${exportType} audit export in ${exportFormat} format`,
        [`Export Type: ${exportType}`, `Format: ${exportFormat}`, `Media Company: ${mediaCompanyId}`]
      )

      return data
    } catch (error) {
      console.error('AuditService.exportAuditTrail error:', error)
      await notificationService.sendErrorNotification(
        'Audit Export Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Export Type: ${exportType}, Format: ${exportFormat}`
      )
      return null
    }
  }

  /**
   * Get audit summaries
   */
  async getAuditSummaries(
    userId: string,
    mediaCompanyId: string,
    summaryType?: AuditSummary['summaryType'],
    dateStart?: string,
    dateEnd?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditSummary[]> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      const { data, error } = await this.supabase
        .from('audit_trail_summaries')
        .select('*')
        .eq('media_company_id', mediaCompanyId)
        .if('summary_type', summaryType ? `eq.${summaryType}` : undefined)
        .if('period_start', dateStart ? `gte.${dateStart}` : undefined)
        .if('period_end', dateEnd ? `lte.${dateEnd}` : undefined)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, limit)

      if (error) {
        throw new Error(`Failed to get audit summaries: ${error.message}`)
      }

      return data as AuditSummary[]
    } catch (error) {
      console.error('AuditService.getAuditSummaries error:', error)
      return []
    }
  }

  /**
   * Get audit exports
   */
  async getAuditExports(
    userId: string,
    mediaCompanyId: string,
    exportType?: AuditExport['exportType'],
    status?: AuditExport['status'],
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditExport[]> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      const { data, error } = await this.supabase
        .from('audit_trail_exports')
        .select('*')
        .eq('media_company_id', mediaCompanyId)
        .if('export_type', exportType ? `eq.${exportType}` : undefined)
        .if('status', status ? `eq.${status}` : undefined)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, limit)

      if (error) {
        throw new Error(`Failed to get audit exports: ${error.message}`)
      }

      return data as AuditExport[]
    } catch (error) {
      console.error('AuditService.getAuditExports error:', error)
      return []
    }
  }

  /**
   * Cleanup old audit entries
   */
  async cleanupAuditTrail(
    userId: string,
    mediaCompanyId: string,
    retentionDays: number = 365
  ): Promise<number> {
    try {
      // Verify user has admin access
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      if (securityContext.maxAccessLevel < 3) {
        throw new Error('User does not have permission to cleanup audit trail')
      }

      const { data, error } = await this.supabase.rpc('cleanup_audit_trail', {
        _media_company_id: mediaCompanyId,
        _retention_days: retentionDays
      })

      if (error) {
        throw new Error(`Failed to cleanup audit trail: ${error.message}`)
      }

      await notificationService.sendMilestoneNotification(
        'Audit Trail Cleanup',
        `Cleaned up audit entries older than ${retentionDays} days`,
        [`Entries Deleted: ${data || 0}`, `Media Company: ${mediaCompanyId}`]
      )

      return data || 0
    } catch (error) {
      console.error('AuditService.cleanupAuditTrail error:', error)
      await notificationService.sendErrorNotification(
        'Audit Trail Cleanup Failed',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}`
      )
      return 0
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    userId: string,
    mediaCompanyId: string,
    dateStart?: string,
    dateEnd?: string
  ): Promise<{
    totalEntries: number
    uniqueUsers: number
    uniqueEntities: number
    errorRate: number
    topActionTypes: Array<{type: string, count: number}>
    topEntities: Array<{type: string, name: string, count: number}>
  }> {
    try {
      // Verify user has access to media company
      const securityContext = await securityContextService.getSecurityContext(userId)
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      // Get audit trail with date range
      const { data: auditData, error: auditError } = await this.getAuditTrail(
        userId,
        mediaCompanyId,
        undefined,
        undefined,
        undefined,
        dateStart,
        dateEnd,
        1000, // Get more for statistics
        0
      )

      if (auditError) {
        throw new Error('Failed to get audit trail for statistics')
      }

      // Calculate statistics
      const totalEntries = auditData.length
      const uniqueUsers = new Set(auditData.map(entry => entry.userId)).size
      const uniqueEntities = new Set(auditData.map(entry => `${entry.entityType}:${entry.entityId}`)).size

      // Count action types
      const actionTypes = auditData.reduce((acc, entry) => {
        acc[entry.actionType] = (acc[entry.actionType] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topActionTypes = Object.entries(actionTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Count entity types
      const entityTypes = auditData.reduce((acc, entry) => {
        const key = `${entry.entityType}:${entry.entityName || 'unknown'}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topEntities = Object.entries(entityTypes)
        .map(([key, count]) => {
          const [entityType, entityName] = key.split(':')
          return { type: entityType, name: entityName || 'unknown', count }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const errorCount = auditData.filter(entry => !entry.success).length
      const errorRate = totalEntries > 0 ? (errorCount / totalEntries) * 100 : 0

      return {
        totalEntries,
        uniqueUsers,
        uniqueEntities,
        errorRate,
        topActionTypes,
        topEntities
      }
    } catch (error) {
      console.error('AuditService.getAuditStatistics error:', error)
      await notificationService.sendErrorNotification(
        'Failed to Get Audit Statistics',
        error instanceof Error ? error.message : 'Unknown error',
        `Media Company: ${mediaCompanyId}`
      )
      return {
        totalEntries: 0,
        uniqueUsers: 0,
        uniqueEntities: 0,
        errorRate: 0,
        topActionTypes: [],
        topEntities: []
      }
    }
  }
}

// Singleton instance
export const auditService = new AuditService()
