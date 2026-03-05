import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type ValueFormatterParams,
  type GridReadyEvent,
  type IsFullWidthRowParams,
  type RowHeightParams,
  type SelectionChangedEvent,
} from "ag-grid-community";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, X, Pencil, Trash2, FileDown, Sun, Moon } from "lucide-react";
import { gridTheme, gridThemeDark } from "@/lib/ag-grid-theme";
import {
  formatNumber,
  PlatformIconsRenderer,
  DotStatusRenderer,
  SourcePillRenderer,
  TwoLineTitleRenderer,
  TwoLineDateRenderer,
  EngagementRenderer,
  RateBadgeRenderer,
  ActionsRenderer,
  ExpandToggleRenderer,
  DetailRowRenderer,
  StarRatingRenderer,
  ProgressBarRenderer,
  SparklineRenderer,
  AvatarStackRenderer,
  ToggleRenderer,
  TagListRenderer,
  ThumbnailRenderer,
} from "@/components/ui/data-grid-cells";

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
  detailPlatform?: string;
  detailLikes?: number;
  detailComments?: number;
  detailShares?: number;
  detailViews?: number;
  // New column data
  qualityScore: number;
  reachGoal: number;
  trend: number[];
  assignees: string[];
  autoSchedule: boolean;
  tags: string[];
  thumbnailUrl: string;
}

// ---------- Dummy Data ----------

const PLATFORMS = ["twitter", "facebook", "instagram", "linkedin", "tiktok"];
const STATUSES: ShowcaseRow["status"][] = ["published", "draft", "scheduled", "failed"];
const SOURCES: ShowcaseRow["source"][] = ["manual", "ai", "rss", "automation"];
const COMPANIES = [
  "TechCrunch", "The Verge", "Wired", "Ars Technica", "Engadget",
  "Mashable", "CNET", "Gizmodo", "9to5Mac", "Android Central",
];

const TEAM_MEMBERS = [
  "Alice", "Bob", "Charlie", "Diana", "Eve",
  "Frank", "Grace", "Henry", "Ivy", "Jack",
];

const ALL_TAGS = ["tech", "business", "social", "marketing", "news", "opinion", "tutorial", "research"];

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
      qualityScore: 1 + Math.floor(Math.random() * 5),
      reachGoal: Math.floor(Math.random() * 100),
      trend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000)),
      assignees: [...TEAM_MEMBERS]
        .sort(() => Math.random() - 0.5)
        .slice(0, 1 + Math.floor(Math.random() * 4)),
      autoSchedule: Math.random() > 0.4,
      tags: [...ALL_TAGS]
        .sort(() => Math.random() - 0.5)
        .slice(0, 1 + Math.floor(Math.random() * 3)),
      thumbnailUrl: `https://picsum.photos/seed/${i + 1}/112/80`,
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

// ---------- Filter Chips ----------

