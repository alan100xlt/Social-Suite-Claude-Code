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

  async getSecurityContext(userId: string): Promise<SecurityContext> {
    const cached = this.cache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached
    }

    const context = await this.buildSecurityContext(userId)
    this.cache.set(userId, context)
    return context
  }

  private async buildSecurityContext(userId: string): Promise<SecurityContext> {
    // Get direct company memberships
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', userId)

    // Get media company memberships
    const { data: mcMembers } = await supabase
      .from('media_company_members')
      .select('media_company_id, role')
      .eq('user_id', userId)
      .eq('is_active', true)

    const accessibleCompanyIds = (memberships || []).map(m => m.company_id)
    const mediaCompanyIds = (mcMembers || []).map(m => m.media_company_id)

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
  }

  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.accessibleCompanyIds.includes(companyId)
  }

  async isMediaCompanyAdmin(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId)
    return context.mediaCompanyIds.includes(mediaCompanyId) && context.maxAccessLevel >= 3
  }

  async getCompaniesByRole(userId: string, role: 'admin' | 'member' | 'viewer'): Promise<string[]> {
    const context = await this.getSecurityContext(userId)
    return context.permissions.filter(p => p.role === role).map(p => p.companyId)
  }

  getCacheStats(): { memoryCache: { size: number } } {
    return { memoryCache: { size: this.cache.size } }
  }
}

export const securityContextService = new SecurityContextService()
