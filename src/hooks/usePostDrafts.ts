import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export interface PostDraft {
  id: string;
  company_id: string;
  created_by: string;
  updated_by: string | null;
  title: string | null;
  post_source: string | null;
  selected_article_id: string | null;
  objective: string | null;
  selected_account_ids: string[];
  platform_contents: Record<string, any>;
  strategy: string | null;
  image_url: string | null;
  current_step: number;
  compose_phase: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function usePostDrafts() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['post-drafts', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_drafts' as any)
        .select('*')
        .eq('company_id', company!.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PostDraft[];
    },
    enabled: !!company,
  });
}

export function usePostDraft(draftId: string | null) {
  return useQuery({
    queryKey: ['post-draft', draftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_drafts' as any)
        .select('*')
        .eq('id', draftId!)
        .single();

      if (error) throw error;
      return data as unknown as PostDraft;
    },
    enabled: !!draftId,
  });
}

export function useSaveDraft() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      title?: string | null;
      post_source?: string | null;
      selected_article_id?: string | null;
      objective?: string | null;
      selected_account_ids?: string[];
      platform_contents?: Record<string, any>;
      strategy?: string | null;
      image_url?: string | null;
      current_step?: number;
      compose_phase?: string | null;
      status?: string;
    }) => {
      if (!company) throw new Error('No company');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (params.id) {
        // Update existing draft
        const { id, ...updates } = params;
        const { data, error } = await supabase
          .from('post_drafts' as any)
          .update({ ...updates, updated_by: user.id } as any)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as PostDraft;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('post_drafts' as any)
          .insert({
            company_id: company.id,
            created_by: user.id,
            updated_by: user.id,
            ...params,
          } as any)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as PostDraft;
      }
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });

      // Send in-app notification for new drafts (not updates)
      if (!variables.id && data?.id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            supabase.functions.invoke('send-in-app-notification', {
              body: {
                userId: user.id,
                title: '📝 Draft Created',
                body: `New draft "${variables.title || 'Untitled'}" has been saved.`,
                actionUrl: `/posts?draft=${data.id}`,
              },
            });
          }
        } catch (e) {
          console.error('Draft notification error:', e);
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save draft',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDraft() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('post_drafts' as any)
        .delete()
        .eq('id', draftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Draft deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete draft',
        variant: 'destructive',
      });
    },
  });
}
