import { Request, Response, NextFunction } from 'express'
import { securityContextService, SecurityContext } from '@/services/security/SecurityContextService'

// Extend Request interface to include security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: SecurityContext
      user?: {
        id: string
        email: string
      }
    }
  }
}

/**
 * Security middleware for enterprise media company system
 * Sets security context and database session variables for RLS
 */
export const securityMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip security for public routes
    if (isPublicRoute(req.path)) {
      return next()
    }

    // Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Get security context (cached)
    const securityContext = await securityContextService.getSecurityContext(req.user.id)
    
    // Attach to request
    req.securityContext = securityContext

    // Set database session variables for RLS
    await setDatabaseSessionVariables(securityContext)

    // Update last accessed timestamp
    await updateLastAccessed(req.user.id)

    next()
  } catch (error) {
    console.error('Security middleware error:', error)
    res.status(500).json({ error: 'Security context initialization failed' })
  }
}

/**
 * Check if route is public (doesn't require authentication)
 */
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/health',
    '/api/public',
    '/discover'
  ]
  
  return publicRoutes.some(route => path.startsWith(route))
}

/**
 * Set database session variables for RLS policies
 */
async function setDatabaseSessionVariables(securityContext: SecurityContext): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client')
  
  // Set accessible companies array for RLS
  await supabase.rpc('set_session_context', {
    accessible_companies: securityContext.accessibleCompanyIds,
    media_companies: securityContext.mediaCompanyIds,
    max_access_level: securityContext.maxAccessLevel
  })
}

/**
 * Update last accessed timestamp for user
 */
async function updateLastAccessed(userId: string): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client')
  
  await supabase.rpc('update_last_accessed', { _user_id: userId })
}

/**
 * Middleware to check if user has access to specific company
 */
export const requireCompanyAccess = (companyIdParam: string = 'companyId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.securityContext) {
        return res.status(401).json({ error: 'Security context not found' })
      }

      const companyId = req.params[companyIdParam] || req.body.companyId || req.query.companyId
      
      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'Company ID required' })
      }

      const hasAccess = req.securityContext.accessibleCompanyIds.includes(companyId)
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to company' })
      }

      next()
    } catch (error) {
      console.error('Company access check error:', error)
      res.status(500).json({ error: 'Access check failed' })
    }
  }
}

/**
 * Middleware to check if user is media company admin
 */
export const requireMediaCompanyAdmin = (mediaCompanyIdParam: string = 'mediaCompanyId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.securityContext) {
        return res.status(401).json({ error: 'Security context not found' })
      }

      const mediaCompanyId = req.params[mediaCompanyIdParam] || req.body.mediaCompanyId || req.query.mediaCompanyId
      
      if (!mediaCompanyId || typeof mediaCompanyId !== 'string') {
        return res.status(400).json({ error: 'Media company ID required' })
      }

      const isAdmin = req.securityContext.mediaCompanyIds.includes(mediaCompanyId) && 
                     req.securityContext.maxAccessLevel >= 5

      if (!isAdmin) {
        return res.status(403).json({ error: 'Media company admin access required' })
      }

      next()
    } catch (error) {
      console.error('Media company admin check error:', error)
      res.status(500).json({ error: 'Admin check failed' })
    }
  }
}

/**
 * Middleware to check minimum access level
 */
export const requireAccessLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.securityContext) {
        return res.status(401).json({ error: 'Security context not found' })
      }

      if (req.securityContext.maxAccessLevel < minLevel) {
        return res.status(403).json({ error: 'Insufficient access level' })
      }

      next()
    } catch (error) {
      console.error('Access level check error:', error)
      res.status(500).json({ error: 'Access level check failed' })
    }
  }
}

/**
 * Middleware to invalidate security context cache
 */
export const invalidateSecurityCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.id) {
      await securityContextService.invalidateSecurityContext(req.user.id)
    }
    next()
  } catch (error) {
    console.error('Cache invalidation error:', error)
    next() // Don't block request for cache errors
  }
}

/**
 * Performance monitoring middleware
 */
export const securityPerformanceMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = Date.now()
  
  // Continue to next middleware
  next()
  
  // Log performance after response
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    if (req.securityContext) {
      const companyCount = req.securityContext.accessibleCompanyIds.length
      const mediaCompanyCount = req.securityContext.mediaCompanyIds.length
      
      // Log performance metrics
      console.log(`Security Performance: ${duration}ms, ${companyCount} companies, ${mediaCompanyCount} media companies`)
      
      // Alert if performance is degraded
      if (duration > 100) {
        console.warn(`Security performance degraded: ${duration}ms for user ${req.user?.id}`)
      }
    }
  })
}

/**
 * Cache warming middleware for batch operations
 */
export const warmCacheMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // This could be called by a cron job or admin endpoint
  if (req.path === '/admin/warm-cache' && req.method === 'POST') {
    try {
      const { userIds } = req.body
      
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ error: 'User IDs array required' })
      }

      await securityContextService.warmCache(userIds)
      
      res.json({ message: `Cache warmed for ${userIds.length} users` })
    } catch (error) {
      console.error('Cache warming error:', error)
      res.status(500).json({ error: 'Cache warming failed' })
    }
  } else {
    next()
  }
}

/**
 * Health check for security service
 */
export const securityHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = securityContextService.getCacheStats()

    res.json({
      status: 'healthy',
      cache: {
        memory: stats.memoryCache,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Security health check error:', error)
    res.status(500).json({ error: 'Health check failed' })
  }
}
