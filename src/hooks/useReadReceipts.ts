import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export interface ReadReceipt {
  user_id: string;
  conversation_id: string;
  last_read_at: string;
  user_name?: string;
  user_avatar?: string;
}

export function useReadReceipts(conversationIds: string[]) {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['read-receipts', conversationIds.sort().join(',')],
    queryFn: async () => {
      if (!conversationIds.length || !selectedCompanyId) return {};

      const { data: receipts, error } = await supabase
        .from('inbox_read_status')
        .select('user_id, conversation_id, last_read_at')
        .in('conversation_id', conversationIds);

      if (error) throw error;

      // Get unique user IDs (excluding current user)
      const userIds = [...new Set((receipts || []).filter(r => r.user_id !== user?.id).map(r => r.user_id))];
      let userMap: Record<string, { name: string; avatar: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        userMap = Object.fromEntries(
          (profiles || []).map(p => [p.id, {
            name: p.full_name || p.email || 'Unknown',
            avatar: p.avatar_url,
          }])
        );
      }

      // Group by conversation_id, exclude current user
      const grouped: Record<string, ReadReceipt[]> = {};
      for (const r of receipts || []) {
        if (r.user_id === user?.id) continue;
        if (!grouped[r.conversation_id]) grouped[r.conversation_id] = [];
        grouped[r.conversation_id].push({
          ...r,
          user_name: userMap[r.user_id]?.name || 'Unknown',
          user_avatar: userMap[r.user_id]?.avatar || undefined,
        });
      }

      return grouped;
    },
    enabled: conversationIds.length > 0 && !!selectedCompanyId && !isDemo,
    staleTime: 30000,
  });
}
