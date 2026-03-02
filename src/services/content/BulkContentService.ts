import { createClient } from '@supabase/supabase-js'
import { securityContextService } from '@/services/security/SecurityContextService'

// Types for bulk content system
export interface BulkContentPost {
  id: string
  mediaCompanyId: string
  title: string
  content: string
  contentType: 'post' | 'article' | 'announcement' | 'promotion'
  platformCustomizations: Record<string, PlatformCustomization>
  targetCompanyIds: string[]
  publishingStrategy: 'immediate' | 'scheduled' | 'staggered'
  scheduledAt?: string
  status: 'draft' | 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'
  createdBy: string
  publishedCompanyIds: string[]
  failedCompanyIds: string[]
  publishingErrors: Record<string, string>
  totalEngagement: number
  totalImpressions: number
  platformPerformance: Record<string, PlatformPerformance>
  createdAt: string
  updatedAt: string
  publishedAt?: string
  completedAt?: string
}

export interface PlatformCustomization {
  title?: string
  content?: string
  hashtags?: string[]
  mentions?: string[]
  media?: string[]
  scheduling?: {
    bestTime?: string
    timezone?: string
  }
}

export interface PlatformPerformance {
  engagement: number
  impressions: number
  clicks: number
  shares: number
  publishedAt: string
}

export interface PostInstance {
  id: string
  mediaCompanyPostId: string
  companyId: string
  platform: string
  title?: string
  content?: string
  platformSpecificContent: Record<string, any>
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'skipped'
  postId?: string
  scheduledAt?: string
  publishedAt?: string
  publishingAttempts: number
  maxAttempts: number
  lastError?: string
  errorDetails: Record<string, any>
  engagement: number
  impressions: number
  clicks: number
  shares: number
  createdAt: string
  updatedAt: string
}

export interface ContentTemplate {
  id: string
  mediaCompanyId: string
  name: string
  description?: string
  templateType: 'post' | 'article' | 'announcement' | 'promotion'
  baseContent: string
  placeholders: Record<string, string>
  platformVariations: Record<string, PlatformCustomization>
  usageCount: number
  lastUsedAt?: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PublishingStats {
  totalPosts: number
  pendingPosts: number
  publishingPosts: number
  publishedPosts: number
  failedPosts: number
  totalInstances: number
  queuedInstances: number
  processingInstances: number
  completedInstances: number
  failedInstances: number
  avgPublishingTime: string
  successRate: number
}

export class BulkContentService {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Create a bulk content post for multiple companies
   */
  async createBulkPost(
    userId: string,
    mediaCompanyId: string,
    title: string,
    content: string,
    targetCompanyIds: string[],
    options: {
      contentType?: 'post' | 'article' | 'announcement' | 'promotion'
      platformCustomizations?: Record<string, PlatformCustomization>
      publishingStrategy?: 'immediate' | 'scheduled' | 'staggered'
      scheduledAt?: string
    } = {}
  ): Promise<string | null> {
    try {
      // Validate user permissions
      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      if (!securityContext.accessibleCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have admin access to this media company')
      }

      // Validate all target companies are accessible
      const inaccessibleCompanies = targetCompanyIds.filter(
        companyId => !securityContext.accessibleCompanyIds.includes(companyId)
      )
      
      if (inaccessibleCompanies.length > 0) {
        throw new Error(`User does not have access to companies: ${inaccessibleCompanies.join(', ')}`)
      }

      // Create bulk post
      const { data, error } = await this.supabase.rpc('create_bulk_media_post', {
        _media_company_id: mediaCompanyId,
        _title: title,
        _content: content,
        _target_company_ids: targetCompanyIds,
        _platform_customizations: options.platformCustomizations || {},
        _publishing_strategy: options.publishingStrategy || 'immediate',
        _scheduled_at: options.scheduledAt || null,
        _created_by: userId
      })

      if (error) {
        throw new Error(`Failed to create bulk post: ${error.message}`)
      }

      return data as string
    } catch (error) {
      console.error('BulkContentService.createBulkPost error:', error)
      throw error
    }
  }

