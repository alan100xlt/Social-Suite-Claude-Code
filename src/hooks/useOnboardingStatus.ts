import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export interface OnboardingStatus {
  onboarding_status: string;
  onboarding_step: number;
}

export function useOnboardingStatus() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['onboarding-status', company?.id],
    queryFn: async (): Promise<OnboardingStatus | null> => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('onboarding_status, onboarding_step')
        .eq('id', company.id)
        .single();

      if (error) return null;
      return data as OnboardingStatus;
    },
    enabled: !!company?.id,
  });
}

export function useUpdateOnboardingStep() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (step: number) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('companies')
        .update({ onboarding_step: step })
        .eq('id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

export function useFinishWizard() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('companies')
        .update({ onboarding_status: 'wizard_complete', onboarding_step: 3 })
        .eq('id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

export function useCompleteOnboarding() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('companies')
        .update({ onboarding_status: 'complete', onboarding_step: 3 })
        .eq('id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}
