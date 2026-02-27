import { supabase } from '@/integrations/supabase/client';

// Platform types supported by GetLate
export type Platform = 
  | 'twitter' 
  | 'instagram' 
  | 'facebook' 
  | 'linkedin' 
  | 'tiktok' 
  | 'youtube' 
  | 'pinterest' 
  | 'reddit' 
  | 'bluesky' 
  | 'threads' 
  | 'google-business' 
  | 'telegram' 
  | 'snapchat';

export interface GetLateAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  followers?: number;
  isConnected: boolean;
  connectedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface GetLatePost {
  id: string;
  text: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: string;
  publishedAt?: string;
  accountIds: string[];
  mediaItems?: MediaItem[];
  platformResults?: PlatformResult[];
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

export interface PlatformResult {
  accountId: string;
  platform: Platform;
  status: 'success' | 'failed';
  postUrl?: string;
  error?: string;
}

export interface PostAnalytics {
  postId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  updatedAt: string;
}

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Connect API - OAuth flows
export const getlateConnect = {
  // Start OAuth flow for a platform
  async start(platform: Platform, redirectUrl: string, profileId?: string): Promise<ApiResponse<{ authUrl: string }>> {
    const { data, error } = await supabase.functions.invoke('getlate-connect', {
      body: { action: 'start', platform, redirectUrl, profileId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { authUrl: data.authUrl }, error: data.error };
  },

  // Get page/account options after OAuth callback (for Facebook, LinkedIn, etc.)
  async getOptions(platform: Platform, tempToken: string, profileId?: string): Promise<ApiResponse<{ options: Array<{ id: string; name: string; pictureUrl?: string }> }>> {
    const { data, error } = await supabase.functions.invoke('getlate-connect', {
      body: { action: 'get-options', platform, tempToken, profileId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { options: data.options }, error: data.error };
  },

  // Complete connection with selected page/account
  async select(
    platform: Platform,
    tempToken: string,
    selection: { id: string; name: string },
    profileId?: string,
    userProfile?: { id?: string; name?: string; profilePicture?: string }
  ): Promise<ApiResponse<{ account: GetLateAccount }>> {
    const { data, error } = await supabase.functions.invoke('getlate-connect', {
      body: { action: 'select', platform, tempToken, selection, profileId, userProfile },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { account: data.account }, error: data.error };
  },
};

// Accounts API
export const getlateAccounts = {
  // List all connected accounts
  async list(profileId?: string): Promise<ApiResponse<{ accounts: GetLateAccount[] }>> {
    const { data, error } = await supabase.functions.invoke('getlate-accounts', {
      body: { action: 'list', profileId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { accounts: data.accounts || [] }, error: data.error };
  },

  // Get single account
  async get(accountId: string): Promise<ApiResponse<{ account: GetLateAccount }>> {
    const { data, error } = await supabase.functions.invoke('getlate-accounts', {
      body: { action: 'get', accountId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { account: data.account }, error: data.error };
  },

  // Disconnect account
  async disconnect(accountId: string): Promise<ApiResponse<void>> {
    const { data, error } = await supabase.functions.invoke('getlate-accounts', {
      body: { action: 'disconnect', accountId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, error: data.error };
  },

  // Get follower stats
  async getFollowerStats(accountId: string): Promise<ApiResponse<{ stats: Array<{ date: string; followers: number }> }>> {
    const { data, error } = await supabase.functions.invoke('getlate-accounts', {
      body: { action: 'follower-stats', accountId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { stats: data.stats }, error: data.error };
  },
};

// Posts API
export const getlatePosts = {
  // Create a new post
  async create(params: {
    accountIds: string[];
    text: string;
    mediaItems?: MediaItem[];
    scheduledFor?: string;
    publishNow?: boolean;
    platformOptions?: Record<string, unknown>;
    platforms?: Array<{
      platform: string;
      accountId: string;
      content: string;
      platformSpecificData?: Record<string, unknown>;
    }>;
    profileId?: string;
    source?: string;
    objective?: string;
  }): Promise<ApiResponse<{ post: GetLatePost }>> {
    const { data, error } = await supabase.functions.invoke('getlate-posts', {
      body: { action: 'create', ...params },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { post: data.post }, error: data.error };
  },

  // List posts
  async list(params?: {
    status?: 'draft' | 'scheduled' | 'published' | 'failed';
    platform?: Platform;
    limit?: number;
    offset?: number;
    profileId?: string;
  }): Promise<ApiResponse<{ posts: GetLatePost[] }>> {
    const { data, error } = await supabase.functions.invoke('getlate-posts', {
      body: { action: 'list', ...params },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { posts: data.posts || [] }, error: data.error };
  },

  // Get single post
  async get(postId: string): Promise<ApiResponse<{ post: GetLatePost }>> {
    const { data, error } = await supabase.functions.invoke('getlate-posts', {
      body: { action: 'get', postId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { post: data.post }, error: data.error };
  },

  // Update post
  async update(postId: string, params: { text?: string; scheduledFor?: string }): Promise<ApiResponse<{ post: GetLatePost }>> {
    const { data, error } = await supabase.functions.invoke('getlate-posts', {
      body: { action: 'update', postId, ...params },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { post: data.post }, error: data.error };
  },

  // Delete post
  async delete(postId: string): Promise<ApiResponse<void>> {
    const { data, error } = await supabase.functions.invoke('getlate-posts', {
      body: { action: 'delete', postId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, error: data.error };
  },
};

// Analytics API
export const getlateAnalytics = {
  // Get analytics for a single post
  async getPostAnalytics(postId: string): Promise<ApiResponse<{ analytics: PostAnalytics }>> {
    const { data, error } = await supabase.functions.invoke('getlate-analytics', {
      body: { action: 'get', postId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { analytics: data.analytics }, error: data.error };
  },

  // Get analytics for multiple posts
  async getBatchAnalytics(postIds: string[]): Promise<ApiResponse<{ analytics: PostAnalytics[] }>> {
    const { data, error } = await supabase.functions.invoke('getlate-analytics', {
      body: { action: 'get', postIds },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { analytics: data.analytics }, error: data.error };
  },

  // Get overview analytics
  async getOverview(params?: {
    accountIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ overview: Record<string, unknown> }>> {
    const { data, error } = await supabase.functions.invoke('getlate-analytics', {
      body: { action: 'overview', ...params },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { overview: data.overview }, error: data.error };
  },

  // Sync external post analytics
  async syncExternalPost(accountId: string, postUrl: string): Promise<ApiResponse<{ analytics: PostAnalytics }>> {
    const { data, error } = await supabase.functions.invoke('getlate-analytics', {
      body: { action: 'sync', accountId, postUrl },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: data.success, data: { analytics: data.analytics }, error: data.error };
  },
};

// Unified API export
export const getlateApi = {
  connect: getlateConnect,
  accounts: getlateAccounts,
  posts: getlatePosts,
  analytics: getlateAnalytics,
};
