import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export interface RoutingRule {
  id: string;
  company_id: string;
  category: string;
  subcategory: string | null;
  assigned_to: string | null;
  desk_name: string | null;
  priority_override: string | null;
  enabled: boolean;
  created_at: string;
}

export function useRoutingRules() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['routing-rules', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('category');
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        enabled: d.enabled ?? true,
      })) as RoutingRule[];
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useCreateRoutingRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<RoutingRule, 'id' | 'company_id' | 'created_at'>) => {
      if (!selectedCompanyId) throw new Error('No company');
      const { data, error } = await supabase
        .from('routing_rules')
        .insert({ ...rule, company_id: selectedCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules', selectedCompanyId] });
    },
  });
}

export function useUpdateRoutingRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoutingRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('routing_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules', selectedCompanyId] });
    },
  });
}

export function useDeleteRoutingRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules', selectedCompanyId] });
    },
  });
}
