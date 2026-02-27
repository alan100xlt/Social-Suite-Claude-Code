import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingInvitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  expires_at: string;
  invited_by: string;
}

export function usePendingInvitations(companyId: string | undefined) {
  return useQuery({
    queryKey: ['pending-invitations', companyId],
    queryFn: async (): Promise<PendingInvitation[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('company_invitations')
        .select('id, email, role, created_at, expires_at, invited_by')
        .eq('company_id', companyId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast({
        title: 'Invitation Revoked',
        description: 'The invitation has been revoked successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Revoke',
        description: error instanceof Error ? error.message : 'Failed to revoke invitation',
        variant: 'destructive',
      });
    },
  });
}
