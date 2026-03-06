import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export interface InboxAISettings {
  company_id: string;
  company_type: 'media' | 'brand' | 'agency';
  auto_classify: boolean;
  smart_acknowledgment: boolean;
  crisis_detection: boolean;
  crisis_threshold: number;
  crisis_window_minutes: number;
  auto_translate: boolean;
  content_recycling: boolean;
  ai_calls_count: number;
  ai_calls_reset_at: string;
  created_at: string;
  updated_at: string;
}

const DEMO_SETTINGS: InboxAISettings = {
  company_id: 'demo-longtale',
  company_type: 'media',
  auto_classify: true,
  smart_acknowledgment: false,
  crisis_detection: false,
  crisis_threshold: 5,
  crisis_window_minutes: 30,
  auto_translate: false,
  content_recycling: false,
  ai_calls_count: 47,
  ai_calls_reset_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useInboxAISettings() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['inbox-ai-settings', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      if (isDemo) return DEMO_SETTINGS;

      const { data, error } = await supabase
        .from('inbox_ai_settings' as any)
        .select('*')
        .eq('company_id', selectedCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as InboxAISettings | null;
    },
    enabled: !!selectedCompanyId,
  });
}

export function useUpsertInboxAISettings() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<InboxAISettings>) => {
      if (!selectedCompanyId) throw new Error('No company selected');

      const { data, error } = await supabase
        .from('inbox_ai_settings' as any)
        .upsert({
          company_id: selectedCompanyId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data as InboxAISettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-ai-settings', selectedCompanyId] });
    },
  });
}
