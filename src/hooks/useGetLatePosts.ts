import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getlatePosts, GetLatePost, MediaItem, Platform } from '@/lib/api/getlate';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';

export function usePosts(params?: {
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
  platform?: Platform;
}) {
  const { data: company } = useCompany();
  const profileId = company?.getlate_profile_id;

  return useQuery({
    queryKey: ['getlate-posts', profileId, params],
    queryFn: async () => {
      // If no profile ID, return empty array
      if (!profileId) {
        return [];
      }
      
      const result = await getlatePosts.list({ ...params, profileId });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch posts');
      }
      return result.data?.posts || [];
    },
    enabled: !!company,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['getlate-post', postId],
    queryFn: async () => {
      const result = await getlatePosts.get(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch post');
      }
      return result.data?.post;
    },
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      accountIds: string[];
      text: string;
      mediaItems?: MediaItem[];
      scheduledFor?: string;
      publishNow?: boolean;
      source?: string;
      objective?: string;
      platforms?: Array<{
        platform: string;
        accountId: string;
        content: string;
        platformSpecificData?: Record<string, unknown>;
      }>;
    }) => {
      const profileId = company?.getlate_profile_id;
      const result = await getlatePosts.create({ ...params, profileId });
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post');
      }
      return result.data?.post;
    },
    onSuccess: (post) => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-posts', profileId] });
      toast({
        title: post?.scheduledFor ? 'Post Scheduled' : 'Post Published',
        description: post?.scheduledFor 
          ? `Your post has been scheduled for ${new Date(post.scheduledFor).toLocaleString()}`
          : 'Your post has been published successfully!',
      });
    },
    onError: (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create post';
      const isTikTokError = errorMsg.toLowerCase().includes('tiktok');
      const imageInfo = variables.mediaItems?.[0]?.url;
      
      if (isTikTokError) {
        toast({
          title: 'GetLate API Error: TikTok Processing',
          description: `The GetLate API attempted TikTok image processing even though this post was not targeting TikTok. This is a known API issue.${imageInfo ? ` Image: ${imageInfo}` : ''}`,
          variant: 'destructive',
        });
        console.error('[GetLate API Bug] TikTok processing triggered for non-TikTok post:', {
          error: errorMsg,
          accountIds: variables.accountIds,
          imageUrl: imageInfo,
        });
      } else {
        toast({
          title: 'Post Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    },
  });
}

export function useUpdatePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({ postId, ...params }: { postId: string; text?: string; scheduledFor?: string }) => {
      const result = await getlatePosts.update(postId, params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update post');
      }
      return result.data?.post;
    },
    onSuccess: () => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-posts', profileId] });
      toast({
        title: 'Post Updated',
        description: 'Your post has been updated successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update post',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await getlatePosts.delete(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete post');
      }
    },
    onSuccess: () => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-posts', profileId] });
      toast({
        title: 'Post Deleted',
        description: 'Your post has been deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete post',
        variant: 'destructive',
      });
    },
  });
}
