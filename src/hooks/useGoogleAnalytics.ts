import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { googleAnalyticsApi, GAConnection } from '@/lib/api/google-analytics';

export function useGAConnections() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['ga-connections', companyId],
    queryFn: async (): Promise<GAConnection[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('google_analytics_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as GAConnection[];
    },
    enabled: !!companyId,
  });
}

export function useConnectGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      propertyId: string;
      propertyName: string;
      refreshToken: string;
      accessToken?: string;
      expiresIn?: number;
      googleEmail?: string;
    }) => {
      const result = await googleAnalyticsApi.selectProperty(params);
      if (!result.success) throw new Error(result.error || 'Failed to connect');
      return result.data?.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ga-connections'] });
    },
  });
}

export function useDisconnectGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { connectionId: string; companyId?: string }) => {
      const result = await googleAnalyticsApi.disconnect(params.connectionId, params.companyId);
      if (!result.success) throw new Error(result.error || 'Failed to disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ga-connections'] });
    },
  });
}

export function useSyncGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const result = await googleAnalyticsApi.syncNow(companyId);
      if (!result.success) throw new Error(result.error || 'Sync failed');
      return result.data?.syncResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ga-page-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ga-traffic-sources'] });
      queryClient.invalidateQueries({ queryKey: ['content-journey'] });
      queryClient.invalidateQueries({ queryKey: ['ga-connections'] });
    },
  });
}
