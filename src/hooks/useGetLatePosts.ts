import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getlatePosts, GetLatePost, MediaItem, Platform, ValidationResult } from '@/lib/api/getlate';
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
        // Attach errorType so onError can differentiate
        const err = new Error(result.error || 'Failed to create post');
        (err as Error & { errorType?: string }).errorType = result.errorType;
        throw err;
      }
      // Return full response data including isPartial flag
      return result.data as { post: GetLatePost; isPartial?: boolean } | undefined;
    },
    onSuccess: (data) => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-posts', profileId] });

      const post = data?.post;
      const isPartial = data?.isPartial;

      if (isPartial) {
        // Identify failed platforms from platformResults
        const failed = (post?.platformResults || [])
          .filter(r => r.status === 'failed')
          .map(r => r.platform);
        toast({
          title: 'Post Partially Published',
          description: failed.length > 0
            ? `Published but failed on: ${failed.join(', ')}. Check your connections.`
            : 'Some platforms failed. Check your connections.',
          variant: 'destructive',
        });
      } else if (post?.scheduledFor) {
        toast({
          title: 'Post Scheduled',
          description: `Your post has been scheduled for ${new Date(post.scheduledFor).toLocaleString()}`,
        });
      } else {
        toast({
          title: 'Post Published',
          description: 'Your post has been published successfully!',
        });
      }
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create post';
      const errorType = (error as Error & { errorType?: string }).errorType;

      if (errorType === 'duplicate_content') {
        toast({
          title: 'Duplicate Content',
          description: 'This content was already posted in the last 24 hours.',
          variant: 'destructive',
        });
      } else if (errorType === 'rate_limit') {
        toast({
          title: 'Rate Limited',
          description: errorMsg,
          variant: 'destructive',
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

export function useUnpublishPost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({ postId, platforms }: { postId: string; platforms?: string[] }) => {
      const result = await getlatePosts.unpublish(postId, platforms);
      if (!result.success) {
        throw new Error(result.error || 'Failed to unpublish post');
      }
    },
    onSuccess: () => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-posts', profileId] });
      toast({
        title: 'Post Unpublished',
        description: 'The post has been removed from social platforms but kept in Longtale for analytics.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Unpublish Failed',
        description: error instanceof Error ? error.message : 'Failed to unpublish post',
        variant: 'destructive',
      });
    },
  });
}

export function useValidatePost() {
  return useMutation({
    mutationFn: async (params: {
      text: string;
      mediaItems?: MediaItem[];
      platforms?: string[];
      accountIds?: string[];
    }) => {
      const result = await getlatePosts.validatePost(params);
      if (!result.success) {
        throw new Error(result.error || 'Validation failed');
      }
      return result.data?.validation as ValidationResult;
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
