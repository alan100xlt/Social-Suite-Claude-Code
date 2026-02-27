import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePollRssFeed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const { data, error } = await supabase.functions.invoke('rss-poll', {
        body: { feedId, backfillImages: true },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to poll feed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rss-feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast({
        title: 'Feed Updated',
        description: `Found ${data.newItems} new article(s), ${data.skippedDuplicates} already existed.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Poll Failed',
        description: error instanceof Error ? error.message : 'Failed to fetch articles',
        variant: 'destructive',
      });
    },
  });
}
