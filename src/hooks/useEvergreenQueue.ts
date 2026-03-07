import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export interface EvergreenItem {
  id: string;
  company_id: string;
  original_post_id: string | null;
  article_id: string | null;
  variation_text: string;
  status: 'pending' | 'published' | 'skipped' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  published_post_id: string | null;
  created_at: string;
  article_title?: string;
}

export function useEvergreenQueue() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['evergreen-queue', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId || isDemoCompany(selectedCompanyId)) return [];

      const { data, error } = await supabase
        .from('evergreen_queue')
        .select('*, rss_feed_items(title)')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        article_title: item.rss_feed_items?.title || null,
      })) as EvergreenItem[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useSkipEvergreenItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evergreen_queue')
        .update({ status: 'skipped', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evergreen-queue'] });
      toast({ title: 'Item skipped' });
    },
  });
}
