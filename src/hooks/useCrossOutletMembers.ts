import { useQuery } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { supabase } from '@/integrations/supabase/client';

export interface CrossOutletMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  outlet_name: string;
  outlet_id: string;
}

export function useCrossOutletMembers() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['cross-outlet-members', selectedCompanyId],
    queryFn: async (): Promise<CrossOutletMember[]> => {
      if (!selectedCompanyId) return [];

      // Find parent media company
      const { data: parentRel } = await supabase
        .from('media_company_children')
        .select('parent_company_id')
        .eq('child_company_id', selectedCompanyId)
        .limit(1)
        .maybeSingle();

      if (!parentRel) return []; // Not part of a media company

      // Find sibling outlets
      const { data: siblings } = await supabase
        .from('media_company_children')
        .select('child_company_id')
        .eq('parent_company_id', parentRel.parent_company_id)
        .neq('child_company_id', selectedCompanyId);

      if (!siblings || siblings.length === 0) return [];

      const siblingIds = siblings.map(s => s.child_company_id);

      // Get members from sibling outlets
      const { data: memberships } = await supabase
        .from('company_memberships')
        .select('user_id, role, company_id')
        .in('company_id', siblingIds);

      if (!memberships || memberships.length === 0) return [];

      // Get company names
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', siblingIds);

      const companyMap = new Map((companies || []).map(c => [c.id, c.name]));

      // Get profiles
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const result: CrossOutletMember[] = memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          role: m.role || 'member',
          outlet_name: companyMap.get(m.company_id) || 'Unknown',
          outlet_id: m.company_id,
        };
      });

      return result;
    },
    enabled: !!selectedCompanyId,
    staleTime: 300000, // 5 min cache
  });
}
