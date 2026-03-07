import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export function useSyncAnalytics() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-sync', {
        body: { companyId: company?.id },
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync analytics');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analytics sync failed');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate all analytics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['account-growth'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated-followers'] });
      queryClient.invalidateQueries({ queryKey: ['top-posts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-by-publish-date'] });
      queryClient.invalidateQueries({ queryKey: ['platform-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['content-decay'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
      queryClient.invalidateQueries({ queryKey: ['last-sync-time'] });
      queryClient.invalidateQueries({ queryKey: ['all-posts-with-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['best-time-to-post'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-account-ids'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
      queryClient.invalidateQueries({ queryKey: ['post-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-daily-views'] });
      queryClient.invalidateQueries({ queryKey: ['follower-stats'] });
      queryClient.invalidateQueries({ queryKey: ['account-health'] });

      toast.success('Analytics synced', {
        description: `Synced ${data.postSnapshots || 0} posts and ${data.accountSnapshots || 0} accounts`,
      });
    },
    onError: (error) => {
      console.error('Analytics sync error:', error);
      toast.error('Sync failed', {
        description: error.message,
      });
    },
  });
}
