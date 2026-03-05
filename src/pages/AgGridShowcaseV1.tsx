import { useState, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type ValueFormatterParams,
  type GridReadyEvent,
  type IsFullWidthRowParams,
  type RowHeightParams,
} from "ag-grid-community";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Search,
  Eye,
  Pencil,
  Trash2,
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import "@/styles/ag-grid-theme.css";

// ---------- Types ----------

interface ShowcaseRow {
  id: number;
  type: "parent" | "detail";
  parentId?: number;
  title: string;
  platform: string[];
  status: "published" | "draft" | "scheduled" | "failed";
  source: "manual" | "ai" | "rss" | "automation";
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagementRate: number;
  publishedAt: string;
  thumbnail?: string;
  company?: string;
  isExpanded?: boolean;
  // Detail row fields
  detailPlatform?: string;
  detailLikes?: number;
  detailComments?: number;
  detailShares?: number;
  detailViews?: number;
}

// ---------- Dummy Data ----------

const PLATFORMS = ["twitter", "facebook", "instagram", "linkedin", "tiktok"];
const STATUSES: ShowcaseRow["status"][] = ["published", "draft", "scheduled", "failed"];
const SOURCES: ShowcaseRow["source"][] = ["manual", "ai", "rss", "automation"];
const COMPANIES = [
  "TechCrunch", "The Verge", "Wired", "Ars Technica", "Engadget",
  "Mashable", "CNET", "Gizmodo", "9to5Mac", "Android Central"
];

const TITLES = [
  "Breaking: AI startup raises $500M Series C round",
  "How to optimize your social media strategy in 2026",
  "Top 10 productivity tools every remote worker needs",
  "The future of work: hybrid offices are here to stay",
  "New study reveals surprising trends in Gen Z social media usage",
  "5 ways to boost your LinkedIn engagement this quarter",
  "Tech layoffs slow as companies pivot to AI hiring",
  "Why TikTok is becoming the new search engine for Gen Z",
  "Instagram Reels vs YouTube Shorts: which drives more traffic?",
  "The rise of micro-influencers in B2B marketing",
  "How media companies are monetizing newsletters in 2026",
  "Breaking down the latest changes to the X/Twitter algorithm",
  "Social commerce: turning followers into customers",
  "The complete guide to cross-posting without looking spammy",
  "Data privacy regulations reshape social media advertising",
  "Why your company needs a brand voice document",
  "Video-first strategy: adapting to the short-form revolution",
  "Community building: from followers to superfans",
  "Analytics deep dive: metrics that actually matter",
  "How AI content generation is changing newsrooms",
  "Mastering the art of the social media calendar",
  "Building a content repurposing workflow that scales",
  "The ROI of social listening for media companies",
  "Platform algorithm changes: what publishers need to know",
  "Creating viral content: science or art?",
  "Employee advocacy programs that actually work",
  "Social media crisis management: a step-by-step guide",
  "The state of podcasting and social media cross-promotion",
  "Newsletter to social: repurposing long-form content",
  "Measuring brand sentiment across social platforms",
  "How to use UGC effectively without legal headaches",
  "The death of organic reach: what comes next?",
  "Building authentic connections in the age of AI content",
  "Social media trends to watch for Q2 2026",
  "How to conduct a social media audit in 30 minutes",
];

function generateRows(): ShowcaseRow[] {
  return TITLES.map((title, i) => {
    const numPlatforms = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5);
    const platforms = shuffled.slice(0, numPlatforms);

    return {
      id: i + 1,
      type: "parent" as const,
      title,
      platform: platforms,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      likes: Math.floor(Math.random() * 50000),
      comments: Math.floor(Math.random() * 5000),
      shares: Math.floor(Math.random() * 10000),
      views: Math.floor(Math.random() * 500000),
      engagementRate: parseFloat((Math.random() * 15).toFixed(2)),
      publishedAt: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 86400000
      ).toISOString(),
      company: COMPANIES[Math.floor(Math.random() * COMPANIES.length)],
    };
  });
}

