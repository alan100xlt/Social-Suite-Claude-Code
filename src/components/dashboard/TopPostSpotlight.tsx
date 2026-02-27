import { useTopPerformingPosts, TopPost } from "@/hooks/useTopPerformingPosts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Heart, MessageCircle, Share2, ExternalLink, Trophy } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram, twitter: FaTwitter, linkedin: FaLinkedin,
  facebook: FaFacebook, tiktok: FaTiktok, youtube: FaYoutube,
  bluesky: SiBluesky, threads: SiThreads,
};

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export function TopPostSpotlight() {
  const { data: topPosts, isLoading } = useTopPerformingPosts({ days: 7, limit: 1, metric: "impressions" });
  const post = topPosts?.[0];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-16 w-full mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-display font-semibold text-sm text-card-foreground">Top Post This Week</h3>
        </div>
        <p className="text-sm text-muted-foreground">No posts published this week yet.</p>
      </div>
    );
  }

  const PlatformIcon = platformIcons[post.platform] || FaTwitter;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-display font-semibold text-sm text-card-foreground">Top Post This Week</h3>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning border-0">
          <PlatformIcon className="w-3 h-3 mr-1" />
          {post.platform}
        </Badge>
      </div>

      {post.thumbnailUrl && (
        <img
          src={post.thumbnailUrl}
          alt="Post thumbnail"
          className="w-full h-28 object-cover rounded-lg mb-3"
        />
      )}

      <p className="text-sm text-card-foreground line-clamp-2 mb-4 leading-relaxed">
        {post.content || "No content preview available"}
      </p>

      <div className="grid grid-cols-4 gap-2">
        <MetricPill icon={Eye} label="Views" value={formatNumber(post.views || post.impressions)} />
        <MetricPill icon={Heart} label="Likes" value={formatNumber(post.likes)} />
        <MetricPill icon={MessageCircle} label="Comments" value={formatNumber(post.comments)} />
        <MetricPill icon={Share2} label="Shares" value={formatNumber(post.shares)} />
      </div>

      {post.engagementRate > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {post.engagementRate.toFixed(2)}% engagement rate
        </div>
      )}

      {post.postUrl && (
        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View post <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 py-2 px-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-sm font-semibold text-card-foreground tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
