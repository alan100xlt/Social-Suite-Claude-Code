import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type ValueFormatterParams,
  type IsFullWidthRowParams,
  type RowHeightParams,
  type GridReadyEvent,
} from "ag-grid-community";
import { gridTheme, gridThemeDark } from "@/lib/ag-grid-theme";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Zap,
  Megaphone,
  MousePointerClick,
  Loader2,
  ArrowDown,
  ArrowUp,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import type { TopPost } from "@/hooks/useTopPerformingPosts";
import type { PostWithPlatforms, PlatformAnalytics } from "@/hooks/useAllPostsWithAnalytics";
import { useDeletePost, useUnpublishPost } from "@/hooks/useGetLatePosts";
import {
  formatNumber,
  PlatformIconsRenderer,
  DotStatusRenderer,
  SourcePillRenderer,
  EngagementRenderer,
  RateBadgeRenderer,
  ExpandToggleRenderer,
  DetailRowRenderer,
} from "@/components/ui/data-grid-cells";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";

// ---------- Types ----------

const objectiveConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  reach: { label: "Reach", icon: Megaphone, className: "bg-primary/10 text-primary" },
  engagement: { label: "Engagement", icon: MessageCircle, className: "bg-accent/10 text-accent" },
  clicks: { label: "Clicks", icon: MousePointerClick, className: "bg-warning/10 text-warning" },
};

interface TopPostsTableProps {
  posts: (TopPost | PostWithPlatforms)[];
  isLoading: boolean;
  onDeleted?: () => void;
  highlightPostId?: string;
}

type SortField = "date" | "engagement" | "views" | "engagementRate" | "comments" | "shares";

