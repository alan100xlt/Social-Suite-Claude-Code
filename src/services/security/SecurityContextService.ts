import { supabase } from '@/integrations/supabase/client'

// Types for security context
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
  private supabase = supabase
  private cache = new Map<string, SecurityContext>()
  private readonly CACHE_TTL = 15 * 60 * 1000 // 15 minutes

  constructor() {
    // Setup cache cleanup interval
    setInterval(() => {
      this.cleanupExpiredCache()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Get security context for a user
   * Performance target: <50ms for 1000+ companies
   */
  async getSecurityContext(userId: string): Promise<SecurityContext> {
    const startTime = Date.now()

    // Check in-memory cache first
    const memCached = this.cache.get(userId)
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached
    }

    // Build security context from database
    const context = await this.buildSecurityContext(userId)
    
    // Cache the context
    await this.cacheSecurityContext(userId, context)

    const duration = Date.now() - startTime
    console.log(`Security context built for ${userId} in ${duration}ms`)

    return context
  }

  /**
   * Build security context from database
   */
  private async buildSecurityContext(userId: string): Promise<SecurityContext> {
    const { data: hierarchy, error } = await this.supabase
      .rpc('get_user_security_hierarchy', { _user_id: userId })

    if (error) {
      throw new Error(`Failed to build security context: ${error.message}`)
    }

    const hierarchyData = hierarchy as any[] || []

    if (!hierarchyData || hierarchyData.length === 0) {
      // Return empty context for users with no access
      return this.createEmptySecurityContext(userId)
    }

    // Process hierarchy data
    const accessibleCompanyIds = new Set<string>()
    const mediaCompanyIds = new Set<string>()
    const permissions: Permission[] = []
    const mediaCompanies: MediaCompany[] = []
    const childCompanies: ChildCompany[] = []
    const relationships: Relationship[] = []

    let maxAccessLevel = 0

    for (const item of hierarchyData) {
      // Collect company IDs
      if (item.child_company_id) {
        accessibleCompanyIds.add(item.child_company_id)
      }
      if (item.media_company_id) {
        mediaCompanyIds.add(item.media_company_id)
        accessibleCompanyIds.add(item.media_company_id)
      }

      // Build permissions
      if (item.child_company_id && item.role) {
        permissions.push({
          companyId: item.child_company_id,
          role: item.role as 'admin' | 'member' | 'viewer',
          accessLevel: item.access_level || 0,
          permissions: this.getRolePermissions(item.role)
        })
        maxAccessLevel = Math.max(maxAccessLevel, item.access_level || 0)
      }

      // Build hierarchy structures
      if (item.media_company_id && item.media_company_name) {
        const existingMediaCompany = mediaCompanies.find(mc => mc.id === item.media_company_id)
        if (!existingMediaCompany) {
          mediaCompanies.push({
            id: item.media_company_id,
            name: item.media_company_name,
            childCompanyIds: [],
            memberCount: 0
          })
        }

        if (item.child_company_id) {
          const mediaCompany = mediaCompanies.find(mc => mc.id === item.media_company_id)
          if (mediaCompany && !mediaCompany.childCompanyIds.includes(item.child_company_id)) {
            mediaCompany.childCompanyIds.push(item.child_company_id)
          }
        }
      }

      if (item.child_company_id && item.child_company_name) {
        childCompanies.push({
          id: item.child_company_id,
          name: item.child_company_name,
          mediaCompanyId: item.media_company_id || '',
          role: item.role || ''
        })
      }

      if (item.media_company_id && item.child_company_id && item.relationship_type) {
        relationships.push({
          mediaCompanyId: item.media_company_id,
          childCompanyId: item.child_company_id,
          relationshipType: item.relationship_type as 'owned' | 'managed' | 'partnered'
        })
      }
    }

    return {
      userId,
      accessibleCompanyIds: Array.from(accessibleCompanyIds),
      mediaCompanyIds: Array.from(mediaCompanyIds),
      permissions,
      hierarchy: {
        mediaCompanies,
        childCompanies,
        relationships
      },
      maxAccessLevel,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    }
  }

  /**
   * Create empty security context for users with no access
   */
  private createEmptySecurityContext(userId: string): SecurityContext {
    return {
      userId,
      accessibleCompanyIds: [],
      mediaCompanyIds: [],
      permissions: [],
      hierarchy: {
        mediaCompanies: [],
        childCompanies: [],
        relationships: []
      },
      maxAccessLevel: 0,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    }
  }

  /**
   * Get permissions for a specific role
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      member: ['read', 'write', 'publish'],
      viewer: ['read']
    }
    return rolePermissions[role as keyof typeof rolePermissions] || []
  }

  /**
   * Cache security context in memory
   */
  private async cacheSecurityContext(userId: string, context: SecurityContext): Promise<void> {
    this.cache.set(userId, context)
  }

  /**
   * Invalidate security context cache for a user
   */
  async invalidateSecurityContext(userId: string): Promise<void> {
    this.cache.delete(userId)
  }

  /**
   * Check if user has access to a specific company
   */
  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.accessibleCompanyIds.includes(companyId)
  }

  /**
   * Check if user is media company admin
   */
  async isMediaCompanyAdmin(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.mediaCompanyIds.includes(mediaCompanyId) && 
           context.maxAccessLevel >= 3 // Admin level
  }

  /**
   * Get all companies user can access with specific role
   */
  async getCompaniesByRole(userId: string, role: 'admin' | 'member' | 'viewer'): Promise<string[]> {
    const context = await this.getSecurityContext(userId)
    return context.permissions
      .filter(p => p.role === role)
      .map(p => p.companyId)
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [userId, context] of this.cache.entries()) {
      if (context.expiresAt <= now) {
        this.cache.delete(userId)
      }
    }
  }

  /**
   * Warm cache for multiple users (batch operation)
   */
  async warmCache(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => 
      this.getSecurityContext(userId).catch(error => {
        console.error(`Failed to warm cache for user ${userId}:`, error)
      })
    )
    await Promise.allSettled(promises)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryCache: { size: number } } {
    return {
      memoryCache: { size: this.cache.size }
    }
  }
}

// Singleton instance
export const securityContextService = new SecurityContextService()
