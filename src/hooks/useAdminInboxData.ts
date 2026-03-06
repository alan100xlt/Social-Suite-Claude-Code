import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type InboxTableName = 'conversations' | 'messages' | 'contacts' | 'sync_state';

const TABLE_MAP: Record<InboxTableName, string> = {
  conversations: 'inbox_conversations',
  messages: 'inbox_messages',
  contacts: 'inbox_contacts',
  sync_state: 'inbox_sync_state',
};

const PAGE_SIZE = 50;

export function useAdminInboxData(table: InboxTableName, companyId: string | null, page: number = 0) {
  return useQuery({
    queryKey: ['admin-inbox-data', table, companyId, page],
    queryFn: async () => {
      let query = supabase
        .from(TABLE_MAP[table] as any)
        .select('*')
        .order('created_at' in {} ? 'created_at' : 'id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    staleTime: 30000,
  });
}

export function useAdminCompanies() {
  return useQuery({
    queryKey: ['admin-companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });
}
