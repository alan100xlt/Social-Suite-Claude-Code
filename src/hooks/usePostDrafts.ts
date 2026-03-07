import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useHasPermission } from '@/hooks/usePermissions';
import { canTransition, type ContentStatus } from '@/lib/content-workflow';

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
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  reviewer_id: string | null;
  due_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
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

// --- Content Workflow Mutations ---

async function logContentActivity(
  companyId: string,
  userId: string,
  action: string,
  draftId: string,
  metadata: Record<string, any> = {}
) {
  await supabase.from('inbox_activity_log').insert({
    company_id: companyId,
    user_id: userId,
    action,
    entity_type: 'content',
    entity_id: draftId,
    metadata,
  });
}

async function notifyWorkflowEvent(
  userId: string,
  title: string,
  body: string,
  draftId: string
) {
  try {
    await supabase.functions.invoke('send-in-app-notification', {
      body: { userId, title, body, actionUrl: `/app/content?draft=${draftId}` },
    });
  } catch (e) {
    console.error('Workflow notification error:', e);
  }
}

export function useSubmitForApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async ({ draftId, currentStatus, reviewerId }: {
      draftId: string;
      currentStatus: ContentStatus;
      reviewerId?: string;
    }) => {
      if (!canTransition(currentStatus, 'awaiting_approval')) {
        throw new Error(`Cannot submit for approval from status "${currentStatus}"`);
      }
      if (!selectedCompanyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_drafts' as any)
        .update({
          status: 'awaiting_approval',
          reviewer_id: reviewerId || null,
          updated_by: user.id,
        } as any)
        .eq('id', draftId);
      if (error) throw error;

      await logContentActivity(selectedCompanyId, user.id, 'content_submitted', draftId, {
        user_name: user.email,
      });

      if (reviewerId) {
        await notifyWorkflowEvent(reviewerId, '📋 Review Requested', 'A draft has been submitted for your review.', draftId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Submitted for approval' });
    },
    onError: (error) => {
      toast({ title: 'Submit Failed', description: error instanceof Error ? error.message : 'Failed to submit', variant: 'destructive' });
    },
  });
}

export function useApproveContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();
  const hasPublish = useHasPermission('publish');

  return useMutation({
    mutationFn: async ({ draftId, currentStatus, authorId }: {
      draftId: string;
      currentStatus: ContentStatus;
      authorId: string;
    }) => {
      if (!hasPublish) throw new Error('You do not have permission to approve content');
      if (!canTransition(currentStatus, 'approved')) {
        throw new Error(`Cannot approve from status "${currentStatus}"`);
      }
      if (!selectedCompanyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_drafts' as any)
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          updated_by: user.id,
        } as any)
        .eq('id', draftId);
      if (error) throw error;

      await logContentActivity(selectedCompanyId, user.id, 'content_approved', draftId, {
        user_name: user.email,
      });

      await notifyWorkflowEvent(authorId, '✅ Content Approved', 'Your draft has been approved.', draftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Content approved' });
    },
    onError: (error) => {
      toast({ title: 'Approve Failed', description: error instanceof Error ? error.message : 'Failed to approve', variant: 'destructive' });
    },
  });
}

export function useRejectContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();
  const hasPublish = useHasPermission('publish');

  return useMutation({
    mutationFn: async ({ draftId, currentStatus, authorId, reason }: {
      draftId: string;
      currentStatus: ContentStatus;
      authorId: string;
      reason?: string;
    }) => {
      if (!hasPublish) throw new Error('You do not have permission to reject content');
      if (!canTransition(currentStatus, 'rejected')) {
        throw new Error(`Cannot reject from status "${currentStatus}"`);
      }
      if (!selectedCompanyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_drafts' as any)
        .update({
          status: 'rejected',
          rejection_reason: reason || null,
          updated_by: user.id,
        } as any)
        .eq('id', draftId);
      if (error) throw error;

      await logContentActivity(selectedCompanyId, user.id, 'content_rejected', draftId, {
        user_name: user.email,
        reason,
      });

      await notifyWorkflowEvent(authorId, '❌ Content Rejected', reason || 'Your draft was not approved.', draftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Content rejected' });
    },
    onError: (error) => {
      toast({ title: 'Reject Failed', description: error instanceof Error ? error.message : 'Failed to reject', variant: 'destructive' });
    },
  });
}

export function usePullContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async ({ draftId, currentStatus }: {
      draftId: string;
      currentStatus: ContentStatus;
    }) => {
      if (!canTransition(currentStatus, 'pulled')) {
        throw new Error(`Cannot pull from status "${currentStatus}"`);
      }
      if (!selectedCompanyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_drafts' as any)
        .update({ status: 'pulled', updated_by: user.id } as any)
        .eq('id', draftId);
      if (error) throw error;

      await logContentActivity(selectedCompanyId, user.id, 'content_pulled', draftId, {
        user_name: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Content pulled' });
    },
    onError: (error) => {
      toast({ title: 'Pull Failed', description: error instanceof Error ? error.message : 'Failed to pull', variant: 'destructive' });
    },
  });
}

export function useAssignDraft() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async ({ draftId, assigneeId }: {
      draftId: string;
      assigneeId: string;
    }) => {
      if (!selectedCompanyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_drafts' as any)
        .update({ assigned_to: assigneeId, updated_by: user.id } as any)
        .eq('id', draftId);
      if (error) throw error;

      await logContentActivity(selectedCompanyId, user.id, 'content_assigned', draftId, {
        user_name: user.email,
        assignee_id: assigneeId,
      });

      await notifyWorkflowEvent(assigneeId, '📝 Draft Assigned', 'A draft has been assigned to you.', draftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-drafts'] });
      toast({ title: 'Draft assigned' });
    },
    onError: (error) => {
      toast({ title: 'Assign Failed', description: error instanceof Error ? error.message : 'Failed to assign', variant: 'destructive' });
    },
  });
}
