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
import { GetLatePost } from "@/lib/api/getlate";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import {
  formatNumber,
  PlatformIconsRenderer,
  DotStatusRenderer,
  TwoLineDateRenderer,
  ExpandToggleRenderer,
  DetailRowRenderer,
  platformMeta,
} from "@/components/ui/data-grid-cells";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";

interface QueueGridProps {
  posts: GetLatePost[];
  onEditPost: (post: GetLatePost) => void;
  onDeletePost: (postId: string) => void;
}

// Row type that includes detail rows for expandable platform results
interface QueueRow {
  id: number;
  type: "parent" | "detail";
  parentId?: number;
  postId: string;
  text: string;
  platform: string[];
  status: string;
  scheduledFor?: string;
  isExpanded?: boolean;
  // Detail row fields
  detailPlatform?: string;
  detailLikes?: number;
  detailComments?: number;
  detailShares?: number;
  detailViews?: number;
  // Original post reference
  _post?: GetLatePost;
}

function mapPostsToRows(posts: GetLatePost[], expandedIds: Set<number>): QueueRow[] {
  const rows: QueueRow[] = [];
  posts.forEach((post, i) => {
    const platforms = (post.platformResults || []).map((pr) => pr.platform);
    const row: QueueRow = {
      id: i + 1,
      type: "parent",
      postId: post.id,
      text: post.text || "Untitled",
      platform: platforms.length > 0 ? platforms : [],
      status: post.status,
      scheduledFor: post.scheduledFor,
      isExpanded: expandedIds.has(i + 1),
      _post: post,
    };
    rows.push(row);

    if (expandedIds.has(i + 1) && post.platformResults) {
      post.platformResults.forEach((pr, j) => {
        rows.push({
          id: (i + 1) * 1000 + j,
          type: "detail",
          parentId: i + 1,
          postId: post.id,
          text: post.text,
          platform: [pr.platform],
          status: pr.status === "success" ? "published" : "failed",
          detailPlatform: pr.platform,
          detailLikes: 0,
          detailComments: 0,
          detailShares: 0,
          detailViews: 0,
        });
      });
    }
  });
  return rows;
}

export function QueueGrid({ posts, onEditPost, onDeletePost }: QueueGridProps) {
  const gridRef = useRef<AgGridReact<QueueRow>>(null);
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";
  const theme = isDark ? gridThemeDark : gridTheme;

  const [quickFilter, setQuickFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "queue-export.csv" });
  }, []);

  const colDefs = useMemo<ColDef<QueueRow>[]>(
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
        field: "text",
        flex: 3,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<QueueRow>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col min-w-0 leading-tight py-1">
              <span className="truncate text-sm font-medium">{data.text}</span>
              {data.platform.length > 0 && (
                <span className="truncate text-xs text-gray-400">
                  {data.platform.join(", ")}
                </span>
              )}
            </div>
          );
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Platform",
        field: "platform",
        width: 120,
        cellRenderer: PlatformIconsRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => params.data?.platform?.join(", ") || "",
      },
      {
        headerName: "Status",
        field: "status",
        width: 130,
        cellRenderer: DotStatusRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Scheduled",
        field: "scheduledFor",
        width: 160,
        cellRenderer: (params: ICellRendererParams<QueueRow>) => {
          const dateStr = params.value as string;
          if (!dateStr) return <span className="text-xs text-gray-400">Not scheduled</span>;
          const d = new Date(dateStr);
          return (
            <div className="flex flex-col leading-tight py-1">
              <span className="text-sm font-medium">
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-xs text-gray-400">
                {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          );
        },
        filter: "agDateColumnFilter",
        comparator: (a: string, b: string) =>
          new Date(a || 0).getTime() - new Date(b || 0).getTime(),
      },
      {
        headerName: "Actions",
        width: 100,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: "right",
        cellRenderer: (params: ICellRendererParams<QueueRow>) => {
          const data = params.data;
          if (!data || data.type === "detail" || !data._post) return null;
          return (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-gray-700"
                onClick={() => onEditPost(data._post!)}
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-600"
                onClick={() => onDeletePost(data.postId)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [onEditPost, onDeletePost]
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
    (params: IsFullWidthRowParams<QueueRow>) => params.rowNode.data?.type === "detail",
    []
  );

  const getRowHeight = useCallback(
    (params: RowHeightParams<QueueRow>) => (params.data?.type === "detail" ? 64 : undefined),
    []
  );

  const getRowClass = useCallback(
    (params: { data?: QueueRow }) => {
      if (params.data?.type === "detail") return "ag-full-width-detail";
      return undefined;
    },
    []
  );

  return (
    <div className="space-y-3">
      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder="Search posts..."
      />

      <div className="relative">
        <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
        <AgGridReact<QueueRow>
          ref={gridRef}
          theme={theme}
          modules={[AllCommunityModule]}
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50]}
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
    </div>
  );
}
