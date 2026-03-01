import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

interface SecurityContext {
  userId: string;
  accessibleCompanies: string[];
  mediaCompanies: string[];
  maxAccessLevel: number;
  lastUpdated: number;
}

interface UserPermissions {
  user_id: string;
  accessible_companies: string[];
  media_companies: string[];
  max_access_level: number;
}

class SecurityContextService {
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  
  private redis: Redis | null = null;
  private contextCache = new Map<string, SecurityContext>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_KEY_PREFIX = 'security_context:';

  constructor() {
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  /**
   * Get security context for a user with caching
   */
  async getSecurityContext(userId: string): Promise<SecurityContext> {
    const cacheKey = this.CACHE_KEY_PREFIX + userId;
    
    // Try memory cache first
    const memoryCached = this.contextCache.get(userId);
    if (memoryCached && Date.now() - memoryCached.lastUpdated < this.CACHE_TTL) {
      return memoryCached;
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const redisCached = await this.redis.get(cacheKey);
        if (redisCached) {
          const context = JSON.parse(redisCached) as SecurityContext;
          // Update memory cache
          this.contextCache.set(userId, context);
          return context;
        }
      } catch (error) {
        console.warn('Redis cache miss:', error);
      }
    }

    // Load from database
    const context = await this.loadSecurityContext(userId);
    
    // Update caches
    this.contextCache.set(userId, context);
    
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.CACHE_TTL / 1000, JSON.stringify(context));
      } catch (error) {
        console.warn('Redis cache set failed:', error);
      }
    }

    return context;
  }

  /**
   * Load security context from database
   */
  private async loadSecurityContext(userId: string): Promise<SecurityContext> {
    try {
      const { data, error } = await this.supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return empty context for users without permissions
        return {
          userId,
          accessibleCompanies: [],
          mediaCompanies: [],
          maxAccessLevel: 0,
          lastUpdated: Date.now()
        };
      }

      const permissions = data as UserPermissions;
      
      return {
        userId,
        accessibleCompanies: permissions.accessible_companies || [],
        mediaCompanies: permissions.media_companies || [],
        maxAccessLevel: permissions.max_access_level || 0,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to load security context:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to a specific company
   */
  async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.accessibleCompanies.includes(companyId);
  }

  /**
   * Check if user has access to a media company
   */
  async hasMediaCompanyAccess(userId: string, mediaCompanyId: string): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.mediaCompanies.includes(mediaCompanyId);
  }

  /**
   * Get all accessible companies for a user
   */
  async getAccessibleCompanies(userId: string): Promise<string[]> {
    const context = await this.getSecurityContext(userId);
    return context.accessibleCompanies;
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    // Remove from memory cache
    this.contextCache.delete(userId);
    
    // Remove from Redis
    if (this.redis) {
      try {
        await this.redis.del(this.CACHE_KEY_PREFIX + userId);
      } catch (error) {
        console.warn('Redis cache invalidation failed:', error);
      }
    }
  }

  /**
   * Warm up cache for multiple users
   */
  async warmupCache(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => this.getSecurityContext(userId));
    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    redisConnected: boolean;
  } {
    return {
      memoryCacheSize: this.contextCache.size,
      redisConnected: this.redis?.status === 'ready' || false
    };
  }

  /**
   * Set database session variables for RLS
   */
  async setDatabaseContext(supabaseClient: any, userId: string): Promise<void> {
    const context = await this.getSecurityContext(userId);
    
    // Set session variables for RLS policies
    await supabaseClient.rpc('set_security_context', {
      user_id: userId,
      company_ids: context.accessibleCompanies,
      media_company_ids: context.mediaCompanies,
      max_access_level: context.maxAccessLevel
    });
  }

  /**
   * Check if user has specific permission level
   */
  async hasPermissionLevel(userId: string, requiredLevel: number): Promise<boolean> {
    const context = await this.getSecurityContext(userId);
    return context.maxAccessLevel >= requiredLevel;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    averageLoadTime: number;
    totalRequests: number;
  }> {
    // This would be implemented with actual metrics collection
    return {
      cacheHitRate: 0.95, // 95% cache hit rate target
      averageLoadTime: 45, // 45ms average load time target
      totalRequests: 0
    };
  }
}

// Singleton instance
export const securityContextService = new SecurityContextService();
export default securityContextService;
