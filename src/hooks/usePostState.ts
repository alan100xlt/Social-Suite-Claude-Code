import { useMemo } from 'react';
import { RssFeedItem } from '@/hooks/useRssFeeds';
import { usePostDrafts } from '@/hooks/usePostDrafts';
import { useQuery } from '@tanstack/react-query';

export type PostState = 'future' | 'published' | 'draft' | 'processing';

interface PostStateData {
  state: PostState;
  isEditable: boolean;
  hasAnalytics: boolean;
  needsAction: boolean;
}

export function usePostState(item: RssFeedItem): PostStateData {
  const { data: drafts } = usePostDrafts();
  
  return useMemo(() => {
    // Check if it's a draft
    const isDraft = drafts?.some(d => d.selected_article_id === item.id);
    
    // Check if it's published
    const isPublished = item.status === 'posted';
    
    // Check if it's processing (has automation logs but not posted)
    const isProcessing = item.status === 'pending' && !isDraft;
    
    // Determine primary state
    let state: PostState;
    let isEditable = false;
    let hasAnalytics = false;
    let needsAction = false;
    
    if (isDraft) {
      state = 'draft';
      isEditable = true;
      needsAction = true;
    } else if (isPublished) {
      state = 'published';
      isEditable = false;
      hasAnalytics = true;
      needsAction = false;
    } else if (isProcessing) {
      state = 'processing';
      isEditable = false;
      hasAnalytics = false;
      needsAction = false;
    } else {
      // Future/scheduled posts
      state = 'future';
      isEditable = true;
      hasAnalytics = false;
      needsAction = true;
    }
    
    return {
      state,
      isEditable,
      hasAnalytics,
      needsAction
    };
  }, [item, drafts]);
}

export default usePostState;
