import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GlobalVoiceDefaults {
  id?: string;
  tone: string;
  content_length: string;
  emoji_style: string;
  hashtag_strategy: string;
  brand_tags: string[];
  extract_locations: boolean;
  custom_instructions: string | null;
}

export function useGlobalVoiceDefaults() {
  return useQuery({
    queryKey: ['global-voice-defaults'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('global_voice_defaults')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as GlobalVoiceDefaults | null;
    },
  });
}

export function useSaveGlobalVoiceDefaults() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<GlobalVoiceDefaults, 'id'>) => {
      const { data: existing } = await (supabase as any)
        .from('global_voice_defaults')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('global_voice_defaults')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('global_voice_defaults')
          .insert(settings);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-voice-defaults'] });
      toast({ title: 'Saved', description: 'Global voice defaults updated.' });
    },
    onError: (err) => {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    },
  });
}
