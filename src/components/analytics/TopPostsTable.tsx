import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Eye, Heart, MessageCircle, Share2, MousePointer, ExternalLink, Zap, Globe, Megaphone, MousePointerClick, Loader2, ChevronDown, ChevronRight, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { Platform } from "@/lib/api/getlate";
import { format, parseISO } from "date-fns";
import type { TopPost } from "@/hooks/useTopPerformingPosts";
import type { PostWithPlatforms, PlatformAnalytics } from "@/hooks/useAllPostsWithAnalytics";
import { useDeletePost } from "@/hooks/useGetLatePosts";

const platformIcons: Partial<Record<string, React.ElementType>> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  bluesky: SiBluesky,
};

const platformNames: Partial<Record<string, string>> = {
  instagram: "Instagram",
  twitter: "Twitter / X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  bluesky: "Bluesky",
  youtube: "YouTube",
  "google-business": "Google",
  threads: "Threads",
};

const objectiveConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  reach: { label: "Reach", icon: Megaphone, className: "bg-primary/10 text-primary" },
  engagement: { label: "Engagement", icon: MessageCircle, className: "bg-accent/10 text-accent" },
  clicks: { label: "Clicks", icon: MousePointerClick, className: "bg-warning/10 text-warning" },
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

interface TopPostsTableProps {
  posts: (TopPost | PostWithPlatforms)[];
  isLoading: boolean;
  onDeleted?: () => void;
  highlightPostId?: string;
}

type SortField = "date" | "engagement" | "views" | "engagementRate" | "comments" | "shares";
type SortDir = "asc" | "desc";

function getTotalEngagement(post: TopPost) {
  return (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
}

const PAGE_SIZE = 10;

function PlatformIcon({ platform }: { platform: string }) {
  const Icon = platformIcons[platform] || FaTwitter;
  return <Icon className="w-3.5 h-3.5" />;
}

function PlatformBadges({ platforms }: { platforms?: PlatformAnalytics[] }) {
  if (!platforms || platforms.length === 0) return null;
  const unique = [...new Set(platforms.map(p => p.platform))];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {unique.map(p => {
        const Icon = platformIcons[p] || FaTwitter;
        return (
          <span key={p} className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={platformNames[p] || p}>
            <Icon className="w-3 h-3" />
          </span>
        );
      })}
      {unique.length > 1 && (
        <span className="text-[10px] text-muted-foreground ml-0.5">
          {unique.length} channels
        </span>
      )}
    </div>
  );
}

