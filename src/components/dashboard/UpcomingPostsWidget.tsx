import { useMemo } from "react";
import { usePosts } from "@/hooks/useGetLatePosts";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { getPremiumSeries } from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock } from "lucide-react";
import {
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { formatDistanceToNowStrict } from "date-fns";
import { useNavigate } from "react-router-dom";

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

const platformColors: Record<string, string> = {
  instagram: "text-pink-500",
  twitter: "text-sky-500",
  linkedin: "text-blue-600",
  facebook: "text-blue-500",
  tiktok: "text-pink-600",
  youtube: "text-red-500",
  bluesky: "text-sky-400",
  threads: "text-foreground",
};

export function UpcomingPostsWidget() {
  const navigate = useNavigate();
  const { data: posts, isLoading: postsLoading } = usePosts({ status: "scheduled" });
  const { data: accounts } = useAccounts();
  const series = getPremiumSeries();

  // Build accountId → platform map
  const accountPlatformMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts || []) {
      map.set(a.id, a.platform);
    }
    return map;
  }, [accounts]);

  const upcoming = useMemo(() => {
    if (!posts?.length) return [];
    return [...posts]
      .filter((p) => p.scheduledFor)
      .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
      .slice(0, 3);
  }, [posts]);

  if (postsLoading) {
    return (
      <ChartCard accentColor={series[2]} accentColorEnd={series[3]}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard accentColor={series[2]} accentColorEnd={series[3]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
          <h3
            className="font-semibold text-sm tracking-tight text-card-foreground"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Upcoming Posts
          </h3>
        </div>
        <button
          onClick={() => navigate("/app/content?tab=calendar")}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View Calendar
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nothing scheduled</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Plan your next posts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((post) => {
            const thumbnail = post.mediaItems?.[0]?.url || post.mediaItems?.[0]?.thumbnailUrl;
            // Resolve platforms from accountIds
            const platforms = (post.platformResults?.map((r) => r.platform) || []);
            if (platforms.length === 0) {
              for (const aid of post.accountIds || []) {
                const p = accountPlatformMap.get(aid);
                if (p) platforms.push(p);
              }
            }
            const uniquePlatforms = [...new Set(platforms)];

            return (
              <div
                key={post.id}
                className="flex items-center gap-3 group cursor-pointer rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-muted/40"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/app/content?tab=calendar")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/app/content?tab=calendar");
                  }
                }}
              >
                {/* Thumbnail or gradient placeholder */}
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-4 h-4 text-primary/40" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(post.scheduledFor!), { addSuffix: true })}
                    </span>
                    {uniquePlatforms.slice(0, 3).map((p) => {
                      const Icon = platformIcons[p];
                      const color = platformColors[p] || "text-muted-foreground";
                      return Icon ? (
                        <Icon key={p} className={`w-3 h-3 ${color}`} />
                      ) : null;
                    })}
                  </div>
                  <p className="text-sm text-card-foreground/90 line-clamp-1 leading-snug">
                    {post.text?.slice(0, 80) || "Scheduled post"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
