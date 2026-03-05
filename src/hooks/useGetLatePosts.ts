import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getlatePosts, GetLatePost, MediaItem, Platform, ValidationResult } from '@/lib/api/getlate';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export function usePosts(params?: {
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
  platform?: Platform;
}) {
  const { data: company } = useCompany();
  const profileId = company?.getlate_profile_id;

  const isDemo = isDemoCompany(company?.id);

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
    // Demo company: don't run queryFn — rely on pre-seeded cache from DemoDataProvider
    enabled: !!company && !isDemo,
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
    onError: (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create post';
      const errorType = (error as Error & { errorType?: string }).errorType;
      const isTikTokError = errorMsg.toLowerCase().includes('tiktok');
      const imageInfo = variables.mediaItems?.[0]?.url;

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
      } else if (isTikTokError) {
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
      if (isDemoCompany(company?.id)) {
        // Demo: update cache directly instead of calling API
        const profileId = company?.getlate_profile_id;
        queryClient.setQueryData<GetLatePost[]>(
          ['getlate-posts', profileId],
          (old) => old?.map((p) => (p.id === postId ? { ...p, ...params } : p)) ?? [],
        );
        return undefined;
      }
      const result = await getlatePosts.update(postId, params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update post');
      }
      return result.data?.post;
    },
    onSuccess: () => {
      if (isDemoCompany(company?.id)) return; // cache already updated
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
      if (isDemoCompany(company?.id)) {
        // Demo: remove from cache directly
        const profileId = company?.getlate_profile_id;
        queryClient.setQueryData<GetLatePost[]>(
          ['getlate-posts', profileId],
          (old) => old?.filter((p) => p.id !== postId) ?? [],
        );
        return;
      }
      const result = await getlatePosts.delete(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete post');
      }
    },
    onSuccess: () => {
      if (isDemoCompany(company?.id)) return;
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