interface FilterChip {
  id: string;
  label: string;
  color: string;
  bgColor: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: "published", label: "Published", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  { id: "high-engagement", label: "High engagement", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  { id: "ai-generated", label: "AI generated", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  { id: "multi-platform", label: "Multi-platform", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
];

// ---------- Main Component ----------

export default function AgGridShowcase() {
  const { currentTheme } = useTheme();
  const gridRef = useRef<AgGridReact<ShowcaseRow>>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [baseRows] = useState<ShowcaseRow[]>(() => generateRows());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedCount, setSelectedCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);

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

  const globalDark = currentTheme === "dark-pro" || currentTheme === "aurora";
  const isDark = darkOverride !== null ? darkOverride : globalDark;

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply filter chips as external filter
  const isExternalFilterPresent = useCallback(() => {
    return activeFilters.size > 0;
  }, [activeFilters]);

  const doesExternalFilterPass = useCallback(
    (node: { data?: ShowcaseRow }) => {
      if (!node.data || node.data.type === "detail") return true;
      const d = node.data;
      for (const f of activeFilters) {
        if (f === "published" && d.status !== "published") return false;
        if (f === "high-engagement" && d.engagementRate < 5) return false;
        if (f === "ai-generated" && d.source !== "ai") return false;
        if (f === "multi-platform" && d.platform.length < 2) return false;
      }
      return true;
    },
    [activeFilters]
  );

  // Re-apply external filter when chips change
  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [activeFilters]);

  const columnDefs = useMemo<ColDef<ShowcaseRow>[]>(
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
        minWidth: 280,
        cellRenderer: TwoLineTitleRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Platform",
        field: "platform",
        width: 140,
        cellRenderer: PlatformIconsRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) =>
          params.data?.platform?.join(", ") || "",
      },
      {
        headerName: "Status",
        field: "status",
        width: 130,
        cellRenderer: DotStatusRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Source",
        field: "source",
        width: 120,
        cellRenderer: SourcePillRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Engagement",
        field: "likes",
        width: 210,
        cellRenderer: EngagementRenderer,
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
        cellRenderer: RateBadgeRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Published",
        field: "publishedAt",
        width: 140,
        cellRenderer: TwoLineDateRenderer,
        filter: "agDateColumnFilter",
        sort: "desc",
      },
      {
        headerName: "Quality",
        field: "qualityScore",
        width: 110,
        cellRenderer: StarRatingRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Reach Goal",
        field: "reachGoal",
        width: 160,
        cellRenderer: ProgressBarRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Trend",
        field: "trend",
        width: 110,
        cellRenderer: SparklineRenderer,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Team",
        field: "assignees",
        width: 120,
        cellRenderer: AvatarStackRenderer,
        filter: false,
      },
      {
        headerName: "Auto",
        field: "autoSchedule",
        width: 80,
        cellRenderer: ToggleRenderer,
        filter: false,
      },
      {
        headerName: "Tags",
        field: "tags",
        width: 160,
        cellRenderer: TagListRenderer,
        filter: false,
      },
      {
        headerName: "Preview",
        field: "thumbnailUrl",
        width: 90,
        cellRenderer: ThumbnailRenderer,
        sortable: false,
        filter: false,
      },
      {
        headerName: "",
        field: "id",
        width: 110,
        cellRenderer: ActionsRenderer,
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
      cellStyle: { display: "flex", alignItems: "center", overflow: "hidden" },
    }),
    []
  );

  const isFullWidthRow = useCallback(
    (params: IsFullWidthRowParams<ShowcaseRow>) =>
      params.rowNode.data?.type === "detail",
    []
  );

  const getRowHeight = useCallback(
    (params: RowHeightParams<ShowcaseRow>) =>
      params.data?.type === "detail" ? 64 : undefined,
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<ShowcaseRow>) => {
    setSelectedCount(event.api.getSelectedRows().length);
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
      return undefined;
    },
    []
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AG Grid Showcase</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Tablicka-inspired design system. Compare with{" "}
            <a href="/app/admin/ag-grid-showcase-v1" className="text-blue-600 hover:underline">
              V1 (original)
            </a>
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilters.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleFilter(chip.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? `${chip.bgColor} ${chip.color} shadow-sm`
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                {chip.label}
                {active && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Search + Export */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search posts..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="pl-9 h-9 bg-white border-gray-200"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onExportCsv} className="h-9 border-gray-200">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-gray-200"
            onClick={() => setDarkOverride((prev) => (prev === null ? !globalDark : !prev))}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Grid */}
        <div className="relative">
          {/* Ensure AG Grid cell wrappers fill full width for custom renderers */}
          <style>{`
            .ag-cell-wrapper { width: 100%; }
            .ag-cell-value { width: 100%; }
          `}</style>
          <AgGridReact<ShowcaseRow>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
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
            onSelectionChanged={onSelectionChanged}
            getRowId={getRowId}
            getRowClass={getRowClass}
            suppressCellFocus={false}
            enableCellTextSelection={true}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            domLayout="autoHeight"
          />

          {/* Selection Action Bar */}
          {selectedCount > 0 && (
            <div className="sticky bottom-4 mx-auto w-fit mt-4 flex items-center gap-3 bg-[#1a1a2e] text-white px-5 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 duration-200">
              <span className="text-sm font-medium">
                {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <div className="h-4 w-px bg-white/20" />
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-8 text-xs gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-8 text-xs gap-1.5">
                <FileDown className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-8 text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Feature Checklist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-2">
          {[
            "Tablicka-inspired theme",
            "Two-line post cells",
            "Two-line date cells",
            "Dot-prefixed status badges",
            "Star ratings",
            "Progress bars",
            "Inline sparklines",
            "Avatar stacks",
            "Toggle switches",
            "Tag lists",
            "Image thumbnails",
            "Filter chips toolbar",
            "Selection action bar",
            "Post hover preview",
            "Expandable detail rows",
            "17 reusable renderers",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-gray-500">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