function generateDetailRows(parent: ShowcaseRow): ShowcaseRow[] {
  return parent.platform.map((p, i) => ({
    ...parent,
    id: parent.id * 1000 + i,
    type: "detail" as const,
    parentId: parent.id,
    detailPlatform: p,
    detailLikes: Math.floor(parent.likes * (0.2 + Math.random() * 0.6)),
    detailComments: Math.floor(parent.comments * (0.2 + Math.random() * 0.6)),
    detailShares: Math.floor(parent.shares * (0.2 + Math.random() * 0.6)),
    detailViews: Math.floor(parent.views * (0.2 + Math.random() * 0.6)),
  }));
}

// ---------- Formatters ----------

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ---------- Cell Renderers ----------

const platformColors: Record<string, string> = {
  twitter: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  linkedin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  tiktok: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

function PlatformCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const platforms: string[] = params.value || [];
  return (
    <div className="flex items-center gap-1 flex-wrap py-1">
      {platforms.map((p) => (
        <span
          key={p}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${platformColors[p] || "bg-gray-100 text-gray-700"}`}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  published: "default",
  draft: "secondary",
  scheduled: "outline",
  failed: "destructive",
};

function StatusCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const status = params.value as string;
  return (
    <Badge variant={statusVariants[status] || "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}

function SourceCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const source = params.value as string;
  const colors: Record<string, string> = {
    manual: "bg-gray-100 text-gray-600",
    ai: "bg-purple-100 text-purple-700",
    rss: "bg-amber-100 text-amber-700",
    automation: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[source] || ""}`}>
      {source}
    </span>
  );
}

function EngagementCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const data = params.data;
  if (!data) return null;
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1" title="Likes">
        <Heart className="h-3.5 w-3.5 text-rose-500" />
        {formatNumber(data.likes)}
      </span>
      <span className="flex items-center gap-1" title="Comments">
        <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
        {formatNumber(data.comments)}
      </span>
      <span className="flex items-center gap-1" title="Shares">
        <Share2 className="h-3.5 w-3.5 text-green-500" />
        {formatNumber(data.shares)}
      </span>
    </div>
  );
}

function RateBadgeCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const rate = params.value as number;
  const color =
    rate >= 5 ? "text-green-600 bg-green-50" :
    rate >= 2 ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {rate.toFixed(1)}%
    </span>
  );
}

function DateCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const dateStr = params.value as string;
  if (!dateStr) return null;
  return (
    <div className="text-sm" title={new Date(dateStr).toLocaleString()}>
      {relativeTime(dateStr)}
    </div>
  );
}

function ActionsCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ExpandCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const data = params.data;
  if (!data || data.type === "detail") return null;
  const isExpanded = data.isExpanded;
  return (
    <button
      className="flex items-center justify-center w-full h-full"
      onClick={() => {
        // Trigger expand via context callback
        const event = new CustomEvent("toggle-expand", { detail: { id: data.id } });
        document.dispatchEvent(event);
      }}
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function TitleCellRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const data = params.data;
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="truncate font-medium text-sm">{data.title}</span>
    </div>
  );
}

