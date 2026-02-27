/**
 * Metrics Registry — Type Definitions
 *
 * This is the core type system for the metrics layer.
 * Metric definitions are declarative configs that describe how to compute,
 * format, and visualize any metric without touching component code.
 */

// ─── Data Sources ────────────────────────────────────────────────

/** Identifies which existing hook/RPC provides the raw data for a metric */
export type DataSourceId =
  | "historical-analytics"    // useHistoricalAnalytics → AnalyticsSummary
  | "platform-breakdown"      // usePlatformBreakdown → PlatformMetrics[]
  | "top-posts"               // useTopPerformingPosts → TopPost[]
  | "account-growth"          // useAccountGrowth → AccountGrowthSummary
  | "views-by-publish-date"   // useViewsByPublishDate → ViewsByDate[]
  | "last-sync-time";         // useLastSyncTime → string | null

/** Parameters common to most data sources */
export interface DataSourceParams {
  days?: number;
  platform?: string;
}

// ─── Metric Definition ───────────────────────────────────────────

/** How a metric value should be formatted for display */
export type MetricFormat =
  | "number"        // 12,345
  | "compact"       // 12.3K
  | "percent"       // 4.2%
  | "decimal"       // 3.14
  | "duration"      // 2h 15m
  | "change"        // +12.3%
  | "custom";

/** The visual representation a metric can take */
export type WidgetType =
  | "stat"          // Single big number with label + change
  | "sparkline"     // Tiny inline line chart
  | "line"          // Full line chart
  | "area"          // Area chart (single or stacked)
  | "bar"           // Vertical or horizontal bar
  | "donut"         // Pie/donut chart
  | "table"         // Tabular breakdown
  | "trend";        // Number with trend arrow

/** Defines a single computed metric */
export interface MetricDefinition {
  /** Unique identifier, e.g. "engagement_rate" */
  id: string;

  /** Human-readable label shown in UI */
  label: string;

  /** Short description for tooltips / documentation */
  description: string;

  /** Semantic category for grouping in UI */
  category: MetricCategory;

  /** Which data source provides the raw inputs */
  dataSource: DataSourceId;

  /**
   * Pure function that extracts/computes this metric's value
   * from the raw data source output.
   * Receives the full data source result + optional params.
   */
  compute: (data: any, params?: DataSourceParams) => MetricResult;

  /** How to format the computed value for display */
  format: MetricFormat;

  /** Optional: custom format function override */
  formatFn?: (value: number) => string;

  /** Default widget type for rendering this metric */
  defaultWidget: WidgetType;

  /** Chart color from the design system */
  color?: string;

  /** Icon name (lucide) for stat widgets */
  icon?: string;

  /** Whether this metric supports time-series breakdown */
  supportsTimeSeries: boolean;

  /** Optional: related metric IDs for contextual display */
  relatedMetrics?: string[];

  /** Optional: thresholds for conditional formatting */
  thresholds?: MetricThreshold[];
}

/** The output of computing a metric */
export interface MetricResult {
  /** The primary scalar value */
  value: number;

  /** Optional: previous period value for comparison */
  previousValue?: number;

  /** Optional: percent change from previous period */
  change?: number;

  /** Optional: time-series data points */
  series?: MetricDataPoint[];

  /** Optional: breakdown by dimension (platform, objective, etc.) */
  breakdown?: MetricBreakdownItem[];

  /** Optional: metadata about data freshness */
  freshness?: {
    lastUpdated: string | null;
    isStale: boolean;
  };
}

export interface MetricDataPoint {
  date: string;
  value: number;
}

export interface MetricBreakdownItem {
  label: string;
  value: number;
  color?: string;
}

// ─── Categories ──────────────────────────────────────────────────

export type MetricCategory =
  | "engagement"
  | "reach"
  | "audience"
  | "content"
  | "performance";

export const METRIC_CATEGORIES: Record<MetricCategory, { label: string; description: string }> = {
  engagement: { label: "Engagement", description: "How users interact with your content" },
  reach: { label: "Reach", description: "How far your content spreads" },
  audience: { label: "Audience", description: "Who follows and sees your content" },
  content: { label: "Content", description: "What you publish and how it performs" },
  performance: { label: "Performance", description: "Computed scores and benchmarks" },
};

// ─── Thresholds ──────────────────────────────────────────────────

export interface MetricThreshold {
  /** Value above which this threshold applies */
  min: number;
  /** Semantic status */
  status: "success" | "warning" | "danger" | "neutral";
  /** Label shown in UI */
  label: string;
}

// ─── Widget Config ───────────────────────────────────────────────

/** Configuration for rendering a metric as a dashboard widget */
export interface WidgetConfig {
  /** Which metric to display */
  metricId: string;

  /** Override the default widget type */
  widgetType?: WidgetType;

  /** Grid span (1-4 columns) */
  colSpan?: 1 | 2 | 3 | 4;

  /** Compact mode for dashboard summaries */
  compact?: boolean;

  /** Override chart height */
  height?: number;

  /** Show/hide specific UI elements */
  show?: {
    change?: boolean;
    sparkline?: boolean;
    freshness?: boolean;
    description?: boolean;
  };
}