  /**
   * Get bulk posts for a media company
   */
  async getBulkPosts(
    userId: string,
    mediaCompanyId: string,
    options: {
      status?: string[]
      limit?: number
      offset?: number
      orderBy?: 'created_at' | 'updated_at' | 'published_at'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<BulkContentPost[]> {
    try {
      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      let query = this.supabase
        .from('media_company_posts')
        .select('*')
        .eq('media_company_id', mediaCompanyId)

      // Apply filters
      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      // Apply ordering
      const orderBy = options.orderBy || 'created_at'
      const orderDirection = options.orderDirection || 'desc'
      query = query.order(orderBy, { ascending: orderDirection === 'asc' })

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get bulk posts: ${error.message}`)
      }

      return (data as unknown) as BulkContentPost[]
    } catch (error) {
      console.error('BulkContentService.getBulkPosts error:', error)
      throw error
    }
  }

  /**
   * Get post instances for a bulk post
   */
  async getPostInstances(
    userId: string,
    mediaCompanyPostId: string,
    options: {
      status?: string[]
      platform?: string[]
    } = {}
  ): Promise<PostInstance[]> {
    try {
      // First verify user has access to the parent post
      const { data: parentPost, error: parentError } = await this.supabase
        .from('media_company_posts')
        .select('media_company_id')
        .eq('id', mediaCompanyPostId)
        .single()

      if (parentError || !parentPost) {
        throw new Error('Bulk post not found')
      }

      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes((parentPost as any).media_company_id)) {
        throw new Error('User does not have access to this media company')
      }

      let query = this.supabase
        .from('media_company_post_instances')
        .select('*')
        .eq('media_company_post_id', mediaCompanyPostId)

      // Apply filters
      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }
      if (options.platform && options.platform.length > 0) {
        query = query.in('platform', options.platform)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get post instances: ${error.message}`)
      }

      return (data as unknown) as PostInstance[]
    } catch (error) {
      console.error('BulkContentService.getPostInstances error:', error)
      throw error
    }
  }

  /**
   * Get publishing statistics
   */
  async getPublishingStats(
    userId: string,
    mediaCompanyId?: string
  ): Promise<PublishingStats> {
    try {
      if (mediaCompanyId) {
        const securityContext = await securityContextService.getSecurityContext(userId)
        
        if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
          throw new Error('User does not have access to this media company')
        }
      }

      const { data, error } = await this.supabase.rpc('get_bulk_publishing_stats', {
        _media_company_id: mediaCompanyId || null
      })

      if (error) {
        throw new Error(`Failed to get publishing stats: ${error.message}`)
      }

      return (data as unknown) as PublishingStats
    } catch (error) {
      console.error('BulkContentService.getPublishingStats error:', error)
      throw error
    }
  }

