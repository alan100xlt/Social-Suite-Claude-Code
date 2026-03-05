import { useMemo } from "react";
import { useTopPerformingPosts, type TopPost } from "@/hooks/useTopPerformingPosts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import {
  getPremiumSeries,
  formatMetric,
} from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import {
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

// ---------------------------------------------------------------------------
// Platform icon + gradient map
// ---------------------------------------------------------------------------

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

const platformGradients: Record<string, string> = {
  instagram: "from-pink-500/20 via-purple-500/20 to-orange-400/20",
  twitter: "from-sky-400/20 to-blue-500/20",
  linkedin: "from-blue-600/20 to-blue-400/20",
  facebook: "from-blue-500/20 to-indigo-400/20",
  tiktok: "from-pink-500/20 to-cyan-400/20",
  youtube: "from-red-500/20 to-red-400/20",
  bluesky: "from-sky-400/20 to-blue-300/20",
  threads: "from-zinc-400/20 to-zinc-300/20",
};

// ---------------------------------------------------------------------------
// Percentile tier system
// ---------------------------------------------------------------------------

type PercentileTier = "top1" | "top10" | "top25" | "normal";

interface TierConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  ringClass: string;
  barGradient: string;
}

const tierConfigs: Record<PercentileTier, TierConfig> = {
  top1: {
    label: "Top 1%",
    badgeBg: "bg-orange-500/15",
    badgeText: "text-orange-600 dark:text-orange-400",
    ringClass: "ring-2 ring-orange-400/60",
    barGradient: "from-orange-500 to-amber-400",
  },
  top10: {
    label: "Top 10%",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-600 dark:text-purple-400",
    ringClass: "ring-2 ring-purple-400/50",
    barGradient: "from-purple-500 to-violet-400",
  },
  top25: {
    label: "Top 25%",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    ringClass: "ring-1 ring-emerald-400/40",
    barGradient: "from-emerald-500 to-teal-400",
  },
  normal: {
    label: "",
    badgeBg: "",
    badgeText: "text-muted-foreground",
    ringClass: "",
    barGradient: "from-muted-foreground/40 to-muted-foreground/20",
  },
};

function getPercentileTier(views: number, avgViews: number): PercentileTier {
  if (avgViews <= 0) return "normal";
  const ratio = views / avgViews;
  if (ratio >= 5) return "top1";
  if (ratio >= 2) return "top10";
  if (ratio >= 1.2) return "top25";
  return "normal";
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: TopPost;
  avgViews: number;
  index: number;
}

function PostCard({ post, avgViews }: PostCardProps) {
  const views = post.views || post.impressions;
  const tier = getPercentileTier(views, avgViews);
  const config = tierConfigs[tier];
  const PlatformIcon = platformIcons[post.platform] || FaTwitter;
  const gradient = platformGradients[post.platform] || "from-muted/30 to-muted/10";

  const aboveAvgPct =
    avgViews > 0 ? Math.round(((views - avgViews) / avgViews) * 100) : 0;
  const barWidth = avgViews > 0 ? Math.min((views / avgViews) * 100, 100) : 0;

  return (
    <ChartCard
      noPadding
      className={tier !== "normal" ? config.ringClass : ""}
    >
      <div className="flex flex-col gap-2">
        {/* Thumbnail / Platform gradient placeholder */}
        <div className="relative h-32 w-full overflow-hidden rounded-t-[inherit]">
          {post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt="Post thumbnail"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <PlatformIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
          {/* Percentile badge overlay */}
          {tier !== "normal" && (
            <div className="absolute top-2 left-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${config.badgeBg} ${config.badgeText}`}
              >
                {tier === "top1" && "🔥"}
                {tier === "top10" && "⚡"}
                {tier === "top25" && <TrendingUp className="w-3 h-3" />}
                {config.label}
              </span>
            </div>
          )}
          {/* Platform + view count overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5">
              <PlatformIcon className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-medium text-white/90 capitalize">{post.platform}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5">
              <Eye className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-semibold text-white">{formatMetric(views)}</span>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-2">
          {/* Content preview */}
          <p className="text-xs text-card-foreground/80 line-clamp-2 leading-relaxed">
            {post.content || "No content preview available"}
          </p>

          {/* Metrics row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {formatMetric(post.likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {formatMetric(post.comments)}
            </span>
            {post.postUrl && (
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Performance bar */}
          {avgViews > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                {aboveAvgPct >= 0
                  ? `${aboveAvgPct}% above average`
                  : `${Math.abs(aboveAvgPct)}% below average`}
              </p>
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${config.barGradient} transition-all duration-700 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <ChartCard noPadding>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border/50 space-y-2">
              <Skeleton className="h-32 w-full rounded-t-2xl" />
              <div className="px-3 pb-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TopPostsSpotlightProps {
  days?: number;
  timeframeLabel?: string;
}

export function TopPostsSpotlight({ days = 14, timeframeLabel }: TopPostsSpotlightProps = {}) {
  const { data: topPosts, isLoading: postsLoading } = useTopPerformingPosts({
    days,
    limit: 3,
    metric: "impressions",
  });
  const stats = useDashboardStats();
  const series = getPremiumSeries();

  const avgViewsPerPost = useMemo(() => {
    if (!stats.totalPosts || stats.totalPosts === 0) return 0;
    return (stats.totalReach || stats.totalViews) / stats.totalPosts;
  }, [stats.totalReach, stats.totalViews, stats.totalPosts]);

  const isLoading = postsLoading || stats.isLoading;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!topPosts?.length) {
    return (
      <ChartCard noPadding accentColor={series[4]} accentColorEnd={series[5]} timeframeLabel={timeframeLabel}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-warning" />
            <h3 className="font-display font-semibold text-sm text-card-foreground">
              Top Posts
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            No posts published yet. Start posting to see your top
            performers here.
          </p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard noPadding accentColor={series[4]} accentColorEnd={series[5]} timeframeLabel={timeframeLabel}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            <h3 className="font-display font-semibold text-sm text-card-foreground">
              Top Posts
            </h3>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            vs average
          </span>
        </div>

        {/* Post cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topPosts.map((post, i) => (
            <PostCard
              key={post.postId}
              post={post}
              avgViews={avgViewsPerPost}
              index={i}
            />
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
