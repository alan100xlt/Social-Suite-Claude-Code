import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { allGranted, mergePermissions, type AppRole, type PermissionName } from '@/lib/permissions';

export type { AppRole, PermissionName };

interface EffectivePermissions {
  role: AppRole;
  permissions: Record<string, boolean>;
}

export function usePermissions() {
  const { user, isSuperAdmin } = useAuth();
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['user-permissions', user?.id, selectedCompanyId],
    queryFn: async (): Promise<EffectivePermissions> => {
      // Demo company: all permissions
      if (isDemoCompany(selectedCompanyId)) {
        return { role: 'owner', permissions: allGranted() };
      }

      // Superadmin: all permissions
      if (isSuperAdmin) {
        return { role: 'owner', permissions: allGranted() };
      }

      if (!user?.id || !selectedCompanyId) {
        return { role: 'collaborator', permissions: {} };
      }

      // Get role
      const { data: membership } = await supabase
        .from('company_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompanyId)
        .maybeSingle();

      const role = (membership?.role as AppRole) || 'collaborator';

      // Get role defaults
      const { data: defaults } = await supabase
        .from('role_default_permissions')
        .select('permission_name, granted')
        .eq('role', role);

      // Get per-user overrides
      const { data: overrides } = await supabase
        .from('user_permissions')
        .select('permission_name, granted')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompanyId);

      // Merge: defaults first, overrides take precedence
      const permissions = mergePermissions(defaults || [], overrides || []);

      return { role, permissions };
    },
    enabled: !!user?.id || isSuperAdmin,
    staleTime: 5 * 60 * 1000, // 5 min — permissions rarely change
  });
}

export function useHasPermission(permission: PermissionName): boolean {
  const { data } = usePermissions();
  return data?.permissions[permission] ?? false;
}