function SubPlatformRow({ entry }: { entry: PlatformAnalytics }) {
  const Icon = platformIcons[entry.platform] || FaTwitter;
  const name = platformNames[entry.platform] || entry.platform;
  const statusStyles: Record<string, string> = {
    published: "bg-success/10 text-success",
    scheduled: "bg-primary/10 text-primary",
    failed: "bg-destructive/10 text-destructive",
  };

  return (
    <TableRow className="bg-muted/30 border-l-2 border-l-muted-foreground/20">
      <TableCell />
      <TableCell>
        <div className="flex items-center gap-2 pl-4">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{name}</span>
          {entry.accountName && (
            <span className="text-xs text-muted-foreground/70">· {entry.accountName}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("text-[10px]", statusStyles[entry.status] || "")}>
          {entry.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums text-sm text-muted-foreground">
        {formatNumber(entry.views || entry.impressions)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 text-sm tabular-nums text-muted-foreground">
          <span className="flex items-center gap-0.5" title="Likes">
            <Heart className="w-3 h-3 text-destructive/60" />
            {formatNumber(entry.likes)}
          </span>
          <span className="flex items-center gap-0.5" title="Comments">
            <MessageCircle className="w-3 h-3 text-primary/60" />
            {formatNumber(entry.comments)}
          </span>
          <span className="flex items-center gap-0.5" title="Shares">
            <Share2 className="w-3 h-3 text-success/60" />
            {formatNumber(entry.shares)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-xs text-muted-foreground">{entry.engagementRate.toFixed(1)}%</span>
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell>
        {entry.postUrl && (
          <a href={entry.postUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground inline-flex">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </TableCell>
    </TableRow>
  );
}

export function TopPostsTable({ posts, isLoading, onDeleted, highlightPostId }: TopPostsTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(() => 
    highlightPostId ? new Set([highlightPostId]) : new Set()
  );
  const deletePost = useDeletePost();

  const sortedPosts = useMemo(() => {
    const filtered = [...posts];
    // If a specific post is highlighted, put it first
    if (highlightPostId) {
      const idx = filtered.findIndex(p => p.postId === highlightPostId);
      if (idx > 0) {
        const [highlighted] = filtered.splice(idx, 1);
        filtered.unshift(highlighted);
      }
    }
    // Sort remaining (skip first if highlighted)
    const startIdx = highlightPostId && filtered[0]?.postId === highlightPostId ? 1 : 0;
    const toSort = filtered.slice(startIdx);
    toSort.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortField) {
        case "date":
          valA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          valB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          break;
        case "views":
          valA = a.views || a.impressions || 0;
          valB = b.views || b.impressions || 0;
          break;
        case "engagementRate":
          valA = a.engagementRate || 0;
          valB = b.engagementRate || 0;
          break;
        case "comments":
          valA = a.comments || 0;
          valB = b.comments || 0;
          break;
        case "shares":
          valA = a.shares || 0;
          valB = b.shares || 0;
          break;
        case "engagement":
        default:
          valA = getTotalEngagement(a);
          valB = getTotalEngagement(b);
          break;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });
    return startIdx > 0 ? [filtered[0], ...toSort] : toSort;
  }, [posts, sortField, sortDir, highlightPostId]);

  const visiblePosts = sortedPosts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedPosts.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setVisibleCount(PAGE_SIZE);
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 ml-1" />
      : <ArrowUp className="w-3 h-3 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No post analytics available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Sync your analytics to see top performing posts
        </p>
      </div>
    );
  }

  const sortPresets: { field: SortField; label: string; icon: React.ElementType }[] = [
    { field: "date", label: "Most Recent", icon: ArrowDown },
    { field: "views", label: "Most Views", icon: Eye },
    { field: "engagement", label: "Most Engagement", icon: Heart },
    { field: "engagementRate", label: "Highest Rate", icon: Zap },
    { field: "comments", label: "Most Comments", icon: MessageCircle },
    { field: "shares", label: "Most Shares", icon: Share2 },
  ];

  return (
    <div className="space-y-4">
      {/* Quick sort buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {sortPresets.map(({ field, label, icon: Icon }) => (
          <Button
            key={field}
            variant={sortField === field ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              if (sortField === field) {
                setSortDir(d => d === "desc" ? "asc" : "desc");
              } else {
                setSortField(field);
                setSortDir("desc");
              }
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <Icon className="w-3 h-3" />
            {label}
            {sortField === field && (
              sortDir === "desc"
                ? <ArrowDown className="w-3 h-3" />
                : <ArrowUp className="w-3 h-3" />
            )}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Post</TableHead>
              <TableHead className="w-28">Platforms</TableHead>
              <TableHead className="w-20 text-right">
                <button onClick={() => handleSort("views")} className="inline-flex items-center hover:text-foreground transition-colors">
                  Views<SortIcon field="views" />
                </button>
              </TableHead>
              <TableHead className="w-28 text-right">
                <button onClick={() => handleSort("engagement")} className="inline-flex items-center hover:text-foreground transition-colors">
                  Engagement<SortIcon field="engagement" />
                </button>
              </TableHead>
              <TableHead className="w-20 text-right">
                <button onClick={() => handleSort("engagementRate")} className="inline-flex items-center hover:text-foreground transition-colors">
                  Rate<SortIcon field="engagementRate" />
                </button>
              </TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28">Source</TableHead>
              <TableHead className="w-24">Objective</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePosts.map((post, index) => {
              const extPost = post as PostWithPlatforms;
              const platforms = extPost._platforms || [];
              const hasMultiplePlatforms = platforms.length > 1;
              const isExpanded = expandedPosts.has(post.postId);
              const objConfig = post.objective ? objectiveConfig[post.objective] : null;
              const ObjIcon = objConfig?.icon;

              const truncatedContent = post.content
                ? post.content.length > 80
                  ? post.content.slice(0, 80) + "…"
                  : post.content
                : null;

              return (
                <>
                  <TableRow
                    key={post.postId}
                    className={cn("group", hasMultiplePlatforms && "cursor-pointer", highlightPostId === post.postId && "ring-2 ring-primary/50 bg-primary/5")}
                    onClick={hasMultiplePlatforms ? () => toggleExpand(post.postId) : undefined}
                  >
                    {/* Rank */}
                    <TableCell className="font-bold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {hasMultiplePlatforms && (
                          isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        {index + 1}
                      </div>
                    </TableCell>

                    {/* Post preview */}
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {post.thumbnailUrl ? (
                          <img
                            src={post.thumbnailUrl}
                            alt=""
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[280px]">
                            {truncatedContent || "Media post"}
                          </p>
                          {post.publishedAt && (
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(post.publishedAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Platforms */}
                    <TableCell>
                      <PlatformBadges platforms={platforms} />
                      {platforms.length === 0 && (
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={post.platform} />
                          <span className="text-sm">{platformNames[post.platform] || post.platform}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Views (rollup) */}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNumber(post.views || post.impressions)}
                    </TableCell>

                    {/* Engagement (rollup) */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 text-sm tabular-nums">
                        <span className="flex items-center gap-0.5" title="Likes">
                          <Heart className="w-3 h-3 text-destructive" />
                          {formatNumber(post.likes)}
                        </span>
                        <span className="flex items-center gap-0.5" title="Comments">
                          <MessageCircle className="w-3 h-3 text-primary" />
                          {formatNumber(post.comments)}
                        </span>
                        <span className="flex items-center gap-0.5" title="Shares">
                          <Share2 className="w-3 h-3 text-success" />
                          {formatNumber(post.shares)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Engagement Rate */}
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-semibold",
                          post.engagementRate >= 5
                            ? "bg-success/10 text-success"
                            : post.engagementRate >= 2
                              ? "bg-warning/10 text-warning"
                              : ""
                        )}
                      >
                        {post.engagementRate.toFixed(1)}%
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const status = extPost._status;
                        if (!status) return <span className="text-xs text-muted-foreground">—</span>;
                        const statusStyles: Record<string, string> = {
                          published: "bg-success/10 text-success",
                          partial: "bg-warning/10 text-warning",
                          scheduled: "bg-primary/10 text-primary",
                          draft: "bg-muted text-muted-foreground",
                          failed: "bg-destructive/10 text-destructive",
                        };
                        const label = status.charAt(0).toUpperCase() + status.slice(1);
                        return (
                          <Badge variant="secondary" className={cn("text-xs", statusStyles[status] || "")}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>

                    {/* Source */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {post.source === "getlate" ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Zap className="w-3 h-3" />Longtale
                        </Badge>
                      ) : post.source === "direct" ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Globe className="w-3 h-3" />Direct
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Objective */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {objConfig && ObjIcon ? (
                        <Badge variant="secondary" className={cn("text-xs gap-1", objConfig.className)}>
                          <ObjIcon className="w-3 h-3" />
                          {objConfig.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {post.postUrl && (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground inline-flex"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive inline-flex opacity-0 group-hover:opacity-100"
                              title="Delete post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the post from Longtale. This action cannot be undone.
                                {post.content && (
                                  <span className="block mt-2 text-xs italic truncate max-w-md">
                                    "{post.content.slice(0, 100)}…"
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deletePost.mutate(post.postId, {
                                    onSuccess: () => onDeleted?.(),
                                  });
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletePost.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded per-platform rows */}
                  {isExpanded && platforms.map((entry, idx) => (
                    <SubPlatformRow key={`${post.postId}-${entry.platform}-${idx}`} entry={entry} />
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            Load more ({sortedPosts.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Showing {Math.min(visibleCount, sortedPosts.length)} of {sortedPosts.length} posts
      </p>
    </div>
  );
}
