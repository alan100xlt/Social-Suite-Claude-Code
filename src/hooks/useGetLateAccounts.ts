import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getlateAccounts, getlateConnect, Platform, GetLateAccount } from '@/lib/api/getlate';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';

export function useAccounts() {
  const { data: company } = useCompany();
  const profileId = company?.getlate_profile_id;

  return useQuery({
    queryKey: ['getlate-accounts', profileId],
    queryFn: async () => {
      // If no profile ID, return empty array (company not linked to GetLate)
      if (!profileId) {
        return [];
      }
      
      const result = await getlateAccounts.list(profileId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch accounts');
      }
      
      // Defensive normalization: ensure all accounts have `id`
      const rawAccounts = result.data?.accounts || [];
      const normalizedAccounts = rawAccounts.map((a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = a.id ?? (a as any)._id as string | undefined;
        if (!id) {
          console.warn('[useAccounts] Account missing id:', a);
          return null;
        }
        return { ...a, id };
      }).filter((a): a is GetLateAccount => a !== null);
      
      return normalizedAccounts;
    },
    // Only fetch if we have a company (even without profileId, to show empty state)
    enabled: !!company,
  });
}

export function useEnsureProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, companyName }: { companyId: string; companyName: string }) => {
      const { data, error } = await supabase.functions.invoke('getlate-connect', {
        body: { action: 'ensure-profile', companyId, companyName },
      });

      if (error) {
        throw new Error(error.message || 'Failed to ensure profile');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to ensure profile');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate company query to refresh the profile ID
      queryClient.invalidateQueries({ queryKey: ['company'] });
      
      if (data.created) {
        console.log('Created new GetLate profile:', data.profileId);
      }
    },
  });
}

export function useConnectPlatform() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const ensureProfile = useEnsureProfile();

  return useMutation({
    mutationFn: async ({ platform, redirectUrl }: { platform: Platform; redirectUrl: string }) => {
      let profileId = company?.getlate_profile_id;

      // Auto-create a profile if company doesn't have one
      if (!profileId && company?.id && company?.name) {
        toast({
          title: 'Setting up...',
          description: 'Creating GetLate profile for your company...',
        });

        const result = await ensureProfile.mutateAsync({
          companyId: company.id,
          companyName: company.name,
        });

        profileId = result.profileId;

        if (result.created) {
          toast({
            title: 'Profile Created',
            description: 'GetLate profile has been set up for your company.',
          });
        }
      }

      if (!profileId) {
        throw new Error('Could not create or find a GetLate profile for this company');
      }

      // Start OAuth. If the stored profileId is stale (e.g., API key rotated), retry by re-ensuring a profile.
      let result = await getlateConnect.start(platform, redirectUrl, profileId);
      if (!result.success) {
        const msg = result.error || 'Failed to start connection';

        // Common after changing GETLATE_API_KEY: previously-stored profileId no longer belongs to this key.
        if (msg.toLowerCase().includes('do not have access to this profile') && company?.id && company?.name) {
          toast({
            title: 'Refreshing profile…',
            description: 'Your GetLate profile access changed; creating a new profile for this company.',
          });

          const ensured = await ensureProfile.mutateAsync({
            companyId: company.id,
            companyName: company.name,
          });

          profileId = ensured.profileId;
          result = await getlateConnect.start(platform, redirectUrl, profileId);
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to start connection');
      }

      return result.data?.authUrl;
    },
    onSuccess: (authUrl) => {
      if (authUrl) {
        // Open OAuth flow in a popup or redirect
        window.open(authUrl, '_blank', 'width=600,height=700');
      }
    },
    onError: (error) => {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect platform',
        variant: 'destructive',
      });
    },
  });
}

export function useDisconnectAccount() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const result = await getlateAccounts.disconnect(accountId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect account');
      }
    },
    onSuccess: () => {
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ['getlate-accounts', profileId] });
      toast({
        title: 'Account Disconnected',
        description: 'The account has been successfully disconnected.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect account',
        variant: 'destructive',
      });
    },
  });
}

// Helper to map GetLate accounts to platform display info
export function mapAccountToPlatformDisplay(account: GetLateAccount) {
  const platformColors: Record<Platform, string> = {
    twitter: 'bg-twitter',
    instagram: 'bg-instagram',
    facebook: 'bg-facebook',
    linkedin: 'bg-linkedin',
    tiktok: 'bg-tiktok',
    youtube: 'bg-destructive',
    pinterest: 'bg-destructive',
    reddit: 'bg-destructive',
    bluesky: 'bg-twitter',
    threads: 'bg-foreground',
    'google-business': 'bg-success',
    telegram: 'bg-twitter',
    snapchat: 'bg-warning',
  };

  const platformNames: Record<Platform, string> = {
    twitter: 'Twitter / X',
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    bluesky: 'Bluesky',
    threads: 'Threads',
    'google-business': 'Google Business',
    telegram: 'Telegram',
    snapchat: 'Snapchat',
  };

  return {
    ...account,
    colorClass: platformColors[account.platform] || 'bg-muted',
    displayName: platformNames[account.platform] || account.platform,
  };
}
