import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlatformCard } from "@/components/dashboard/PlatformCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSelectionDialog } from "@/components/connections/PageSelectionDialog";
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube, FaPinterest, FaReddit } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { RefreshCcw, Shield, Zap, Loader2 } from "lucide-react";
import { useAccounts, useConnectPlatform, useDisconnectAccount } from "@/hooks/useGetLateAccounts";
import { Platform } from "@/lib/api/getlate";
import { useToast } from "@/hooks/use-toast";
import { PlatformMetricsMatrix } from "@/components/shared/PlatformMetricsMatrix";

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
  { id: "tiktok", name: "TikTok", icon: <FaTiktok className="w-6 h-6 text-white" />, colorClass: "bg-tiktok" },
  { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin className="w-6 h-6 text-white" />, colorClass: "bg-linkedin", requiresPageSelection: true },
  { id: "facebook", name: "Facebook", icon: <FaFacebook className="w-6 h-6 text-white" />, colorClass: "bg-facebook", requiresPageSelection: true },
  { id: "youtube", name: "YouTube", icon: <FaYoutube className="w-6 h-6 text-white" />, colorClass: "bg-destructive", requiresPageSelection: true },
  { id: "pinterest", name: "Pinterest", icon: <FaPinterest className="w-6 h-6 text-white" />, colorClass: "bg-destructive" },
  { id: "reddit", name: "Reddit", icon: <FaReddit className="w-6 h-6 text-white" />, colorClass: "bg-destructive" },
  { id: "bluesky", name: "Bluesky", icon: <SiBluesky className="w-6 h-6 text-white" />, colorClass: "bg-twitter" },
  { id: "threads", name: "Threads", icon: <SiThreads className="w-6 h-6 text-white" />, colorClass: "bg-foreground" },
];

export default function ConnectionsPage() {
  const { toast } = useToast();
  const { data: accounts, isLoading: accountsLoading, refetch } = useAccounts();
  const connectMutation = useConnectPlatform();
  const disconnectMutation = useDisconnectAccount();
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  
  // Page selection dialog state
  const [pageSelectionOpen, setPageSelectionOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);
  const [pendingTempToken, setPendingTempToken] = useState<string | null>(null);
  const [pendingDataToken, setPendingDataToken] = useState<string | null>(null);
  const [pendingUserProfile, setPendingUserProfile] = useState<{ id?: string; name?: string; profilePicture?: string } | null>(null);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-callback') {
        const { tempToken, pendingDataToken: pdt, error, platform, userProfile } = event.data;

        if (error) {
          toast({
            title: 'Connection Failed',
            description: error,
            variant: 'destructive',
          });
          return;
        }

        // Check if this platform requires page selection
        if (tempToken || pdt) {
          const config = platformConfigs.find(c => c.id === (platform || connectingPlatform));

          if (config?.requiresPageSelection || pdt) {
            // Open page selection dialog
            setPendingPlatform(platform || connectingPlatform);
            setPendingTempToken(tempToken || null);
            setPendingDataToken(pdt || null);
            setPendingUserProfile(userProfile || null);
            setPageSelectionOpen(true);
          } else {
            // Direct connection - just refresh
            refetch();
            toast({
              title: 'Account Connected',
              description: 'Your social media account has been connected successfully!',
            });
          }
        } else {
          // No tempToken means direct connection completed
          refetch();
          toast({
            title: 'Account Connected',
            description: 'Your social media account has been connected successfully!',
          });
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

  const handlePageSelectionComplete = () => {
    setPendingPlatform(null);
    setPendingTempToken(null);
    setPendingDataToken(null);
    setPendingUserProfile(null);
    refetch();
  };

  // Map accounts to platforms
  const getAccountForPlatform = (platform: Platform) => {
    return accounts?.find(acc => acc.platform === platform);
  };

  const formatFollowers = (count?: number) => {
    if (!count) return undefined;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Connections
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your social media account connections
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={accountsLoading}>
          <RefreshCcw size={16} className={accountsLoading ? "animate-spin mr-2" : "mr-2"} />
          Refresh
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base">Quick Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Connect your accounts in seconds with OAuth. No passwords stored.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <CardTitle className="text-base">Secure & Private</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Your data is encrypted and we never post without your permission.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
              <RefreshCcw className="w-5 h-5 text-accent" />
            </div>
            <CardTitle className="text-base">Easy Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Disconnect anytime. You're always in control of your accounts.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Platforms Grid */}
      <div className="mb-6">
        <h2 className="font-display font-semibold text-xl text-foreground mb-4">
          Available Platforms
        </h2>
      </div>

      {accountsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                followers={formatFollowers(account?.followers)}
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

      {/* Connected accounts summary */}
      {accounts && accounts.length > 0 && (
        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{accounts.length}</span> account{accounts.length !== 1 ? 's' : ''} connected
          </p>
        </div>
      )}

      {/* Metrics by Platform */}
      <div className="mt-8">
        <h2 className="font-display font-semibold text-xl text-foreground mb-4">
          Metrics by Platform
        </h2>
        <PlatformMetricsMatrix
          mode="connections"
          connectedPlatforms={(accounts ?? []).map((a) => a.platform)}
        />
      </div>

      {/* Page Selection Dialog */}
      <PageSelectionDialog
        open={pageSelectionOpen}
        onOpenChange={setPageSelectionOpen}
        platform={pendingPlatform}
        tempToken={pendingTempToken}
        pendingDataToken={pendingDataToken}
        userProfile={pendingUserProfile}
        onComplete={handlePageSelectionComplete}
      />
    </DashboardLayout>
  );
}