function getTotalEngagement(post: TopPost) {
  return (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
}

// Flat row type for AG Grid
interface TopPostRow {
  id: number;
  type: "parent" | "detail";
  parentId?: number;
  postId: string;
  content: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  platform: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  totalEngagement: number;
  status: string;
  source: string | null;
  objective: string | null;
  postUrl: string | null;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  // Detail row fields
  detailPlatform?: string;
  detailLikes?: number;
  detailComments?: number;
  detailShares?: number;
  detailViews?: number;
  // References
  _extPost?: PostWithPlatforms;
  _platforms?: PlatformAnalytics[];
}

function mapPostsToRows(
  posts: (TopPost | PostWithPlatforms)[],
  expandedIds: Set<number>,
  highlightPostId?: string
): TopPostRow[] {
  const rows: TopPostRow[] = [];
  posts.forEach((post, i) => {
    const extPost = post as PostWithPlatforms;
    const platforms = extPost._platforms || [];
    const uniquePlatforms = [...new Set(platforms.map((p) => p.platform))];
    const hasMultiple = platforms.length > 1;
    const rowId = i + 1;

    rows.push({
      id: rowId,
      type: "parent",
      postId: post.postId,
      content: post.content || "Media post",
      thumbnailUrl: post.thumbnailUrl,
      publishedAt: post.publishedAt,
      platform: uniquePlatforms.length > 0 ? uniquePlatforms : [post.platform],
      views: post.views || post.impressions || 0,
      likes: post.likes || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
      engagementRate: post.engagementRate || 0,
      totalEngagement: getTotalEngagement(post),
      status: extPost._status || "published",
      source: post.source,
      objective: post.objective,
      postUrl: post.postUrl,
      isExpanded: hasMultiple && expandedIds.has(rowId),
      isHighlighted: post.postId === highlightPostId,
      _extPost: extPost,
      _platforms: platforms,
    });

    if (hasMultiple && expandedIds.has(rowId)) {
      platforms.forEach((entry, j) => {
        rows.push({
          id: rowId * 1000 + j,
          type: "detail",
          parentId: rowId,
          postId: post.postId,
          content: "",
          thumbnailUrl: null,
          publishedAt: null,
          platform: [entry.platform],
          views: entry.views || entry.impressions || 0,
          likes: entry.likes || 0,
          comments: entry.comments || 0,
          shares: entry.shares || 0,
          engagementRate: entry.engagementRate || 0,
          totalEngagement: (entry.likes || 0) + (entry.comments || 0) + (entry.shares || 0),
          status: entry.status,
          source: null,
          objective: null,
          postUrl: entry.postUrl,
          detailPlatform: entry.platform,
          detailLikes: entry.likes || 0,
          detailComments: entry.comments || 0,
          detailShares: entry.shares || 0,
          detailViews: entry.views || entry.impressions || 0,
        });
      });
    }
  });
  return rows;
}

// ---------- Main Component ----------

export function TopPostsTable({ posts, isLoading, onDeleted, highlightPostId }: TopPostsTableProps) {
  const gridRef = useRef<AgGridReact<TopPostRow>>(null);
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";

  const [quickFilter, setQuickFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const deletePost = useDeletePost();
  const unpublishPost = useUnpublishPost();

  // Sort posts before mapping to rows
  const sortedPosts = useMemo(() => {
    const filtered = [...posts];
    if (highlightPostId) {
      const idx = filtered.findIndex((p) => p.postId === highlightPostId);
      if (idx > 0) {
        const [highlighted] = filtered.splice(idx, 1);
        filtered.unshift(highlighted);
      }
    }
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

  const rowData = useMemo(
    () => mapPostsToRows(sortedPosts, expandedIds, highlightPostId),
    [sortedPosts, expandedIds, highlightPostId]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail.id as number;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };
    document.addEventListener("toggle-expand", handler);
    return () => document.removeEventListener("toggle-expand", handler);
  }, []);

  // Auto-expand highlighted post
  useEffect(() => {
    if (highlightPostId) {
      const idx = sortedPosts.findIndex((p) => p.postId === highlightPostId);
      if (idx >= 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(idx + 1);
          return next;
        });
      }
    }
  }, [highlightPostId, sortedPosts]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "top-posts-export.csv" });
  }, []);

  const colDefs = useMemo<ColDef<TopPostRow>[]>(
    () => [
      {
        headerName: "",
        field: "id",
        width: 40,
        cellRenderer: ExpandToggleRenderer,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        headerName: "Post",
        field: "content",
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: ICellRendererParams<TopPostRow>) => {
          const data = params.data;
          if (!data) return null;
          const truncated = data.content.length > 80
            ? data.content.slice(0, 80) + "\u2026"
            : data.content;
          return (
            <div className="flex items-center gap-3 min-w-0 py-1">
              {data.thumbnailUrl ? (
                <img
                  src={data.thumbnailUrl}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-medium truncate">{truncated}</span>
                {data.publishedAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(data.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Platforms",
        field: "platform",
        width: 120,
        cellRenderer: PlatformIconsRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => params.data?.platform?.join(", ") || "",
      },
      {
        headerName: "Views",
        field: "views",
        width: 100,
        valueFormatter: (params: ValueFormatterParams) => formatNumber(params.value || 0),
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Engagement",
        field: "likes",
        width: 200,
        cellRenderer: EngagementRenderer,
        filter: "agNumberColumnFilter",
        filterValueGetter: (params) => params.data?.totalEngagement || 0,
      },
      {
        headerName: "Rate",
        field: "engagementRate",
        width: 90,
        cellRenderer: RateBadgeRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Status",
        field: "status",
        width: 100,
        cellRenderer: DotStatusRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Source",
        field: "source",
        width: 110,
        cellRenderer: (params: ICellRendererParams<TopPostRow>) => {
          const source = params.value as string;
          if (source === "getlate") {
            return (
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="w-3 h-3" />Longtale
              </Badge>
            );
          }
          if (source === "direct") {
            return (
              <Badge variant="secondary" className="text-xs gap-1">
                Direct
              </Badge>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Objective",
        field: "objective",
        width: 110,
        cellRenderer: (params: ICellRendererParams<TopPostRow>) => {
          const objective = params.value as string;
          const config = objective ? objectiveConfig[objective] : null;
          if (!config) return <span className="text-xs text-muted-foreground">—</span>;
          const ObjIcon = config.icon;
          return (
            <Badge variant="secondary" className={cn("text-xs gap-1", config.className)}>
              <ObjIcon className="w-3 h-3" />
              {config.label}
            </Badge>
          );
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Actions",
        width: 120,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: "right",
        cellRenderer: (params: ICellRendererParams<TopPostRow>) => {
          const data = params.data;
          if (!data || data.type === "detail") return null;
          return (
            <div className="flex items-center gap-0.5">
              {data.postUrl && (
                <a
                  href={data.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground inline-flex"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {data.status === "published" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="p-1.5 rounded hover:bg-warning/10 transition-colors text-muted-foreground hover:text-warning inline-flex"
                      title="Unpublish from social platforms"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unpublish this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the post from social platforms but keeps it in Longtale for analytics.
                        {data.content && (
                          <span className="block mt-2 text-xs italic truncate max-w-md">
                            &ldquo;{data.content.slice(0, 100)}&hellip;&rdquo;
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          unpublishPost.mutate(
                            { postId: data.postId },
                            { onSuccess: () => onDeleted?.() }
                          );
                        }}
                      >
                        {unpublishPost.isPending && (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        )}
                        Unpublish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive inline-flex"
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
                      {data.content && (
                        <span className="block mt-2 text-xs italic truncate max-w-md">
                          &ldquo;{data.content.slice(0, 100)}&hellip;&rdquo;
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deletePost.mutate(data.postId, {
                          onSuccess: () => onDeleted?.(),
                        });
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletePost.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [onDeleted, deletePost, unpublishPost]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: "flex", alignItems: "center", overflow: "hidden" },
    }),
    []
  );

  const isFullWidthRow = useCallback(
    (params: IsFullWidthRowParams<TopPostRow>) => params.rowNode.data?.type === "detail",
    []
  );

  const getRowHeight = useCallback(
    (params: RowHeightParams<TopPostRow>) => (params.data?.type === "detail" ? 64 : undefined),
    []
  );

  const getRowClass = useCallback(
    (params: { data?: TopPostRow }) => {
      if (params.data?.type === "detail") return "ag-full-width-detail";
      if (params.data?.isHighlighted) return "ring-2 ring-primary/50 bg-primary/5";
      return undefined;
    },
    []
  );

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
      {/* Sort preset buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {sortPresets.map(({ field, label, icon: Icon }) => (
          <Button
            key={field}
            variant={sortField === field ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              if (sortField === field) {
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              } else {
                setSortField(field);
                setSortDir("desc");
              }
            }}
          >
            <Icon className="w-3 h-3" />
            {label}
            {sortField === field &&
              (sortDir === "desc" ? (
                <ArrowDown className="w-3 h-3" />
              ) : (
                <ArrowUp className="w-3 h-3" />
              ))}
          </Button>
        ))}
      </div>

      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder="Search posts..."
      />

      <div className="relative">
        <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
        <AgGridReact<TopPostRow>
          ref={gridRef}
          theme={isDark ? gridThemeDark : gridTheme}
          modules={[AllCommunityModule]}
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50]}
          suppressCellFocus
          animateRows
          onGridReady={onGridReady}
          isFullWidthRow={isFullWidthRow}
          fullWidthCellRenderer={DetailRowRenderer}
          getRowHeight={getRowHeight}
          getRowClass={getRowClass}
          getRowId={(params) => String(params.data.id)}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {Math.min(rowData.filter((r) => r.type === "parent").length, sortedPosts.length)} of{" "}
        {sortedPosts.length} posts
      </p>
    </div>
  );
}
