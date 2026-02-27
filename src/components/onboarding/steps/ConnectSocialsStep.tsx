import { useState, useEffect } from 'react';
import { PlatformCard } from '@/components/dashboard/PlatformCard';
import { PageSelectionDialog } from '@/components/connections/PageSelectionDialog';
import { useAccounts, useConnectPlatform, useDisconnectAccount } from '@/hooks/useGetLateAccounts';
import { Platform } from '@/lib/api/getlate';
import { useToast } from '@/hooks/use-toast';
import { posthog } from '@/lib/posthog';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { AlertTriangle, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlatformConfig {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  colorClass: string;
  requiresPageSelection?: boolean;
}

const platformConfigs: PlatformConfig[] = [
  { id: "instagram", name: "Instagram", icon: <FaInstagram className="w-6 h-6 text-white" />, colorClass: "bg-instagram", requiresPageSelection: true },
  { id: "twitter", name: "Twitter / X", icon: <FaTwitter className="w-6 h-6 text-white" />, colorClass: "bg-twitter" },
  { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin className="w-6 h-6 text-white" />, colorClass: "bg-linkedin", requiresPageSelection: true },
  { id: "facebook", name: "Facebook", icon: <FaFacebook className="w-6 h-6 text-white" />, colorClass: "bg-facebook", requiresPageSelection: true },
  { id: "tiktok", name: "TikTok", icon: <FaTiktok className="w-6 h-6 text-white" />, colorClass: "bg-tiktok" },
  { id: "youtube", name: "YouTube", icon: <FaYoutube className="w-6 h-6 text-white" />, colorClass: "bg-destructive", requiresPageSelection: true },
  { id: "bluesky", name: "Bluesky", icon: <SiBluesky className="w-6 h-6 text-white" />, colorClass: "bg-twitter" },
  { id: "threads", name: "Threads", icon: <SiThreads className="w-6 h-6 text-white" />, colorClass: "bg-foreground" },
];

interface ConnectSocialsStepProps {
  onInvite: () => void;
}

export function ConnectSocialsStep({ onInvite }: ConnectSocialsStepProps) {
  const { toast } = useToast();
  const { data: accounts, isLoading, refetch } = useAccounts();
  const connectMutation = useConnectPlatform();
  const disconnectMutation = useDisconnectAccount();
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  const [pageSelectionOpen, setPageSelectionOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);
  const [pendingTempToken, setPendingTempToken] = useState<string | null>(null);
  const [pendingUserProfile, setPendingUserProfile] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-callback') {
        const { tempToken, error, platform, userProfile } = event.data;
        if (error) {
          toast({ title: 'Connection Failed', description: error, variant: 'destructive' });
          setConnectingPlatform(null);
          return;
        }
        if (tempToken) {
          const config = platformConfigs.find(c => c.id === (platform || connectingPlatform));
          if (config?.requiresPageSelection) {
            setPendingPlatform(platform || connectingPlatform);
            setPendingTempToken(tempToken);
            setPendingUserProfile(userProfile || null);
            setPageSelectionOpen(true);
          } else {
            refetch();
            posthog.capture('onboarding_social_connected', { platform: platform || connectingPlatform });
            toast({ title: 'Connected!', description: 'Account connected successfully.' });
          }
        } else {
          refetch();
          posthog.capture('onboarding_social_connected', { platform: platform || connectingPlatform });
          toast({ title: 'Connected!', description: 'Account connected successfully.' });
        }
        setConnectingPlatform(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch, toast, connectingPlatform]);

  const handleConnect = async (platform: Platform) => {
    setConnectingPlatform(platform);
    const redirectUrl = `${window.location.origin}/oauth-callback?platform=${platform}`;
    try {
      await connectMutation.mutateAsync({ platform, redirectUrl });
    } catch {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectMutation.mutateAsync(accountId);
  };

  const connectedCount = accounts?.length || 0;
  const getAccountForPlatform = (platform: Platform) => accounts?.find(acc => acc.platform === platform);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Connect Your Social Accounts</h2>
        <p className="text-muted-foreground mt-1">
          Link the platforms where you want to publish content. You can always add more later.
        </p>
      </div>

      {/* Invite callout */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Don't have access to the social accounts?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invite a team member who manages the accounts — they can connect them for you.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onInvite} className="flex-shrink-0">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Invite
        </Button>
      </div>

      {/* Platform grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {platformConfigs.map((config) => {
            const account = getAccountForPlatform(config.id);
            return (
              <PlatformCard
                key={config.id}
                name={config.name}
                icon={config.icon}
                colorClass={config.colorClass}
                platform={config.id}
                connected={!!account}
                accountId={account?.id}
                username={account?.username}
                isLoading={connectingPlatform === config.id || disconnectMutation.isPending}
                onConnect={() => handleConnect(config.id)}
                onDisconnect={() => account && handleDisconnect(account.id)}
              />
            );
          })}
        </div>
      )}

      {connectedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{connectedCount}</span> account{connectedCount !== 1 ? 's' : ''} connected
        </p>
      )}

      <PageSelectionDialog
        open={pageSelectionOpen}
        onOpenChange={setPageSelectionOpen}
        platform={pendingPlatform}
        tempToken={pendingTempToken}
        userProfile={pendingUserProfile}
        onComplete={() => {
          setPendingPlatform(null);
          setPendingTempToken(null);
          setPendingUserProfile(null);
          refetch();
        }}
      />
    </div>
  );
}