  /**
   * Create content template
   */
  async createTemplate(
    userId: string,
    mediaCompanyId: string,
    template: Omit<ContentTemplate, 'id' | 'usageCount' | 'lastUsedAt' | 'isActive' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      const { data, error } = await this.supabase
        .from('content_templates')
        .insert({
          ...template,
          media_company_id: mediaCompanyId,
          created_by: userId,
          is_active: true,
          usage_count: 0
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`)
      }

      return (data as any).id
    } catch (error) {
      console.error('BulkContentService.createTemplate error:', error)
      throw error
    }
  }

  /**
   * Get content templates for a media company
   */
  async getTemplates(
    userId: string,
    mediaCompanyId: string,
    options: {
      templateType?: string
      activeOnly?: boolean
    } = {}
  ): Promise<ContentTemplate[]> {
    try {
      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(mediaCompanyId)) {
        throw new Error('User does not have access to this media company')
      }

      let query = this.supabase
        .from('content_templates')
        .select('*')
        .eq('media_company_id', mediaCompanyId)

      if (options.templateType) {
        query = query.eq('template_type', options.templateType)
      }

      if (options.activeOnly) {
        query = query.eq('is_active', true)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get templates: ${error.message}`)
      }

      return (data as unknown) as ContentTemplate[]
    } catch (error) {
      console.error('BulkContentService.getTemplates error:', error)
      throw error
    }
  }

  /**
   * Apply template to content
   */
  async applyTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<{
    title: string
    content: string
    platformCustomizations: Record<string, PlatformCustomization>
  }> {
    try {
      // Get template
      const { data: template, error } = await this.supabase
        .from('content_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error || !template) {
        throw new Error('Template not found')
      }

      // Verify user has access
      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes((template as any).media_company_id)) {
        throw new Error('User does not have access to this template')
      }

      // Replace placeholders in base content
      let content = (template.base_content as string)
      let title = (template.name as string)

      Object.entries(variables).forEach(([placeholder, value]) => {
        const placeholderPattern = new RegExp(`{{${placeholder}}}`, 'g')
        content = content.replace(placeholderPattern, value)
        title = title.replace(placeholderPattern, value)
      })

      // Update template usage
      await this.supabase
        .from('content_templates')
        .update({
          usage_count: (template.usage_count as number) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)

      return {
        title,
        content,
        platformCustomizations: (template.platform_variations as Record<string, PlatformCustomization>)
      }
    } catch (error) {
      console.error('BulkContentService.applyTemplate error:', error)
      throw error
    }
  }

  /**
   * Cancel bulk post publishing
   */
  async cancelBulkPost(
    userId: string,
    mediaCompanyPostId: string
  ): Promise<boolean> {
    try {
      // Verify user has access
      const { data: post, error } = await this.supabase
        .from('media_company_posts')
        .select('media_company_id, status')
        .eq('id', mediaCompanyPostId)
        .single()

      if (error || !post) {
        throw new Error('Bulk post not found')
      }

      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(post.media_company_id)) {
        throw new Error('User does not have access to this bulk post')
      }

      if (post.status === 'published') {
        throw new Error('Cannot cancel published post')
      }

      // Update post status
      const { error: updateError } = await this.supabase
        .from('media_company_posts')
        .update({ status: 'cancelled' })
        .eq('id', mediaCompanyPostId)

      if (updateError) {
        throw new Error(`Failed to cancel bulk post: ${updateError.message}`)
      }

      // Cancel queued instances
      await this.supabase
        .from('media_company_post_instances')
        .update({ status: 'skipped' })
        .eq('media_company_post_id', mediaCompanyPostId)
        .in('status', ['pending', 'publishing'])

      // Remove from publishing queue
      await this.supabase
        .from('bulk_publishing_queue')
        .delete()
        .eq('media_company_post_id', mediaCompanyPostId)
        .in('status', ['queued', 'processing'])

      return true
    } catch (error) {
      console.error('BulkContentService.cancelBulkPost error:', error)
      throw error
    }
  }

  /**
   * Retry failed publishing instances
   */
  async retryFailedInstances(
    userId: string,
    mediaCompanyPostId: string
  ): Promise<number> {
    try {
      // Verify user has access
      const { data: post, error } = await this.supabase
        .from('media_company_posts')
        .select('media_company_id')
        .eq('id', mediaCompanyPostId)
        .single()

      if (error || !post) {
        throw new Error('Bulk post not found')
      }

      const securityContext = await securityContextService.getSecurityContext(userId)
      
      if (!securityContext.mediaCompanyIds.includes(post.media_company_id)) {
        throw new Error('User does not have access to this bulk post')
      }

      // Get failed instances
      const { data: failedInstances, error: instancesError } = await this.supabase
        .from('media_company_post_instances')
        .select('id, company_id, platform, publishing_attempts')
        .eq('media_company_post_id', mediaCompanyPostId)
        .eq('status', 'failed')
        .lt('publishing_attempts', 3)

      if (instancesError) {
        throw new Error(`Failed to get failed instances: ${instancesError.message}`)
      }

      if (!failedInstances || failedInstances.length === 0) {
        return 0
      }

      // Reset failed instances and requeue
      const instanceIds = failedInstances.map(instance => instance.id)

      // Reset instances
      await this.supabase
        .from('media_company_post_instances')
        .update({
          status: 'pending',
          publishing_attempts: 0,
          last_error: null,
          error_details: {}
        })
        .in('id', instanceIds)

      // Requeue for publishing
      await this.supabase
        .from('bulk_publishing_queue')
        .insert(
          failedInstances.map(instance => ({
            media_company_post_id: mediaCompanyPostId,
            company_id: instance.company_id,
            platform: instance.platform,
            priority: 2, // Lower priority for retries
            attempts: instance.publishing_attempts
          }))
        )

      return failedInstances.length
    } catch (error) {
      console.error('BulkContentService.retryFailedInstances error:', error)
      throw error
    }
  }
}

// Singleton instance
export const bulkContentService = new BulkContentService()
