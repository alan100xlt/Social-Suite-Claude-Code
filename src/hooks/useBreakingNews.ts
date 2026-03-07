import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getlateApi } from '@/lib/api/getlate';

interface BreakingNewsInput {
  text: string;
  accountIds: string[];
  mediaUrl?: string;
}

export function usePublishBreakingNews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BreakingNewsInput) => {
      const result = await getlateApi.posts.create({
        text: input.text,
        accountIds: input.accountIds,
        mediaUrls: input.mediaUrl ? [input.mediaUrl] : undefined,
        publishNow: true,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getlate-posts'] });
      toast({ title: 'Breaking News Published', description: 'Published to all selected platforms.' });
    },
    onError: (error) => {
      toast({
        title: 'Publish Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
