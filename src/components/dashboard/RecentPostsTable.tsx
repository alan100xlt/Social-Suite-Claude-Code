import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Eye, Heart, MessageCircle, Share2, Loader2, ExternalLink, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useAllPostsWithAnalytics, PostWithPlatforms, PlatformAnalytics } from "@/hooks/useAllPostsWithAnalytics";
import { format } from "date-fns";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { useState } from "react";

const platformIcons: Record<string, React.ElementType> = {
  twitter: FaTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  bluesky: SiBluesky,
};

const platformNames: Record<string, string> = {
  twitter: "Twitter",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  "google-business": "Google",
  bluesky: "Bluesky",
  threads: "Threads",
};

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

function PlatformBadges({ platforms }: { platforms?: PlatformAnalytics[] }) {
  if (!platforms || platforms.length === 0) return null;
  const unique = [...new Set(platforms.map(p => p.platform))];
  return (
    <div className="flex items-center gap-1">
      {unique.map(p => {
        const Icon = platformIcons[p] || FaTwitter;
        return <Icon key={p} className="w-3 h-3 text-muted-foreground" title={platformNames[p] || p} />;
      })}
    </div>
  );
}

export function RecentPostsTable() {
  const { data: allPosts, isLoading } = useAllPostsWithAnalytics({ days: 30 });
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const posts = allPosts?.slice(0, 8) || [];

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border">
        <h3 className="font-display font-semibold text-lg text-card-foreground">
          Recent Posts
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Latest content performance across all channels
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Create your first post or connect accounts to see recent content here.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">Content</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead className="text-right">
                <Eye className="w-3.5 h-3.5 inline mr-1" />Views
              </TableHead>
              <TableHead className="text-right">
                <Heart className="w-3.5 h-3.5 inline mr-1" />Likes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const platforms = post._platforms || [];
              const hasMultiple = platforms.length > 1;
              const isExpanded = expandedPosts.has(post.postId);

              return (
                <>
                  <TableRow
                    key={post.postId}
                    className={cn("group", hasMultiple && "cursor-pointer")}
                    onClick={hasMultiple ? () => toggleExpand(post.postId) : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {hasMultiple && (
                          isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-1 text-card-foreground text-sm">
                              {post.content?.slice(0, 80) || "—"}
                            </p>
                            {post.postUrl && (
                              <a
                                href={post.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                              </a>
                            )}
                          </div>
                          {post.publishedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(post.publishedAt), "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlatformBadges platforms={platforms} />
                      {platforms.length === 0 && (
                        <span className="text-sm text-muted-foreground">{platformNames[post.platform] || post.platform}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatNumber(post.views)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatNumber(post.likes)}
                    </TableCell>
                  </TableRow>

                  {/* Expanded per-platform rows */}
                  {isExpanded && platforms.map((entry, idx) => {
                    const Icon = platformIcons[entry.platform] || FaTwitter;
                    return (
                      <TableRow key={`${post.postId}-${entry.platform}-${idx}`} className="bg-muted/30 border-l-2 border-l-muted-foreground/20">
                        <TableCell>
                          <div className="flex items-center gap-2 pl-8">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {platformNames[entry.platform] || entry.platform}
                              {entry.accountName && ` · ${entry.accountName}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-[10px]",
                            entry.status === 'published' ? "bg-success/10 text-success" :
                            entry.status === 'failed' ? "bg-destructive/10 text-destructive" : ""
                          )}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {formatNumber(entry.views || entry.impressions)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {formatNumber(entry.likes)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
