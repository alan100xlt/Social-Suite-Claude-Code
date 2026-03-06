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

export function useClassifyConversation() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{
        category: string;
        subcategory: string;
        editorial_value: number;
        sentiment: string;
        confidence: number;
        language: string;
        topics: string[];
        priority: string;
      }>({
        action: 'classify',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}

export function useSuggestReplyV2() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{
        recommended: { content: string; label: string; reasoning: string };
        alternatives: Array<{ content: string; label: string }>;
        language: string;
        fused_from_canned: boolean;
      }>({
        action: 'suggest-reply-v2',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
  });
}

export function useTranslateMessage() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async (params: {
      conversationId?: string;
      messageId?: string;
      content?: string;
      targetLanguage: string;
    }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{ translated: string; targetLanguage: string }>({
        action: 'translate',
        companyId: selectedCompanyId,
        ...params,
      });
    },
  });
}

export function useContentRecycleCheck() {
  const { selectedCompanyId } = useSelectedCompany();

  return useMutation({
    mutationFn: async (conversationId?: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{
        suggestions: Array<{
          article_title: string;
          reason: string;
          suggested_angle: string;
          best_platform: string;
        }>;
      }>({
        action: 'content-recycle-check',
        companyId: selectedCompanyId,
        conversationId,
      });
    },
  });
}

export function useSaveFeedback() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      feedbackType: 'classification' | 'editorial_value' | 'sentiment';
      originalValue: Record<string, unknown>;
      correctedValue: Record<string, unknown>;
    }) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      return invokeInboxAI<{ feedback: unknown }>({
        action: 'save-feedback',
        companyId: selectedCompanyId,
        ...params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });
}
