import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';

export interface KokoThread {
  id: string;
  title: string | null;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useKokoThreads() {
  const { user } = useAuth();
  const { data: company } = useCompany();

  const query = useQuery({
    queryKey: ['koko-threads', company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('company_id', company.id)
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as KokoThread[];
    },
    enabled: !!company?.id && !!user?.id,
  });

  return {
    threads: query.data ?? [],
    isLoading: query.isLoading,
    ...query,
  };
}

export function useCreateKokoThread() {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated or no company selected');

      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          company_id: company.id,
          created_by: user.id,
          title: title ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KokoThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koko-threads'] });
    },
  });
}
