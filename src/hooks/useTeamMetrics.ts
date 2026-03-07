import { useQuery } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMetrics {
  totalConversations: number;
  avgResponseTimeMinutes: number | null;
  resolvedCount: number;
  openCount: number;
  sentimentDistribution: Record<string, number>;
  perMember: {
    userId: string;
    name: string;
    assigned: number;
    resolved: number;
    avgResponseMinutes: number | null;
  }[];
}

export function useTeamMetrics(days = 30) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['team-metrics', selectedCompanyId, days],
    queryFn: async (): Promise<TeamMetrics> => {
      if (!selectedCompanyId) throw new Error('No company');

      const since = new Date(Date.now() - days * 86400000).toISOString();

      // Get conversations in time range
      const { data: conversations } = await supabase
        .from('inbox_conversations')
        .select('id, assigned_to, status, sentiment, created_at, updated_at')
        .eq('company_id', selectedCompanyId)
        .gte('created_at', since);

      // Get activity logs for response time calculation
      const { data: activities } = await supabase
        .from('inbox_activity_log')
        .select('user_id, action, conversation_id, created_at, metadata')
        .eq('company_id', selectedCompanyId)
        .gte('created_at', since);

      const convs = conversations || [];
      const _acts = activities || [];

      // Sentiment distribution
      const sentimentDistribution: Record<string, number> = {};
      for (const c of convs) {
        const s = c.sentiment || 'neutral';
        sentimentDistribution[s] = (sentimentDistribution[s] || 0) + 1;
      }

      // Per-member stats
      const memberMap = new Map<string, { assigned: number; resolved: number; name: string }>();
      for (const c of convs) {
        if (c.assigned_to) {
          const existing = memberMap.get(c.assigned_to) || { assigned: 0, resolved: 0, name: '' };
          existing.assigned++;
          if (c.status === 'resolved') existing.resolved++;
          memberMap.set(c.assigned_to, existing);
        }
      }

      // Get member names
      const memberIds = [...memberMap.keys()];
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberIds);
        for (const p of profiles || []) {
          const m = memberMap.get(p.id);
          if (m) m.name = p.full_name || p.email || 'Unknown';
        }
      }

      return {
        totalConversations: convs.length,
        avgResponseTimeMinutes: null, // TODO: compute from first reply activity
        resolvedCount: convs.filter(c => c.status === 'resolved').length,
        openCount: convs.filter(c => c.status === 'open').length,
        sentimentDistribution,
        perMember: [...memberMap.entries()].map(([userId, stats]) => ({
          userId,
          name: stats.name,
          assigned: stats.assigned,
          resolved: stats.resolved,
          avgResponseMinutes: null,
        })),
      };
    },
    enabled: !!selectedCompanyId && !isDemo,
    staleTime: 60000,
  });
}