// Full-width detail row renderer — card-style per-platform breakdown
function DetailRowRenderer(params: ICellRendererParams<ShowcaseRow>) {
  const data = params.data;
  if (!data) return null;

  const metrics = [
    { icon: Heart, label: "Likes", value: data.detailLikes || 0, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
    { icon: MessageCircle, label: "Comments", value: data.detailComments || 0, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { icon: Share2, label: "Shares", value: data.detailShares || 0, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { icon: Eye, label: "Views", value: data.detailViews || 0, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  ];

  return (
    <div className="pl-[90px] pr-6 py-3 bg-muted/20 border-l-2 border-l-primary/20">
      <div className="flex items-center gap-4">
        {/* Platform badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 ${platformColors[data.detailPlatform || ""] || "bg-gray-100 text-gray-700"}`}>
          <span className="text-sm font-semibold capitalize">{data.detailPlatform}</span>
        </div>

        {/* Metric cards */}
        <div className="flex items-center gap-2 flex-1">
          {metrics.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <div className="flex flex-col leading-none">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{formatNumber(value)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action */}
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
          <ExternalLink className="h-3.5 w-3.5" />
          View on {data.detailPlatform}
        </Button>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function AgGridShowcaseV1() {
  const { currentTheme } = useTheme();
  const gridRef = useRef<AgGridReact<ShowcaseRow>>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [baseRows] = useState<ShowcaseRow[]>(() => generateRows());

  // Manage expanded state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Build rowData with detail rows inserted after expanded parents
  const rowData = useMemo(() => {
    const result: ShowcaseRow[] = [];
    for (const row of baseRows) {
      const enrichedRow = { ...row, isExpanded: expandedIds.has(row.id) };
      result.push(enrichedRow);
      if (expandedIds.has(row.id)) {
        result.push(...generateDetailRows(row));
      }
    }
    return result;
  }, [baseRows, expandedIds]);

  // Listen for expand toggle events
  useState(() => {
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
  });

  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";

  const columnDefs = useMemo<ColDef<ShowcaseRow>[]>(
    () => [
      {
        headerName: "",
        field: "id",
        width: 40,
        cellRenderer: ExpandCellRenderer,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        headerName: "Post",
        field: "title",
        flex: 2,
        minWidth: 250,
        cellRenderer: TitleCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Platform",
        field: "platform",
        width: 180,
        cellRenderer: PlatformCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) =>
          params.data?.platform?.join(", ") || "",
      },
      {
        headerName: "Status",
        field: "status",
        width: 120,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Source",
        field: "source",
        width: 120,
        cellRenderer: SourceCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Engagement",
        field: "likes",
        width: 200,
        cellRenderer: EngagementCellRenderer,
        sortable: true,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Views",
        field: "views",
        width: 100,
        valueFormatter: (params: ValueFormatterParams) =>
          formatNumber(params.value || 0),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Rate",
        field: "engagementRate",
        width: 90,
        cellRenderer: RateBadgeCellRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Company",
        field: "company",
        width: 140,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Published",
        field: "publishedAt",
        width: 110,
        cellRenderer: DateCellRenderer,
        filter: "agDateColumnFilter",
        sort: "desc",
      },
      {
        headerName: "Actions",
        field: "id",
        width: 120,
        cellRenderer: ActionsCellRenderer,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: "right",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
    }),
    []
  );

  const isFullWidthRow = useCallback(
    (params: IsFullWidthRowParams<ShowcaseRow>) => {
      return params.rowNode.data?.type === "detail";
    },
    []
  );

  const getRowHeight = useCallback(
    (params: RowHeightParams<ShowcaseRow>) => {
      return params.data?.type === "detail" ? 64 : 52;
    },
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Auto-size all columns on first render
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: "social-suite-export.csv",
      onlySelected: false,
    });
  }, []);

  const getRowId = useCallback(
    (params: { data: ShowcaseRow }) => String(params.data.id),
    []
  );

  const getRowClass = useCallback(
    (params: { data?: ShowcaseRow }) => {
      if (params.data?.type === "detail") return "ag-full-width-detail";
      return "group/row";
    },
    []
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AG Grid Showcase</h1>
          <p className="text-muted-foreground mt-1">
            Master showcase demonstrating all AG Grid Community features before migrating 17+ tables.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Quick filter across all columns..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="text-sm text-muted-foreground ml-auto">
            {baseRows.length} posts &middot; {expandedIds.size} expanded &middot; Theme: {currentTheme}
          </div>
        </div>

        {/* Grid */}
        <div
          className={isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ height: 700, width: "100%" }}
        >
          <AgGridReact<ShowcaseRow>
            ref={gridRef}
            modules={[AllCommunityModule]}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilter}
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            animateRows={true}
            isFullWidthRow={isFullWidthRow}
            fullWidthCellRenderer={DetailRowRenderer}
            getRowHeight={getRowHeight}
            onGridReady={onGridReady}
            getRowId={getRowId}
            getRowClass={getRowClass}
            suppressCellFocus={false}
            enableCellTextSelection={true}
          />
        </div>

        {/* Feature Checklist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            "Multi-column sorting (click headers)",
            "Per-column filters (hover header)",
            "Quick filter (global search)",
            "Column resize (drag borders)",
            "Column reorder (drag headers)",
            "CSV export",
            "Checkbox row selection",
            "Built-in pagination",
            "Page size selector",
            "Expandable detail rows",
            "Custom cell renderers",
            "Keyboard navigation",
            "Column pinning (Actions pinned right)",
            "Auto-size columns to fit",
            "Row hover highlighting",
            "Column menu (right-click header)",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
