import { supabase } from '@/integrations/supabase/client';

export interface GAProperty {
  propertyId: string;
  displayName: string;
  accountName: string;
}

export interface GAConnection {
  id: string;
  company_id: string;
  google_email: string;
  property_id: string;
  property_name: string | null;
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

export const googleAnalyticsApi = {
  async startAuth(companyId: string, redirectUrl: string): Promise<ApiResponse<{ authUrl: string }>> {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'start', companyId, redirectUrl },
    });

    if (error) return { success: false, error: error.message };
    return { success: data.success, data: { authUrl: data.authUrl }, error: data.error };
  },

  async handleCallback(
    code: string,
    redirectUrl: string,
    state?: string,
  ): Promise<ApiResponse<{ properties: GAProperty[]; refreshToken: string; accessToken: string; expiresIn: number; googleEmail: string }>> {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'callback', code, redirectUrl, state },
    });

    if (error) return { success: false, error: error.message };
    return {
      success: data.success,
      data: {
        properties: data.properties || [],
        refreshToken: data.refreshToken,
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        googleEmail: data.googleEmail,
      },
      error: data.error,
    };
  },

  async selectProperty(params: {
    companyId: string;
    propertyId: string;
    propertyName: string;
    refreshToken: string;
    accessToken?: string;
    expiresIn?: number;
    googleEmail?: string;
  }): Promise<ApiResponse<{ connection: GAConnection }>> {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'select-property', ...params },
    });

    if (error) return { success: false, error: error.message };
    return { success: data.success, data: { connection: data.connection }, error: data.error };
  },

  async disconnect(connectionId: string, companyId?: string): Promise<ApiResponse<void>> {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'disconnect', connectionId, companyId },
    });

    if (error) return { success: false, error: error.message };
    return { success: data.success, error: data.error };
  },

  async syncNow(companyId: string): Promise<ApiResponse<{ syncResult: Record<string, unknown> }>> {
    const { data, error } = await supabase.functions.invoke('google-analytics-auth', {
      body: { action: 'sync-now', companyId },
    });

    if (error) return { success: false, error: error.message };
    return { success: data.success, data: { syncResult: data.syncResult }, error: data.error };
  },
};
