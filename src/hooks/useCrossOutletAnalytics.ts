import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OutletMetric {
  company_id: string;
  company_name: string;
  metric_name: string;
  metric_value: number;
  date: string;
}

export function useCrossOutletAnalytics(mediaCompanyId: string | null) {
  return useQuery({
    queryKey: ['cross-outlet-analytics', mediaCompanyId],
    queryFn: async () => {
      if (!mediaCompanyId) return [];

      // Get child companies
      const { data: children, error: childError } = await supabase
        .from('media_company_children')
        .select('child_company_id, companies(id, name)')
        .eq('parent_company_id', mediaCompanyId);

      if (childError) throw childError;
      if (!children || children.length === 0) return [];

      const companyIds = children.map((c: any) => c.child_company_id);

      // Get analytics for all child companies
      const { data: analytics, error: analyticsError } = await supabase
        .from('media_company_analytics')
        .select('*')
        .in('media_company_id', companyIds)
        .order('date', { ascending: false })
        .limit(500);

      if (analyticsError) throw analyticsError;

      // Map company names
      const nameMap = new Map<string, string>();
      children.forEach((c: any) => {
        nameMap.set(c.child_company_id, (c.companies as any)?.name || 'Unknown');
      });

      return (analytics || []).map((a: any) => ({
        company_id: a.media_company_id,
        company_name: nameMap.get(a.media_company_id) || 'Unknown',
        metric_name: a.metric_name,
        metric_value: a.metric_value,
        date: a.date,
      })) as OutletMetric[];
    },
    enabled: !!mediaCompanyId,
  });
}
