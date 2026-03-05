import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { supabase } from '@/integrations/supabase/client';

async function invokeInboxAI<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('inbox-ai', { body });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'AI request failed');
  return data as T;
}

export function useAnalyzeSentiment() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{
        analysis: { sentiment: string; confidence: number; topics: string[] };
      }>({
        action: 'analyze-sentiment',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useSuggestReply() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{
        suggestions: Array<{ tone: string; content: string; label: string }>;
      }>({
        action: 'suggest-reply',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
  });
}

export function useSummarizeThread() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{ summary: string }>({
        action: 'summarize-thread',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
  });
}
