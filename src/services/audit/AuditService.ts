// Stubbed — audit trail tables and RPCs do not exist yet.
// All methods throw to surface missing infrastructure clearly.

export interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  entityName?: string
  actionType: string
  actionDetails: Record<string, any>
  userId?: string
  sessionId?: string
  mediaCompanyId?: string
  companyId?: string
  success: boolean
  errorMessage?: string
  createdAt: string
}

export interface AuditSummary {
  id: string
  mediaCompanyId: string
  summaryType: string
  totalActions: number
  createdAt: string
}

export interface AuditExport {
  id: string
  mediaCompanyId: string
  exportType: string
  exportFormat: string
  status: string
  createdAt: string
}

const NOT_IMPLEMENTED = 'AuditService: audit trail infrastructure not yet built'

export class AuditService {
  async createAuditEntry(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async getAuditTrail(..._args: any[]): Promise<AuditEntry[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async createAuditSummary(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async exportAuditTrail(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async getAuditSummaries(..._args: any[]): Promise<AuditSummary[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async getAuditExports(..._args: any[]): Promise<AuditExport[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async cleanupAuditTrail(..._args: any[]): Promise<number> {
    console.warn(NOT_IMPLEMENTED)
    return 0
  }
  async getAuditStatistics(..._args: any[]): Promise<{
    totalEntries: number
    uniqueUsers: number
    uniqueEntities: number
    errorRate: number
    topActionTypes: Array<{ type: string; count: number }>
    topEntities: Array<{ type: string; name: string; count: number }>
  }> {
    console.warn(NOT_IMPLEMENTED)
    return { totalEntries: 0, uniqueUsers: 0, uniqueEntities: 0, errorRate: 0, topActionTypes: [], topEntities: [] }
  }
}

export const auditService = new AuditService()
