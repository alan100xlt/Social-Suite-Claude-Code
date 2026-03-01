import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface MediaCompany {
  id: string
  name: string
  description?: string
  logo_url?: string
  website_url?: string
  contact_email?: string
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MediaCompanyChild {
  company_id: string
  company_name: string
  relationship_type: 'owned' | 'managed' | 'partnered'
  total_posts: number
  total_followers: number
  total_engagement: number
  platform_breakdown: Record<string, any>
}

interface MediaCompanyMember {
  id: string
  media_company_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  permissions: Record<string, any>
  is_active: boolean
  invited_by?: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    full_name?: string
  }
}

// Hook for getting media company hierarchy with analytics
export function useMediaCompanyHierarchy(mediaCompanyId: string, includeAnalytics = true) {
  return useQuery({
    queryKey: ['media-company-hierarchy', mediaCompanyId, includeAnalytics],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_media_company_hierarchy', {
          _media_company_id: mediaCompanyId,
          _include_analytics: includeAnalytics,
          _period_days: 30
        })

      if (error) throw error
      return data as MediaCompanyChild[]
    },
    enabled: !!mediaCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for getting media company details
export function useMediaCompany(mediaCompanyId: string) {
  return useQuery({
    queryKey: ['media-company', mediaCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_companies')
        .select('*')
        .eq('id', mediaCompanyId)
        .single()

      if (error) throw error
      return data as MediaCompany
    },
    enabled: !!mediaCompanyId,
  })
}

// Hook for getting media company members
export function useMediaCompanyMembers(mediaCompanyId: string) {
  return useQuery({
    queryKey: ['media-company-members', mediaCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_company_members')
        .select(`
          *,
          user:auth.users(id, email, raw_user_meta_data->>'full_name')
        `)
        .eq('media_company_id', mediaCompanyId)
        .eq('is_active', true)
        .order('role', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Transform user data
      return data.map(member => ({
        ...member,
        user: member.user ? {
          id: member.user.id,
          email: member.user.email,
          full_name: (member.user.raw_user_meta_data as any)?.full_name
        } : undefined
      })) as MediaCompanyMember[]
    },
    enabled: !!mediaCompanyId,
  })
}

// Hook for checking user permissions
export function useMediaCompanyPermission(
  mediaCompanyId: string, 
  requiredRole: 'admin' | 'member' | 'viewer' = 'member'
) {
  return useQuery({
    queryKey: ['media-company-permission', mediaCompanyId, requiredRole],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error } = await supabase
        .rpc('has_media_company_permission', {
          _user_id: user.id,
          _media_company_id: mediaCompanyId,
          _required_role: requiredRole
        })

      if (error) throw error
      return data as boolean
    },
    enabled: !!mediaCompanyId,
  })
}

// Mutation for adding child company to media company
export function useAddChildCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      mediaCompanyId,
      childCompanyId,
      relationshipType = 'owned'
    }: {
      mediaCompanyId: string
      childCompanyId: string
      relationshipType?: 'owned' | 'managed' | 'partnered'
    }) => {
      const { data, error } = await supabase
        .from('media_company_children')
        .insert({
          parent_company_id: mediaCompanyId,
          child_company_id: childCompanyId,
          relationship_type: relationshipType
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['media-company-hierarchy', variables.mediaCompanyId]
      })
    }
  })
}

// Mutation for removing child company from media company
export function useRemoveChildCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      mediaCompanyId,
      childCompanyId
    }: {
      mediaCompanyId: string
      childCompanyId: string
    }) => {
      const { error } = await supabase
        .from('media_company_children')
        .delete()
        .eq('parent_company_id', mediaCompanyId)
        .eq('child_company_id', childCompanyId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['media-company-hierarchy', variables.mediaCompanyId]
      })
    }
  })
}

// Mutation for adding member to media company
export function useAddMediaCompanyMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      mediaCompanyId,
      userId,
      role = 'member'
    }: {
      mediaCompanyId: string
      userId: string
      role?: 'admin' | 'member' | 'viewer'
    }) => {
      const { data, error } = await supabase
        .from('media_company_members')
        .insert({
          media_company_id: mediaCompanyId,
          user_id: userId,
          role
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['media-company-members', variables.mediaCompanyId]
      })
    }
  })
}

// Mutation for updating member role
export function useUpdateMediaCompanyMemberRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      memberId,
      role
    }: {
      memberId: string
      role: 'admin' | 'member' | 'viewer'
    }) => {
      const { data, error } = await supabase
        .from('media_company_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate all member queries since we don't know the company ID here
      queryClient.invalidateQueries({
        queryKey: ['media-company-members']
      })
    }
  })
}

// Mutation for removing member from media company
export function useRemoveMediaCompanyMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      memberId,
      mediaCompanyId
    }: {
      memberId: string
      mediaCompanyId: string
    }) => {
      const { error } = await supabase
        .from('media_company_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['media-company-members', variables.mediaCompanyId]
      })
    }
  })
}
