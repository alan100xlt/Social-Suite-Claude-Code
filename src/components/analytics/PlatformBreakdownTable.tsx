import { useMemo, useCallback, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type ValueFormatterParams,
  type GridReadyEvent,
} from "ag-grid-community";
import { gridTheme, gridThemeDark } from "@/lib/ag-grid-theme";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Platform } from "@/lib/api/getlate";
import { Users } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube, FaPinterest, FaReddit, FaTelegram, FaSnapchat } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { formatNumber, RateBadgeRenderer } from "@/components/ui/data-grid-cells";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";

interface PlatformMetrics {
  platform: Platform;
  followers: number;
  following: number;
  postsCount: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  totalEngagement: number;
}

interface PlatformBreakdownTableProps {
  data: PlatformMetrics[];
  isLoading?: boolean;
}

const platformConfig: Record<string, {
  icon: React.ElementType;
  name: string;
  colorClass: string;
  bgClass: string;
}> = {
  instagram: { icon: FaInstagram, name: "Instagram", colorClass: "text-pink-500", bgClass: "bg-pink-500/10" },
  twitter: { icon: FaTwitter, name: "Twitter", colorClass: "text-sky-500", bgClass: "bg-sky-500/10" },
  facebook: { icon: FaFacebook, name: "Facebook", colorClass: "text-blue-600", bgClass: "bg-blue-600/10" },
  linkedin: { icon: FaLinkedin, name: "LinkedIn", colorClass: "text-blue-700", bgClass: "bg-blue-700/10" },
  tiktok: { icon: FaTiktok, name: "TikTok", colorClass: "text-foreground", bgClass: "bg-foreground/10" },
  youtube: { icon: FaYoutube, name: "YouTube", colorClass: "text-red-600", bgClass: "bg-red-600/10" },
  pinterest: { icon: FaPinterest, name: "Pinterest", colorClass: "text-red-500", bgClass: "bg-red-500/10" },
  reddit: { icon: FaReddit, name: "Reddit", colorClass: "text-orange-500", bgClass: "bg-orange-500/10" },
  bluesky: { icon: SiBluesky, name: "Bluesky", colorClass: "text-sky-400", bgClass: "bg-sky-400/10" },
  threads: { icon: SiThreads, name: "Threads", colorClass: "text-foreground", bgClass: "bg-foreground/10" },
  "google-business": { icon: FaFacebook, name: "Google", colorClass: "text-green-500", bgClass: "bg-green-500/10" },
  telegram: { icon: FaTelegram, name: "Telegram", colorClass: "text-blue-400", bgClass: "bg-blue-400/10" },
  snapchat: { icon: FaSnapchat, name: "Snapchat", colorClass: "text-yellow-400", bgClass: "bg-yellow-400/10" },
};

const numFormatter = (params: ValueFormatterParams) => formatNumber(params.value || 0);

export function PlatformBreakdownTable({ data, isLoading }: PlatformBreakdownTableProps) {
  const gridRef = useRef<AgGridReact<PlatformMetrics>>(null);
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";
  const [quickFilter, setQuickFilter] = useState("");

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "platform-breakdown.csv" });
  }, []);

  const colDefs = useMemo<ColDef<PlatformMetrics>[]>(
    () => [
      {
        headerName: "Platform",
        field: "platform",
        width: 160,
        cellRenderer: (params: ICellRendererParams<PlatformMetrics>) => {
          const platform = params.value as string;
          const config = platformConfig[platform] || {
            icon: Users,
            name: platform,
            colorClass: "text-muted-foreground",
            bgClass: "bg-muted",
          };
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bgClass)}>
                <Icon className={cn("w-4 h-4", config.colorClass)} />
              </div>
              <span className="font-medium">{config.name}</span>
            </div>
          );
        },
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => {
          const p = params.data?.platform;
          return p ? (platformConfig[p]?.name || p) : "";
        },
      },
      {
        headerName: "Followers",
        field: "followers",
        width: 110,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        sort: "desc",
        type: "rightAligned",
      },
      {
        headerName: "Posts",
        field: "postsCount",
        width: 90,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Views",
        field: "views",
        width: 100,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Impressions",
        field: "impressions",
        width: 110,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Likes",
        field: "likes",
        width: 90,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Comments",
        field: "comments",
        width: 100,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Shares",
        field: "shares",
        width: 90,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Clicks",
        field: "clicks",
        width: 90,
        valueFormatter: numFormatter,
        filter: "agNumberColumnFilter",
        type: "rightAligned",
      },
      {
        headerName: "Eng. Rate",
        field: "engagementRate",
        width: 100,
        cellRenderer: RateBadgeRenderer,
        filter: "agNumberColumnFilter",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: "flex", alignItems: "center", overflow: "hidden" },
    }),
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading platform data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No platform data available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect accounts and sync analytics to see breakdown
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder="Search platforms..."
      />

      <div className="relative">
        <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
        <AgGridReact<PlatformMetrics>
          ref={gridRef}
          theme={isDark ? gridThemeDark : gridTheme}
          modules={[AllCommunityModule]}
          rowData={data}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          suppressCellFocus
          animateRows
          onGridReady={onGridReady}
          getRowId={(params) => params.data.platform}
        />
      </div>
    </div>
  );
}
