// Stubbed — bulk content tables (media_company_posts, media_company_post_instances,
// content_templates, bulk_publishing_queue) do not exist yet.

export interface BulkContentPost {
  id: string
  mediaCompanyId: string
  title: string
  content: string
  contentType: string
  status: string
  createdBy: string
  createdAt: string
}

export interface PlatformCustomization {
  title?: string
  content?: string
  hashtags?: string[]
  mentions?: string[]
  media?: string[]
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
  status: string
  createdAt: string
}

export interface ContentTemplate {
  id: string
  mediaCompanyId: string
  name: string
  description?: string
  templateType: string
  baseContent: string
  isActive: boolean
  createdBy: string
  createdAt: string
}

export interface PublishingStats {
  totalPosts: number
  pendingPosts: number
  publishedPosts: number
  failedPosts: number
  successRate: number
}

const NOT_IMPLEMENTED = 'BulkContentService: bulk content infrastructure not yet built'

export class BulkContentService {
  async createBulkPost(..._args: any[]): Promise<string | null> {
    console.warn(NOT_IMPLEMENTED)
    return null
  }
  async getBulkPosts(..._args: any[]): Promise<BulkContentPost[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async getPostInstances(..._args: any[]): Promise<PostInstance[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async getPublishingStats(..._args: any[]): Promise<PublishingStats> {
    console.warn(NOT_IMPLEMENTED)
    return { totalPosts: 0, pendingPosts: 0, publishedPosts: 0, failedPosts: 0, successRate: 0 }
  }
  async createTemplate(..._args: any[]): Promise<string> {
    throw new Error(NOT_IMPLEMENTED)
  }
  async getTemplates(..._args: any[]): Promise<ContentTemplate[]> {
    console.warn(NOT_IMPLEMENTED)
    return []
  }
  async applyTemplate(..._args: any[]): Promise<{ title: string; content: string; platformCustomizations: Record<string, PlatformCustomization> }> {
    throw new Error(NOT_IMPLEMENTED)
  }
  async cancelBulkPost(..._args: any[]): Promise<boolean> {
    console.warn(NOT_IMPLEMENTED)
    return false
  }
  async retryFailedInstances(..._args: any[]): Promise<number> {
    console.warn(NOT_IMPLEMENTED)
    return 0
  }
}

export const bulkContentService = new BulkContentService()
