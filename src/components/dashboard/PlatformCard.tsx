import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Plus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { GetLateAccount, Platform } from "@/lib/api/getlate";

interface PlatformCardProps {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  followers?: string;
  colorClass: string;
  platform: Platform;
  accountId?: string;
  username?: string;
  profileUrl?: string;
  isLoading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Helper to generate profile URL based on platform
function getProfileUrl(platform: Platform, username?: string, customUrl?: string): string | null {
  if (customUrl) return customUrl;
  if (!username) return null;
  
  const urlTemplates: Partial<Record<Platform, string>> = {
    instagram: `https://instagram.com/${username}`,
    twitter: `https://twitter.com/${username}`,
    facebook: `https://facebook.com/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
    tiktok: `https://tiktok.com/@${username}`,
    youtube: `https://youtube.com/@${username}`,
    pinterest: `https://pinterest.com/${username}`,
    reddit: `https://reddit.com/user/${username}`,
    bluesky: `https://bsky.app/profile/${username}`,
    threads: `https://threads.net/@${username}`,
  };
  
  return urlTemplates[platform] || null;
}

export function PlatformCard({
  name,
  icon,
  connected,
  followers,
  colorClass,
  platform,
  accountId,
  username,
  profileUrl,
  isLoading,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  const finalProfileUrl = getProfileUrl(platform, username, profileUrl);
  
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg animate-scale-in",
        connected && "ring-2 ring-success/30"
      )}
    >
      {/* Decorative gradient */}
      <div
        className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2",
          colorClass
        )}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              colorClass
            )}
          >
            {icon}
          </div>
          {connected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success">
              <Check size={14} />
              <span className="text-xs font-medium">Connected</span>
            </div>
          )}
        </div>

        <h3 className="font-display font-semibold text-lg text-card-foreground">
          {name}
        </h3>

        {connected && username ? (
          <div className="mt-1">
            <p className="text-sm text-muted-foreground">@{username}</p>
            {followers && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {followers} followers
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Connect to start posting
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {connected ? (
            <>
              {finalProfileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={finalProfileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} className="mr-1" />
                    View Profile
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDisconnect}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={onConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={16} className="mr-1 animate-spin" />
              ) : (
                <Plus size={16} className="mr-1" />
              )}
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
