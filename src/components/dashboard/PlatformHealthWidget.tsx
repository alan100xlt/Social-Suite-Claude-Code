import { useMemo } from "react";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { getPremiumSeries } from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, Wifi, WifiOff } from "lucide-react";
import {
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  linkedin: FaLinkedin,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
};

const platformBgColors: Record<string, string> = {
  instagram: "bg-pink-500/15",
  twitter: "bg-sky-500/15",
  linkedin: "bg-blue-600/15",
  facebook: "bg-blue-500/15",
  tiktok: "bg-pink-600/15",
  youtube: "bg-red-500/15",
  bluesky: "bg-sky-400/15",
  threads: "bg-foreground/10",
};

const platformTextColors: Record<string, string> = {
  instagram: "text-pink-500",
  twitter: "text-sky-500",
  linkedin: "text-blue-600",
  facebook: "text-blue-500",
  tiktok: "text-pink-600",
  youtube: "text-red-500",
  bluesky: "text-sky-400",
  threads: "text-foreground",
};

const platformDisplayNames: Record<string, string> = {
  twitter: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  threads: "Threads",
};

export function PlatformHealthWidget() {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useAccounts();
  const series = getPremiumSeries();

  const platformList = useMemo(() => {
    if (!accounts?.length) return [];
    // Deduplicate by platform (show first account per platform)
    const seen = new Map<string, typeof accounts[0]>();
    for (const a of accounts) {
      if (!seen.has(a.platform)) {
        seen.set(a.platform, a);
      }
    }
    return Array.from(seen.values());
  }, [accounts]);

  const connectedCount = platformList.filter((a) => a.isConnected).length;

  if (isLoading) {
    return (
      <ChartCard accentColor={series[0]} accentColorEnd={series[1]}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="w-2 h-2 rounded-full" />
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard accentColor={series[0]} accentColorEnd={series[1]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-muted-foreground" />
          <h3
            className="font-semibold text-sm tracking-tight text-card-foreground"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Platforms
          </h3>
        </div>
        <button
          onClick={() => navigate("/app/connections")}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Manage
        </button>
      </div>

      {platformList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No platforms connected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Connect your social accounts</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-1.5 mb-3">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">
              {connectedCount}/{platformList.length} connected
            </span>
          </div>

          {/* Platform list */}
          <div className="space-y-2">
            {platformList.map((account) => {
              const Icon = platformIcons[account.platform];
              const bgColor = platformBgColors[account.platform] || "bg-muted/30";
              const textColor = platformTextColors[account.platform] || "text-muted-foreground";
              const name = platformDisplayNames[account.platform] || account.platform;

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-1.5 transition-colors hover:bg-muted/40 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate("/app/connections")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/app/connections");
                    }
                  }}
                >
                  {/* Platform icon */}
                  <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    {Icon && <Icon className={`w-4 h-4 ${textColor}`} />}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground leading-tight">
                      {account.displayName || account.username || name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {account.connectedAt
                        ? `Connected ${formatDistanceToNowStrict(new Date(account.connectedAt), { addSuffix: true })}`
                        : name}
                    </p>
                  </div>

                  {/* Status dot */}
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      account.isConnected
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                        : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </ChartCard>
  );
}
