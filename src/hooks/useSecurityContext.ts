import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { securityContextService } from '@/services/security/SecurityContextService';

interface UseSecurityContextOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export function useSecurityContext(
  userId?: string,
  options: UseSecurityContextOptions = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 15 * 60 * 1000, // 15 minutes
  } = options;

  const queryClient = useQueryClient();

  const {
    data: securityContext,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['securityContext', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required for security context');
      }
      return securityContextService.getSecurityContext(userId);
    },
    enabled: enabled && !!userId,
    staleTime,
    gcTime: cacheTime, // React Query v5 uses gcTime instead of cacheTime
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Set database context when security context changes
  useEffect(() => {
    if (securityContext && userId) {
      securityContextService.setDatabaseContext(supabase, userId).catch((error) => {
        console.error('Failed to set database context:', error);
      });
    }
  }, [securityContext, userId]);

  // Invalidate cache when user signs out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' && userId) {
          await securityContextService.invalidateCache(userId);
          queryClient.invalidateQueries({ queryKey: ['securityContext'] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [userId, queryClient]);

  return {
    securityContext,
    isLoading,
    error,
    refetch,
    invalidateCache: () => {
      if (userId) {
        securityContextService.invalidateCache(userId);
        queryClient.invalidateQueries({ queryKey: ['securityContext'] });
      }
    },
  };
}

export function useCompanyAccess(companyId?: string) {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  const {
    data: hasAccess,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companyAccess', userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) {
        return false;
      }
      return securityContextService.hasCompanyAccess(userId, companyId);
    },
    enabled: !!userId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    hasAccess,
    isLoading,
    error,
  };
}

export function useMediaCompanyAccess(mediaCompanyId?: string) {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  const {
    data: hasAccess,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['mediaCompanyAccess', userId, mediaCompanyId],
    queryFn: async () => {
      if (!userId || !mediaCompanyId) {
        return false;
      }
      return securityContextService.hasMediaCompanyAccess(userId, mediaCompanyId);
    },
    enabled: !!userId && !!mediaCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    hasAccess,
    isLoading,
    error,
  };
}

export function useAccessibleCompanies() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  const {
    data: companies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['accessibleCompanies', userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return securityContextService.getAccessibleCompanies(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    companies,
    isLoading,
    error,
  };
}

export function usePermissionLevel(requiredLevel: number) {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  const {
    data: hasPermission,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['permissionLevel', userId, requiredLevel],
    queryFn: async () => {
      if (!userId) {
        return false;
      }
      return securityContextService.hasPermissionLevel(userId, requiredLevel);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    hasPermission,
    isLoading,
    error,
  };
}

// Hook for security performance monitoring
export function useSecurityMetrics() {
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['securityMetrics'],
    queryFn: () => securityContextService.getPerformanceMetrics(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  return {
    metrics,
    isLoading,
    error,
  };
}
