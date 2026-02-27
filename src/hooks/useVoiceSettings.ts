import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export type VoiceMode = 'default' | 'custom' | 'custom_dynamic_ai' | 'custom_strict_ai' | 'ai_decides';
export type Tone = 'neutral' | 'friendly' | 'urgent' | 'engagement';
export type ContentLength = 'headline' | 'bullets' | 'standard' | 'full';
export type EmojiStyle = 'none' | 'minimalist' | 'contextual' | 'heavy';
export type HashtagStrategy = 'none' | 'smart' | 'brand_only' | 'smart_and_brand';

export interface VoiceSettings {
  id?: string;
  company_id: string;
  voice_mode: VoiceMode;
  require_ai_review: boolean;
  tone: Tone;
  content_length: ContentLength;
  emoji_style: EmojiStyle;
  hashtag_strategy: HashtagStrategy;
  brand_tags: string[];
  extract_locations: boolean;
  custom_instructions: string | null;
}

export const VOICE_DEFAULTS: Omit<VoiceSettings, 'id' | 'company_id'> = {
  voice_mode: 'default',
  require_ai_review: false,
  tone: 'neutral',
  content_length: 'standard',
  emoji_style: 'contextual',
  hashtag_strategy: 'smart',
  brand_tags: [],
  extract_locations: false,
  custom_instructions: null,
};

export function useVoiceSettings() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['voice-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('company_voice_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as VoiceSettings | null;
    },
    enabled: !!company?.id,
  });
}

export function useSaveVoiceSettings() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<VoiceSettings, 'id' | 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload = { ...settings, company_id: company.id };

      // Try update first, then insert
      const { data: existing } = await (supabase as any)
        .from('company_voice_settings')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('company_voice_settings')
          .update(settings)
          .eq('company_id', company.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('company_voice_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-settings'] });
      toast({ title: 'Saved', description: 'Brand voice settings updated.' });
    },
    onError: (err) => {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    },
  });
}
