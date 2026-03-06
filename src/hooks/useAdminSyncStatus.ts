import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SyncStateEntry {
  id: string;
  company_id: string;
  platform: string;
  sync_type: string;
  last_synced_at: string;
  cursor: string | null;
}

export interface CronHealthLog {
  id: string;
  job_name: string;
  status: string;
  duration_ms: number;
  error_message: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function useAdminSyncStatus() {
  const syncStateQuery = useQuery({
    queryKey: ['admin-sync-state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_sync_state' as any)
        .select('*')
        .order('last_synced_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SyncStateEntry[];
    },
    refetchInterval: 30000,
  });

  const cronLogsQuery = useQuery({
    queryKey: ['admin-sync-cron-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_health_logs' as any)
        .select('*')
        .or('job_name.eq.inbox-sync-every-5-min,job_name.like.inbox-sync:%')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as CronHealthLog[];
    },
    refetchInterval: 30000,
  });

  const messageCountQuery = useQuery({
    queryKey: ['admin-sync-message-count-24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('inbox_messages' as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  return {
    syncStates: syncStateQuery.data || [],
    cronLogs: cronLogsQuery.data || [],
    messageCount24h: messageCountQuery.data || 0,
    isLoading: syncStateQuery.isLoading || cronLogsQuery.isLoading,
  };
}

export function useAdminApiHealth(functionFilter?: string, actionFilter?: string, statusFilter?: string, companyFilter?: string, page: number = 0) {
  const PAGE_SIZE = 50;
  return useQuery({
    queryKey: ['admin-api-health', functionFilter, actionFilter, statusFilter, companyFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('api_call_logs' as any)
        .select('*')
        .in('function_name', ['getlate-inbox', 'inbox-sync', 'inbox-ai'])
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (functionFilter) query = query.eq('function_name', functionFilter);
      if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);
      if (statusFilter === 'success') query = query.eq('success', true);
      if (statusFilter === 'error') query = query.eq('success', false);
      if (companyFilter) query = query.eq('company_id', companyFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    refetchInterval: 30000,
  });
}

export function useAdminApiHealthSummary() {
  return useQuery({
    queryKey: ['admin-api-health-summary'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('api_call_logs' as any)
        .select('success, duration_ms')
        .in('function_name', ['getlate-inbox', 'inbox-sync', 'inbox-ai'])
        .gte('created_at', since);

      if (error) throw error;
      const logs = (data || []) as { success: boolean; duration_ms: number | null }[];
      const total = logs.length;
      const successes = logs.filter(l => l.success).length;
      const errors = total - successes;
      const avgLatency = total > 0
        ? Math.round(logs.reduce((s, l) => s + (l.duration_ms || 0), 0) / total)
        : 0;

      return {
        total,
        successRate: total > 0 ? Math.round((successes / total) * 100) : 100,
        avgLatency,
        errors,
      };
    },
    refetchInterval: 60000,
  });
}
