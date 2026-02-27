import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Eye, Heart, MessageCircle, Share2, MousePointer, ExternalLink, Calendar, Image as ImageIcon } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { Platform } from "@/lib/api/getlate";
import { format, parseISO } from "date-fns";
import type { TopPost } from "@/hooks/useTopPerformingPosts";

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaTwitter,
  pinterest: FaTwitter,
  reddit: FaTwitter,
  bluesky: FaTwitter,
  threads: FaTwitter,
  'google-business': FaTwitter,
  telegram: FaTwitter,
  snapchat: FaTwitter,
};

const platformColors: Record<Platform, string> = {
  instagram: "bg-instagram",
  twitter: "bg-twitter",
  facebook: "bg-facebook",
  linkedin: "bg-linkedin",
  tiktok: "bg-tiktok",
  youtube: "bg-destructive",
  pinterest: "bg-destructive",
  reddit: "bg-destructive",
  bluesky: "bg-twitter",
  threads: "bg-foreground",
  'google-business': "bg-success",
  telegram: "bg-twitter",
  snapchat: "bg-warning",
};

const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  twitter: "Twitter / X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  reddit: "Reddit",
  bluesky: "Bluesky",
  threads: "Threads",
  'google-business': "Google Business",
  telegram: "Telegram",
  snapchat: "Snapchat",
};

interface TopPostCardProps {
  post: TopPost;
  rank: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function TopPostCard({ post, rank }: TopPostCardProps) {
  const Icon = platformIcons[post.platform as Platform] || FaTwitter;
  const colorClass = platformColors[post.platform as Platform] || "bg-muted";
  const platformName = platformNames[post.platform as Platform] || post.platform;
  
  const publishedDate = post.publishedAt 
    ? format(parseISO(post.publishedAt), "MMM d, yyyy 'at' h:mm a")
    : null;
  
  const truncatedContent = post.content 
    ? post.content.length > 150 
      ? post.content.slice(0, 150) + "..." 
      : post.content
    : null;

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      {/* Header with rank and platform */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary text-sm">
          {rank}
        </div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs font-medium">
            {platformName}
          </Badge>
        </div>
        {post.postUrl && (
          <a 
            href={post.postUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="View original post"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 space-y-3">
        {/* Thumbnail image */}
        {post.thumbnailUrl && (
          <div className="relative -mx-4 -mt-4 mb-3 aspect-video overflow-hidden bg-muted">
            <img 
              src={post.thumbnailUrl} 
              alt="Post thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Post content preview */}
        {truncatedContent ? (
          <p className="text-sm text-card-foreground leading-relaxed line-clamp-3">
            {truncatedContent}
          </p>
        ) : !post.thumbnailUrl ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm italic">Media post</span>
          </div>
        ) : null}

        {/* Published date */}
        {publishedDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{publishedDate}</span>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-5 gap-1 p-3 bg-muted/30 border-t border-border/50">
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="font-semibold text-sm text-card-foreground">{formatNumber(post.impressions)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Views</p>
        </div>
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-3.5 h-3.5 text-destructive" />
          </div>
          <p className="font-semibold text-sm text-card-foreground">{formatNumber(post.likes)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Likes</p>
        </div>
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="font-semibold text-sm text-card-foreground">{formatNumber(post.comments)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comments</p>
        </div>
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Share2 className="w-3.5 h-3.5 text-success" />
          </div>
          <p className="font-semibold text-sm text-card-foreground">{formatNumber(post.shares)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Shares</p>
        </div>
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MousePointer className="w-3.5 h-3.5 text-warning" />
          </div>
          <p className="font-semibold text-sm text-card-foreground">{formatNumber(post.clicks)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Clicks</p>
        </div>
      </div>

      {/* Engagement rate footer */}
      <div className="px-4 py-3 bg-muted/50 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Engagement Rate</span>
        <Badge 
          variant="secondary" 
          className={cn(
            "font-semibold",
            post.engagementRate >= 5 
              ? "bg-success/10 text-success" 
              : post.engagementRate >= 2 
                ? "bg-warning/10 text-warning" 
                : "bg-muted text-muted-foreground"
          )}
        >
          {post.engagementRate.toFixed(2)}%
        </Badge>
      </div>
    </div>
  );
}