import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserMediaCompany {
  id: string;
  name: string;
  logo_url: string | null;
  role: 'admin' | 'member' | 'viewer';
}

export interface MediaCompanyParent {
  id: string;
  name: string;
  logo_url: string | null;
  relationship_type: 'owned' | 'managed' | 'partnered';
}

export interface MediaCompanyBasic {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  created_at: string;
}

/**
 * Returns media companies the current user is a member of.
 * Used by sidebar navigation.
 */
export function useUserMediaCompanies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-media-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('media_company_members')
        .select('media_company_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const mediaCompanyIds = data.map(m => m.media_company_id);
      const { data: companies, error: compError } = await supabase
        .from('media_companies')
        .select('id, name, logo_url')
        .in('id', mediaCompanyIds);

      if (compError) throw compError;

      return (companies || []).map(mc => {
        const membership = data.find(m => m.media_company_id === mc.id);
        return {
          id: mc.id,
          name: mc.name,
          logo_url: mc.logo_url,
          role: (membership?.role || 'viewer') as UserMediaCompany['role'],
        };
      }) as UserMediaCompany[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Returns the parent media company for a given company.
 * Used by CompanyTab to show association.
 */
export function useCompanyMediaParent(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-media-parent', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('media_company_children')
        .select('parent_company_id, relationship_type')
        .eq('child_company_id', companyId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const { data: mc, error: mcError } = await supabase
        .from('media_companies')
        .select('id, name, logo_url')
        .eq('id', data.parent_company_id)
        .single();

      if (mcError) throw mcError;

      return {
        id: mc.id,
        name: mc.name,
        logo_url: mc.logo_url,
        relationship_type: data.relationship_type as MediaCompanyParent['relationship_type'],
      } as MediaCompanyParent;
    },
    enabled: !!companyId,
  });
}

/**
 * Returns all media companies. Superadmin only.
 */
export function useAllMediaCompanies() {
  const { isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-media-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_companies')
        .select('id, name, description, logo_url, website_url, contact_email, created_at')
        .order('name');

      if (error) throw error;
      return data as MediaCompanyBasic[];
    },
    enabled: isSuperAdmin,
  });
}

/**
 * Creates a new media company and optionally adds the first admin member.
 */
export function useCreateMediaCompany() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      logo_url,
      website_url,
      contact_email,
      firstAdminUserId,
    }: {
      name: string;
      description?: string;
      logo_url?: string;
      website_url?: string;
      contact_email?: string;
      firstAdminUserId?: string;
    }) => {
      const { data: mc, error } = await supabase
        .from('media_companies')
        .insert({
          name,
          description: description || null,
          logo_url: logo_url || null,
          website_url: website_url || null,
          contact_email: contact_email || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (firstAdminUserId) {
        const { error: memberError } = await supabase
          .from('media_company_members')
          .insert({
            media_company_id: mc.id,
            user_id: firstAdminUserId,
            role: 'admin',
          });

        if (memberError) {
          console.error('Failed to add first admin to media company:', memberError);
        }
      }

      return mc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-media-companies'] });
      queryClient.invalidateQueries({ queryKey: ['user-media-companies'] });
      toast({ title: 'Media Company Created', description: 'The media company has been set up.' });
    },
    onError: (error) => {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create media company',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Assigns a company to a media company (handles reassignment by removing old link first).
 */
export function useAssignCompanyToMediaCompany() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mediaCompanyId,
      childCompanyId,
      relationshipType = 'owned',
    }: {
      mediaCompanyId: string;
      childCompanyId: string;
      relationshipType?: 'owned' | 'managed' | 'partnered';
    }) => {
      // Remove any existing association first
      await supabase
        .from('media_company_children')
        .delete()
        .eq('child_company_id', childCompanyId);

      // Create new association
      const { data, error } = await supabase
        .from('media_company_children')
        .insert({
          parent_company_id: mediaCompanyId,
          child_company_id: childCompanyId,
          relationship_type: relationshipType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-media-parent'] });
      queryClient.invalidateQueries({ queryKey: ['media-company-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['company-media-map'] });
      toast({ title: 'Company Assigned', description: 'Company has been assigned to the media company.' });
    },
    onError: (error) => {
      toast({
        title: 'Assignment Failed',
        description: error instanceof Error ? error.message : 'Failed to assign company',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk fetches all media company child associations.
 * Returns a Map<childCompanyId, { mediaCompanyId, mediaCompanyName }>.
 * Used by SuperadminCompanies to show current assignment per row.
 */
export function useCompanyMediaCompanyMap() {
  const { isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['company-media-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_company_children')
        .select('parent_company_id, child_company_id');

      if (error) throw error;
      if (!data || data.length === 0) return new Map<string, { mediaCompanyId: string; mediaCompanyName: string }>();

      // Get all parent media company names
      const parentIds = [...new Set(data.map(d => d.parent_company_id))];
      const { data: parents, error: pError } = await supabase
        .from('media_companies')
        .select('id, name')
        .in('id', parentIds);

      if (pError) throw pError;

      const parentMap = new Map((parents || []).map(p => [p.id, p.name]));
      const result = new Map<string, { mediaCompanyId: string; mediaCompanyName: string }>();

      for (const row of data) {
        result.set(row.child_company_id, {
          mediaCompanyId: row.parent_company_id,
          mediaCompanyName: parentMap.get(row.parent_company_id) || 'Unknown',
        });
      }

      return result;
    },
    enabled: isSuperAdmin,
  });
}
