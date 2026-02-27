import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export interface AutomationRule {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  feed_id: string | null;
  objective: string;
  action: string;
  scheduling: string;
  approval_emails: string[];
  account_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useAutomationRules() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['automation-rules', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateAutomationRule() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<AutomationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          company_id: company.id,
          name: rule.name,
          is_active: rule.is_active,
          feed_id: rule.feed_id,
          objective: rule.objective,
          action: rule.action,
          scheduling: rule.scheduling,
          approval_emails: rule.approval_emails,
          account_ids: rule.account_ids,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Rule Created', description: 'Automation rule has been created.' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Rule',
        description: error instanceof Error ? error.message : 'Failed to create automation rule',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAutomationRule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Rule Updated', description: 'Automation rule has been updated.' });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update rule',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAutomationRule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Rule Deleted', description: 'Automation rule has been removed.' });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete rule',
        variant: 'destructive',
      });
    },
  });
}
