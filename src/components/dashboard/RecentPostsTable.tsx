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
import { Loader2, FileText } from "lucide-react";
import { useAllPostsWithAnalytics, PostWithPlatforms } from "@/hooks/useAllPostsWithAnalytics";
import { format } from "date-fns";
import {
  formatNumber,
  PlatformIconsRenderer,
  DotStatusRenderer,
  ExpandToggleRenderer,
  DetailRowRenderer,
} from "@/components/ui/data-grid-cells";

// Row type for AG Grid with detail row support
interface RecentPostRow {
  id: number;
  type: "parent" | "detail";
  parentId?: number;
  content: string;
  publishedAt?: string;
  platform: string[];
  status: string;
  views: number;
  likes: number;
  isExpanded?: boolean;
  // Detail row fields
  detailPlatform?: string;
  detailLikes?: number;
  detailComments?: number;
  detailShares?: number;
  detailViews?: number;
}

function mapPostsToRows(posts: PostWithPlatforms[], expandedIds: Set<number>): RecentPostRow[] {
  const rows: RecentPostRow[] = [];
  posts.forEach((post, i) => {
    const platforms = post._platforms || [];
    const uniquePlatforms = [...new Set(platforms.map((p) => p.platform))];
    const hasMultiple = platforms.length > 1;
    const rowId = i + 1;

    rows.push({
      id: rowId,
      type: "parent",
      content: post.content?.slice(0, 80) || "—",
      publishedAt: post.publishedAt || undefined,
      platform: uniquePlatforms,
      status: post._status || "published",
      views: post.views || post.impressions || 0,
      likes: post.likes || 0,
      isExpanded: hasMultiple && expandedIds.has(rowId),
    });

    if (hasMultiple && expandedIds.has(rowId)) {
      platforms.forEach((entry, j) => {
        rows.push({
          id: rowId * 1000 + j,
          type: "detail",
          parentId: rowId,
          content: "",
          platform: [entry.platform],
          status: entry.status,
          views: entry.views || entry.impressions || 0,
          likes: entry.likes || 0,
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

export function RecentPostsTable() {
  const { data: allPosts, isLoading } = useAllPostsWithAnalytics({ days: 14 });
  const gridRef = useRef<AgGridReact<RecentPostRow>>(null);
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const posts = useMemo(() => (allPosts || []).slice(0, 8), [allPosts]);
  const rowData = useMemo(() => mapPostsToRows(posts, expandedIds), [posts, expandedIds]);

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

  const colDefs = useMemo<ColDef<RecentPostRow>[]>(
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
        headerName: "Content",
        field: "content",
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<RecentPostRow>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col min-w-0 leading-tight py-1">
              <span className="truncate text-sm font-medium">{data.content}</span>
              {data.publishedAt && (
                <span className="text-xs text-gray-400">
                  {format(new Date(data.publishedAt), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Platforms",
        field: "platform",
        width: 120,
        cellRenderer: PlatformIconsRenderer,
      },
      {
        headerName: "Status",
        field: "status",
        width: 100,
        cellRenderer: DotStatusRenderer,
      },
      {
        headerName: "Views",
        field: "views",
        width: 90,
        valueFormatter: (params: ValueFormatterParams) => formatNumber(params.value || 0),
        type: "rightAligned",
      },
      {
        headerName: "Likes",
        field: "likes",
        width: 90,
        valueFormatter: (params: ValueFormatterParams) => formatNumber(params.value || 0),
        type: "rightAligned",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      resizable: false,
      filter: false,
      cellStyle: { display: "flex", alignItems: "center", overflow: "hidden" },
    }),
    []
  );

  const isFullWidthRow = useCallback(
    (params: IsFullWidthRowParams<RecentPostRow>) => params.rowNode.data?.type === "detail",
    []
  );

  const getRowHeight = useCallback(
    (params: RowHeightParams<RecentPostRow>) => (params.data?.type === "detail" ? 64 : undefined),
    []
  );

  const getRowClass = useCallback(
    (params: { data?: RecentPostRow }) => {
      if (params.data?.type === "detail") return "ag-full-width-detail";
      return undefined;
    },
    []
  );

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
        <div className="relative">
          <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
          <AgGridReact<RecentPostRow>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
            modules={[AllCommunityModule]}
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            domLayout="autoHeight"
            suppressCellFocus
            headerHeight={40}
            rowHeight={48}
            animateRows
            onGridReady={onGridReady}
            isFullWidthRow={isFullWidthRow}
            fullWidthCellRenderer={DetailRowRenderer}
            getRowHeight={getRowHeight}
            getRowClass={getRowClass}
            getRowId={(params) => String(params.data.id)}
          />
        </div>
      )}
    </div>
  );
}
