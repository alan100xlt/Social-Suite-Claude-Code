import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export interface RssFeed {
  id: string;
  company_id: string;
  name: string;
  url: string;
  is_active: boolean;
  auto_publish: boolean;
  enable_scraping: boolean;
  poll_interval_minutes: number;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RssFeedItem {
  id: string;
  feed_id: string;
  guid: string;
  title: string | null;
  link: string | null;
  description: string | null;
  full_content: string | null;
  image_url: string | null;
  published_at: string | null;
  processed_at: string | null;
  post_id: string | null;
  status: 'pending' | 'posted' | 'failed' | 'skipped';
  created_at: string;
  og_image_url: string | null;
  og_template_id: string | null;
  og_ai_reasoning: string | null;
}

export function useRssFeeds() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['rss-feeds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('rss_feeds')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RssFeed[];
    },
    enabled: !!company?.id,
  });
}

export function useRssFeedItems(feedId: string) {
  return useQuery({
    queryKey: ['rss-feed-items', feedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rss_feed_items')
        .select('*')
        .eq('feed_id', feedId)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as RssFeedItem[];
    },
    enabled: !!feedId,
  });
}

export function useCreateRssFeed() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, url, enableScraping }: { name: string; url: string; enableScraping?: boolean }) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('rss_feeds')
        .insert({
          company_id: company.id,
          name,
          url,
          auto_publish: false,
          enable_scraping: enableScraping ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RssFeed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast({
        title: 'Feed Added',
        description: 'RSS feed has been added and will start polling shortly.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Feed',
        description: error instanceof Error ? error.message : 'Failed to add RSS feed',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRssFeed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RssFeed> & { id: string }) => {
      const { data, error } = await supabase
        .from('rss_feeds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RssFeed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast({
        title: 'Feed Updated',
        description: 'RSS feed settings have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update feed',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRssFeed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const { error } = await supabase
        .from('rss_feeds')
        .delete()
        .eq('id', feedId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast({
        title: 'Feed Deleted',
        description: 'RSS feed has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete feed',
        variant: 'destructive',
      });
    },
  });
}
