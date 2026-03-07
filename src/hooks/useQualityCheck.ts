import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QualityCheckResult {
  checks: Array<{
    type: 'brand_voice' | 'platform_rules' | 'sensitivity';
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
  overall: 'pass' | 'warn' | 'fail';
}

export function useQualityCheck() {
  return useMutation({
    mutationFn: async ({
      text,
      platforms,
      companyId,
    }: {
      text: string;
      platforms: string[];
      companyId: string;
    }): Promise<QualityCheckResult> => {
      const { data, error } = await supabase.functions.invoke('content-quality-check', {
        body: { text, platforms, companyId },
      });

      if (error) throw error;
      return data as QualityCheckResult;
    },
  });
}
