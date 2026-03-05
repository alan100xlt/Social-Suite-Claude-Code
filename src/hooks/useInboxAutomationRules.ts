import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi, type InboxAutoRule } from '@/lib/api/inbox';

export function useInboxAutoRules() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-auto-rules', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const result = await inboxApi.automationRules.list(selectedCompanyId);
      if (!result.success) throw new Error(result.error);
      return result.rules;
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useCreateAutoRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: Omit<InboxAutoRule, 'id' | 'company_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.automationRules.create(selectedCompanyId, params);
      if (!result.success) throw new Error(result.error);
      return result.rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-auto-rules', selectedCompanyId] });
    },
  });
}

export function useUpdateAutoRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...params }: { id: string } & Partial<InboxAutoRule>) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.automationRules.update(selectedCompanyId, id, params);
      if (!result.success) throw new Error(result.error);
      return result.rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-auto-rules', selectedCompanyId] });
    },
  });
}

export function useDeleteAutoRule() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const result = await inboxApi.automationRules.delete(selectedCompanyId, id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-auto-rules', selectedCompanyId] });
    },
  });
}
