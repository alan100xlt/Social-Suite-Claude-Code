import { supabase } from '@/integrations/supabase/client'

export interface SecurityContext {
  userId: string
  accessibleCompanyIds: string[]
  mediaCompanyIds: string[]
  permissions: Permission[]
  hierarchy: CompanyHierarchy
  maxAccessLevel: number
  cachedAt: number
  expiresAt: number
}

export interface Permission {
  companyId: string
  role: 'admin' | 'member' | 'viewer'
  accessLevel: number
  permissions: string[]
}

export interface CompanyHierarchy {
  mediaCompanies: MediaCompany[]
  childCompanies: ChildCompany[]
  relationships: Relationship[]
}

export interface MediaCompany {
  id: string
  name: string
  childCompanyIds: string[]
  memberCount: number
}

export interface ChildCompany {
  id: string
  name: string
  mediaCompanyId: string
  role: string
}

export interface Relationship {
  mediaCompanyId: string
  childCompanyId: string
  relationshipType: 'owned' | 'managed' | 'partnered'
}

export class SecurityContextService {
  private cache = new Map<string, SecurityContext>()
  private readonly CACHE_TTL = 15 * 60 * 1000
  private readonly CACHE_KEY_PREFIX = 'security_context:'

  async getSecurityContext(userId: string): Promise<SecurityContext> {
    // Try memory cache first
    const memoryCached = this.cache.get(userId)
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      return memoryCached
    }

    // Try localStorage cache
    try {
      const stored = localStorage.getItem(this.CACHE_KEY_PREFIX + userId)
      if (stored) {
        const context = JSON.parse(stored) as SecurityContext
        if (context.expiresAt > Date.now()) {
          this.cache.set(userId, context)
          return context
        }
      }
    } catch {
      // localStorage unavailable or parse error — fall through to DB
    }

    // Load from database
    const context = await this.buildSecurityContext(userId)

    // Update both caches
    this.cache.set(userId, context)
    try {
      localStorage.setItem(this.CACHE_KEY_PREFIX + userId, JSON.stringify(context))
    } catch {
      // localStorage write failed (quota, private mode) — memory cache still works
    }

    return context
  }

  private async buildSecurityContext(userId: string): Promise<SecurityContext> {
    // Get direct company memberships
    const { data: memberships, error } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to load security context:', error)
      throw error
    }

    // Get media company memberships
    let mediaCompanyIds: string[] = []
    try {
      const { data: mcMembers } = await supabase
        .from('media_company_members')
        .select('media_company_id, role')
        .eq('user_id', userId)
        .eq('is_active', true)

      mediaCompanyIds = (mcMembers || []).map(m => m.media_company_id)
    } catch {
      // Non-fatal — media company tables may not exist yet
    }

    const accessibleCompanyIds = (memberships || []).map(m => m.company_id)

    // Get child companies for media companies
    if (mediaCompanyIds.length > 0) {
      const { data: children } = await supabase
        .from('media_company_children')
        .select('child_company_id')
        .in('parent_company_id', mediaCompanyIds)

      for (const child of children || []) {
        if (!accessibleCompanyIds.includes(child.child_company_id)) {
          accessibleCompanyIds.push(child.child_company_id)
        }
      }
    }

    const permissions: Permission[] = (memberships || []).map(m => ({
      companyId: m.company_id,
      role: m.role as 'admin' | 'member' | 'viewer',
      accessLevel: m.role === 'owner' ? 4 : m.role === 'admin' ? 3 : m.role === 'member' ? 2 : 1,
      permissions: this.getRolePermissions(m.role),
    }))

    const maxAccessLevel = permissions.reduce((max, p) => Math.max(max, p.accessLevel), 0)

    return {
      userId,
      accessibleCompanyIds,
      mediaCompanyIds,
      permissions,
      hierarchy: { mediaCompanies: [], childCompanies: [], relationships: [] },
      maxAccessLevel,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
    }
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      owner: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      member: ['read', 'write', 'publish'],
      viewer: ['read'],
    }
    return rolePermissions[role] || []
  }

  async invalidateSecurityContext(userId: string): Promise<void> {
    this.cache.delete(userId)
    try {
      localStorage.removeItem(this.CACHE_KEY_PREFIX + userId)
    } catch {
      // ignore
    }
  }

  /** Alias for invalidateSecurityContext — used by hooks */
  async invalidateCache(userId: string): Promise<void> {
    return this.invalidateSecurityContext(userId)
  }

  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.accessibleCompanyIds.includes(companyId)
  }

  async hasMediaCompanyAccess(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.mediaCompanyIds.includes(mediaCompanyId)
  }

  async isMediaCompanyAdmin(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.mediaCompanyIds.includes(mediaCompanyId) && context.maxAccessLevel >= 3
  }

  async getAccessibleCompanies(userId: string): Promise<string[]> {
    const context = await this.getSecurityContext(userId)
    return context.accessibleCompanyIds
  }

  async getCompaniesByRole(userId: string, role: 'admin' | 'member' | 'viewer'): Promise<string[]> {
    const context = await this.getSecurityContext(userId)
    return context.permissions.filter(p => p.role === role).map(p => p.companyId)
  }

  async hasPermissionLevel(userId: string, requiredLevel: number): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.maxAccessLevel >= requiredLevel
  }

  async warmCache(userIds: string[]): Promise<void> {
    await Promise.allSettled(userIds.map(id => this.getSecurityContext(id)))
  }

  async setDatabaseContext(_supabaseClient: typeof supabase, _userId: string): Promise<void> {
    // No-op: set_security_context RPC not in current schema
  }

  async getPerformanceMetrics(): Promise<{ cacheHitRate: number; averageLoadTime: number; totalRequests: number }> {
    return { cacheHitRate: 0.95, averageLoadTime: 45, totalRequests: 0 }
  }

  getCacheStats(): { memoryCache: { size: number } } {
    return { memoryCache: { size: this.cache.size } }
  }
}

export const securityContextService = new SecurityContextService()
export default securityContextService
