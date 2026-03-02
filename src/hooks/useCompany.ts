import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useToast } from '@/hooks/use-toast';

export interface Company {
  id: string;
  name: string;
  slug: string;
  getlate_profile_id: string | null;
  created_at: string;
  created_by: string;
  onboarding_status?: string;
  onboarding_step?: number;
  website_url?: string;
  branding?: any;
}

export interface CompanyMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
}

/**
 * Returns all companies the current user is a member of (via company_memberships).
 * Superadmins see ALL companies.
 */
export function useAllCompanies() {
  const { user, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-companies', user?.id, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Superadmin can see all companies
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name');
        if (error) throw error;
        return data as Company[];
      }

      if (!user?.id) return [];

      // Regular users: get companies via memberships
      const { data: memberships, error: memError } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', user.id);

      if (memError) throw memError;
      if (!memberships || memberships.length === 0) return [];

      const companyIds = memberships.map(m => m.company_id);
      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds)
        .order('name');

      if (compError) throw compError;
      return companies as Company[];
    },
    enabled: !!user?.id || isSuperAdmin,
  });
}

/**
 * Returns the currently active company.
 * Uses selectedCompanyId from context, falling back to the user's first membership.
 */
export function useCompany() {
  const { user, isSuperAdmin } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ['company', user?.id, selectedCompanyId, isSuperAdmin],
    queryFn: async () => {
      if (!user?.id) return null;

      // If a specific company is selected (by superadmin or multi-company user), use that
      if (selectedCompanyId) {
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', selectedCompanyId)
          .single();

        if (!error && company) return company as Company;
        // If selected company is no longer accessible, fall through
      }

      // Get user's first membership as default
      const { data: membership, error: memError } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memError || !membership?.company_id) {
        return null;
      }

      // Auto-select the first company
      if (!selectedCompanyId) {
        setSelectedCompanyId(membership.company_id);
      }

      const { data: company, error: compError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', membership.company_id)
        .single();

      if (compError) throw compError;
      return company as Company;
    },
    enabled: !!user?.id,
  });
}

/**
 * Returns members of the active company via company_memberships joined with profiles.
 */
export function useCompanyMembers() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get memberships for this company
      const { data: memberships, error: memError } = await supabase
        .from('company_memberships')
        .select('user_id, role')
        .eq('company_id', company.id);

      if (memError) throw memError;
      if (!memberships || memberships.length === 0) return [];

      const userIds = memberships.map(m => m.user_id);

      // Get profiles for these users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profError) throw profError;

      // Merge profiles with roles from memberships
      const members: CompanyMember[] = (profiles || []).map(profile => {
        const membership = memberships.find(m => m.user_id === profile.id);
        return {
          ...profile,
          role: (membership?.role as 'owner' | 'admin' | 'member') || 'member',
        };
      });

      return members;
    },
    enabled: !!company?.id,
  });
}

/**
 * Returns the current user's role in the active company via company_memberships.
 */
export function useUserRole() {
  const { user, isSuperAdmin } = useAuth();
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['user-role', user?.id, company?.id],
    queryFn: async () => {
      // Superadmin always has owner role
      if (isSuperAdmin) return 'owner' as const;

      if (!user?.id || !company?.id) return null;

      const { data, error } = await supabase
        .from('company_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle();

      if (error || !data) return null;
      return data.role as 'owner' | 'admin' | 'member';
    },
    enabled: !!user?.id,
  });
}

/**
 * Returns whether the current user has any company memberships.
 * Used by ProtectedRoute to decide if user needs to set up a company.
 */
export function useHasMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('company_memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });
}

export function useCreateCompany() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create the company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name,
          slug,
          created_by: user.id,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Add user as owner in company_memberships
      const { error: membershipError } = await supabase
        .from('company_memberships')
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: 'owner',
        });

      if (membershipError) throw membershipError;

      // Create default automation rule
      const userEmail = user.email;
      if (userEmail) {
        const { error: ruleError } = await supabase
          .from('automation_rules')
          .insert({
            company_id: company.id,
            name: 'Create Social Posts',
            is_active: true,
            feed_id: null,
            objective: 'auto',
            action: 'send_approval',
            approval_emails: [userEmail],
            account_ids: ['dummy-facebook', 'dummy-instagram'],
          });

        if (ruleError) {
          console.error('Failed to create default automation rule:', ruleError);
        }
      }

      // Auto-create a media company with the same name
      try {
        const { data: mc, error: mcError } = await supabase
          .from('media_companies')
          .insert({ name })
          .select('id')
          .single();

        if (mcError) throw mcError;

        // Link company as child of the new media company
        await supabase
          .from('media_company_children')
          .insert({
            parent_company_id: mc.id,
            child_company_id: company.id,
            relationship_type: 'owned',
          });

        // Make the creator a media company admin
        await supabase
          .from('media_company_members')
          .insert({
            media_company_id: mc.id,
            user_id: user.id,
            role: 'admin',
          });
      } catch (mcErr) {
        console.error('Failed to auto-create media company:', mcErr);
      }

      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      queryClient.invalidateQueries({ queryKey: ['has-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['user-media-companies'] });
      toast({
        title: 'Company Created',
        description: 'Your company has been set up successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create company',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCompany() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data: currentCompany, error: fetchError } = await supabase
        .from('companies')
        .select('getlate_profile_id, name')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If the name changed and there's a GetLate profile, sync
      if (updates.name && currentCompany?.getlate_profile_id && updates.name !== currentCompany.name) {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('getlate-connect', {
            body: {
              action: 'update-profile',
              profileId: currentCompany.getlate_profile_id,
              name: updates.name,
            },
          });
          if (syncError) console.error('Failed to sync GetLate profile name:', syncError);
          else if (!syncResult?.success) console.error('GetLate profile sync returned error:', syncResult?.error);
        } catch (syncErr) {
          console.error('Error syncing GetLate profile:', syncErr);
        }
      }

      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      toast({
        title: 'Company Updated',
        description: 'Company settings have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update company',
        variant: 'destructive',
      });
    },
  });
}
