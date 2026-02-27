/**
 * useMetric — Generic hook for the metrics registry
 *
 * Pass a metric ID and get back:
 *  - The computed MetricResult (value, change, series, breakdown)
 *  - The MetricDefinition (label, format, thresholds, etc.)
 *  - Loading/error state from the underlying data source
 *
 * This hook routes to the correct existing data-fetching hook
 * based on the metric's `dataSource` field, then runs the
 * metric's `compute` function on the result.
 */

import { useMemo } from "react";
import { getMetric } from "@/lib/metrics/definitions";
import type { MetricDefinition, MetricResult, DataSourceParams } from "@/lib/metrics/types";
import { useHistoricalAnalytics } from "./useHistoricalAnalytics";
import { useAccountGrowth } from "./useAccountGrowth";
import { useViewsByPublishDate } from "./useViewsByPublishDate";
import { useTopPerformingPosts } from "./useTopPerformingPosts";
import { usePlatformBreakdown } from "./usePlatformBreakdown";
import { useLastSyncTime } from "./useLastSyncTime";
import type { Platform } from "@/lib/api/getlate";

interface UseMetricOptions {
  /** Number of days for the date range (default: 30) */
  days?: number;
  /** Filter by platform */
  platform?: Platform;
}

interface UseMetricReturn {
  /** The metric definition (label, format, color, etc.) */
  definition: MetricDefinition | undefined;
  /** The computed result */
  result: MetricResult;
  /** Whether the underlying data is still loading */
  isLoading: boolean;
  /** Whether there was an error fetching data */
  isError: boolean;
  /** The raw error if any */
  error: Error | null;
}

const emptyResult: MetricResult = { value: 0 };

/**
 * Fetch and compute a single metric by ID.
 *
 * Usage:
 * ```tsx
 * const { definition, result, isLoading } = useMetric("engagement_rate", { days: 30 });
 * // result.value → 3.42
 * // result.change → +12.3
 * // result.series → [{ date, value }, ...]
 * ```
 */
export function useMetric(metricId: string, options: UseMetricOptions = {}): UseMetricReturn {
  const definition = getMetric(metricId);
  const days = options.days || 30;

  // Compute date range
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const dataSource = definition?.dataSource;

  // ── Route to the correct data hook ──
  // We call all hooks unconditionally (React rules), but only the matching one is enabled.

  const historicalAnalytics = useHistoricalAnalytics({
    startDate,
    endDate,
    platform: options.platform,
  });

  const accountGrowth = useAccountGrowth({ days });

  const viewsByPublishDate = useViewsByPublishDate(days);

  const topPosts = useTopPerformingPosts({ days, limit: 100 });

  const platformBreakdown = usePlatformBreakdown({ startDate, endDate });

  const lastSyncTime = useLastSyncTime();

  // ── Select the active source ──
  const { data, isLoading, isError, error } = useMemo(() => {
    switch (dataSource) {
      case "historical-analytics":
        return {
          data: historicalAnalytics.data,
          isLoading: historicalAnalytics.isLoading,
          isError: historicalAnalytics.isError,
          error: historicalAnalytics.error,
        };
      case "account-growth":
        return {
          data: accountGrowth.data,
          isLoading: accountGrowth.isLoading,
          isError: accountGrowth.isError,
          error: accountGrowth.error,
        };
      case "views-by-publish-date":
        return {
          data: viewsByPublishDate.data,
          isLoading: viewsByPublishDate.isLoading,
          isError: viewsByPublishDate.isError,
          error: viewsByPublishDate.error,
        };
      case "top-posts":
        return {
          data: topPosts.data,
          isLoading: topPosts.isLoading,
          isError: topPosts.isError,
          error: topPosts.error,
        };
      case "platform-breakdown":
        return {
          data: platformBreakdown.data,
          isLoading: platformBreakdown.isLoading,
          isError: platformBreakdown.isError,
          error: platformBreakdown.error,
        };
      case "last-sync-time":
        return {
          data: lastSyncTime.data,
          isLoading: lastSyncTime.isLoading,
          isError: lastSyncTime.isError,
          error: lastSyncTime.error,
        };
      default:
        return { data: undefined, isLoading: false, isError: false, error: null };
    }
  }, [
    dataSource,
    historicalAnalytics.data, historicalAnalytics.isLoading, historicalAnalytics.isError, historicalAnalytics.error,
    accountGrowth.data, accountGrowth.isLoading, accountGrowth.isError, accountGrowth.error,
    viewsByPublishDate.data, viewsByPublishDate.isLoading, viewsByPublishDate.isError, viewsByPublishDate.error,
    topPosts.data, topPosts.isLoading, topPosts.isError, topPosts.error,
    platformBreakdown.data, platformBreakdown.isLoading, platformBreakdown.isError, platformBreakdown.error,
    lastSyncTime.data, lastSyncTime.isLoading, lastSyncTime.isError, lastSyncTime.error,
  ]);

  // ── Compute the metric ──
  const result = useMemo<MetricResult>(() => {
    if (!definition || !data) return emptyResult;
    try {
      return definition.compute(data, { days, platform: options.platform });
    } catch (e) {
      console.error(`[metrics] Error computing "${metricId}":`, e);
      return emptyResult;
    }
  }, [definition, data, days, options.platform, metricId]);

  return {
    definition,
    result,
    isLoading,
    isError,
    error: error as Error | null,
  };
}

/**
 * Fetch multiple metrics at once (shares data sources efficiently).
 *
 * Usage:
 * ```tsx
 * const metrics = useMetrics(["engagement_rate", "virality_score", "views_per_post"]);
 * ```
 */
export function useMetrics(
  metricIds: string[],
  options: UseMetricOptions = {}
): Record<string, UseMetricReturn> {
  // Note: this creates separate hook instances per metric.
  // Since hooks with the same queryKey share cache via React Query,
  // metrics using the same dataSource won't refetch.
  // For a truly optimized version, we'd group by dataSource,
  // but this is clean enough for Phase 1.

  const results: Record<string, UseMetricReturn> = {};

  // We can't call hooks conditionally, so we call useMetric for each ID.
  // This is fine because React Query deduplicates identical queries.
  const m0 = useMetric(metricIds[0] || "__noop__", options);
  const m1 = useMetric(metricIds[1] || "__noop__", options);
  const m2 = useMetric(metricIds[2] || "__noop__", options);
  const m3 = useMetric(metricIds[3] || "__noop__", options);
  const m4 = useMetric(metricIds[4] || "__noop__", options);
  const m5 = useMetric(metricIds[5] || "__noop__", options);

  const all = [m0, m1, m2, m3, m4, m5];

  for (let i = 0; i < metricIds.length && i < 6; i++) {
    results[metricIds[i]] = all[i];
  }

  return results;
}
