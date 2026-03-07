import { useQuery } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export interface MemberWorkload {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  assignedCount: number;
  resolvedToday: number;
  openCount: number;
}

export function useTeamWorkload() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['team-workload', selectedCompanyId],
    queryFn: async (): Promise<MemberWorkload[]> => {
      if (!selectedCompanyId) return [];

      // Get company members
      const { data: memberships } = await supabase
        .from('company_memberships')
        .select('user_id, role')
        .eq('company_id', selectedCompanyId);

      if (!memberships?.length) return [];

      const userIds = memberships.map(m => m.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      // Get all conversations for this company
      const { data: conversations } = await supabase
        .from('inbox_conversations')
        .select('id, assigned_to, status, updated_at')
        .eq('company_id', selectedCompanyId);

      const today = new Date().toISOString().split('T')[0];
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const workloads: MemberWorkload[] = userIds.map(uid => {
        const profile = profileMap.get(uid);
        const assigned = (conversations || []).filter(c => c.assigned_to === uid);
        const resolvedToday = assigned.filter(c => c.status === 'resolved' && c.updated_at?.startsWith(today));
        const open = assigned.filter(c => c.status === 'open' || c.status === 'pending');

        return {
          userId: uid,
          fullName: profile?.full_name || profile?.email || 'Unknown',
          email: profile?.email || '',
          avatarUrl: profile?.avatar_url || null,
          assignedCount: assigned.length,
          resolvedToday: resolvedToday.length,
          openCount: open.length,
        };
      });

      return workloads.sort((a, b) => b.assignedCount - a.assignedCount);
    },
    enabled: !!selectedCompanyId && !isDemo,
    staleTime: 60000,
  });
}
