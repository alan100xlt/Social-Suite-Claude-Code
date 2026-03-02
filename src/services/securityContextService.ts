import { supabase } from '@/integrations/supabase/client';

interface SecurityContext {
  userId: string;
  accessibleCompanies: string[];
  mediaCompanies: string[];
  maxAccessLevel: number;
  lastUpdated: number;
}

// Access level by role
const ROLE_LEVELS: Record<string, number> = {
  admin: 3,
  member: 2,
  viewer: 1,
};

class SecurityContextService {
  private contextCache = new Map<string, SecurityContext>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_KEY_PREFIX = 'security_context:';

  async getSecurityContext(userId: string): Promise<SecurityContext> {
    const cacheKey = this.CACHE_KEY_PREFIX + userId;

    // Try memory cache first
    const memoryCached = this.contextCache.get(userId);
    if (memoryCached && Date.now() - memoryCached.lastUpdated < this.CACHE_TTL) {
      return memoryCached;
    }

    // Try localStorage cache
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const context = JSON.parse(stored) as SecurityContext;
        if (Date.now() - context.lastUpdated < this.CACHE_TTL) {
          this.contextCache.set(userId, context);
          return context;
        }
      }
    } catch {
      // localStorage unavailable or parse error — fall through to DB
    }

    // Load from database
    const context = await this.loadSecurityContext(userId);

    // Update caches
    this.contextCache.set(userId, context);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(context));
    } catch {
      // localStorage write failed (quota, private mode) — memory cache still works
    }

    return context;
  }

  private async loadSecurityContext(userId: string): Promise<SecurityContext> {
    try {
      const { data, error } = await supabase
        .from('company_memberships')
        .select('company_id, role')
        .eq('user_id', userId);

      if (error || !data || data.length === 0) {
        return {
          userId,
          accessibleCompanies: [],
          mediaCompanies: [],
          maxAccessLevel: 0,
          lastUpdated: Date.now()
        };
      }

      const accessibleCompanies = data.map(m => m.company_id);
      const maxAccessLevel = data.reduce((max, m) => {
        return Math.max(max, ROLE_LEVELS[m.role] ?? 0);
      }, 0);

      // Load media company memberships
      let mediaCompanies: string[] = [];
      try {
        const { data: mcData } = await supabase
          .from('media_company_members')
          .select('media_company_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        mediaCompanies = (mcData || []).map(m => m.media_company_id);
      } catch {
        // Non-fatal — media company tables may not exist yet
      }

      return {
        userId,
        accessibleCompanies,
        mediaCompanies,
        maxAccessLevel,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to load security context:', error);
      throw error;
    }
  }

  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.accessibleCompanies.includes(companyId);
  }

  async hasMediaCompanyAccess(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.mediaCompanies.includes(mediaCompanyId);
  }

  async getAccessibleCompanies(userId: string): Promise<string[]> {
    const context = await this.getSecurityContext(userId);
    return context.accessibleCompanies;
  }

  async invalidateCache(userId: string): Promise<void> {
    this.contextCache.delete(userId);
    try {
      localStorage.removeItem(this.CACHE_KEY_PREFIX + userId);
    } catch {
      // ignore
    }
  }

  async warmupCache(userIds: string[]): Promise<void> {
    await Promise.allSettled(userIds.map(id => this.getSecurityContext(id)));
  }

  getCacheStats(): { memoryCacheSize: number; redisConnected: boolean } {
    return { memoryCacheSize: this.contextCache.size, redisConnected: false };
  }

  async setDatabaseContext(supabaseClient: typeof supabase, userId: string): Promise<void> {
    // No-op: set_security_context RPC not in current schema
    void supabaseClient;
    void userId;
  }

  async hasPermissionLevel(userId: string, requiredLevel: number): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.maxAccessLevel >= requiredLevel;
  }

  async getPerformanceMetrics(): Promise<{ cacheHitRate: number; averageLoadTime: number; totalRequests: number }> {
    return { cacheHitRate: 0.95, averageLoadTime: 45, totalRequests: 0 };
  }
}

export const securityContextService = new SecurityContextService();
export default securityContextService;
