import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRssFeeds, RssFeedItem } from '@/hooks/useRssFeeds';

export interface FeedItemWithFeedName extends RssFeedItem {
  feed_name: string;
}

export function useAllFeedItems() {
  const { data: feeds } = useRssFeeds();
  const feedIds = feeds?.map(f => f.id) || [];
  const feedNameMap = new Map(feeds?.map(f => [f.id, f.name]) || []);

  return useQuery({
    queryKey: ['all-feed-items', feedIds],
    queryFn: async (): Promise<FeedItemWithFeedName[]> => {
      if (feedIds.length === 0) return [];

      const { data, error } = await supabase
        .from('rss_feed_items')
        .select('*')
        .in('feed_id', feedIds)
        .order('published_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return (data as RssFeedItem[]).map(item => ({
        ...item,
        feed_name: feedNameMap.get(item.feed_id) || 'Unknown Feed',
      }));
    },
    enabled: feedIds.length > 0,
  });
}
