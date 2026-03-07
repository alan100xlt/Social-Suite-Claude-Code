import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isDemoCompany } from '@/lib/demo/demo-constants';

export interface Campaign {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  post_count?: number;
}

export interface CampaignPost {
  id: string;
  campaign_id: string;
  post_id: string;
  added_by: string | null;
  added_at: string;
  sort_order: number;
}

export function useCampaigns() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['campaigns', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId || isDemoCompany(selectedCompanyId)) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select('*, campaign_posts(count)')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        post_count: c.campaign_posts?.[0]?.count || 0,
      })) as Campaign[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useCampaignPosts(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-posts', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order');

      if (error) throw error;
      return data as CampaignPost[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const { user } = useAuth();
  const { selectedCompanyId } = useSelectedCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; start_date?: string; end_date?: string }) => {
      if (!user?.id || !selectedCompanyId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          company_id: selectedCompanyId,
          name: input.name,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign Created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create campaign', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useUpdateCampaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign Updated' });
    },
  });
}

export function useDeleteCampaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign Deleted' });
    },
  });
}

export function useAddPostToCampaign() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, postId }: { campaignId: string; postId: string }) => {
      const { error } = await supabase
        .from('campaign_posts')
        .insert({
          campaign_id: campaignId,
          post_id: postId,
          added_by: user?.id || null,
        });
      if (error) throw error;
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-posts', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useRemovePostFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, postId }: { campaignId: string; postId: string }) => {
      const { error } = await supabase
        .from('campaign_posts')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('post_id', postId);
      if (error) throw error;
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-posts', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
