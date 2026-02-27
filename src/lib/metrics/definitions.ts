/**
 * Metrics Registry — Metric Definitions
 *
 * Each metric is a declarative config that describes:
 *  - Where to get data (dataSource)
 *  - How to compute it (compute fn)
 *  - How to display it (format, widget, color)
 *
 * To add a new metric: just add an entry here. No component changes needed.
 */

import type { MetricDefinition, MetricResult, MetricDataPoint } from "./types";
import { chartColors } from "@/lib/nivo-theme";

// ─── Helper: period-over-period change ───────────────────────────

function periodChange(series: MetricDataPoint[]): { change: number; previousValue: number } {
  if (series.length < 2) return { change: 0, previousValue: 0 };
  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid);
  const secondHalf = series.slice(mid);
  const firstSum = firstHalf.reduce((a, b) => a + b.value, 0);
  const secondSum = secondHalf.reduce((a, b) => a + b.value, 0);
  if (firstSum === 0) return { change: secondSum > 0 ? 100 : 0, previousValue: 0 };
  return {
    change: ((secondSum - firstSum) / firstSum) * 100,
    previousValue: firstSum,
  };
}

// ─── Metric: Engagement Rate ─────────────────────────────────────

const engagementRate: MetricDefinition = {
  id: "engagement_rate",
  label: "Engagement Rate",
  description: "Average engagement rate across all posts — (likes + comments + shares) / impressions",
  category: "engagement",
  dataSource: "historical-analytics",
  format: "percent",
  defaultWidget: "stat",
  color: chartColors.accent,
  icon: "Heart",
  supportsTimeSeries: true,
  relatedMetrics: ["virality_score", "views_per_post"],
  thresholds: [
    { min: 5, status: "success", label: "Excellent" },
    { min: 2, status: "neutral", label: "Average" },
    { min: 0, status: "warning", label: "Low" },
  ],
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };

    const summary = data as {
      avgEngagementRate: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalImpressions: number;
      dailyMetrics?: Array<{
        date: string;
        likes: number;
        comments: number;
        shares: number;
        impressions: number;
        engagementRate: number;
      }>;
    };

    const series: MetricDataPoint[] = (summary.dailyMetrics || []).map((d) => ({
      date: d.date,
      value: d.engagementRate,
    }));

    const { change, previousValue } = periodChange(series);

    return {
      value: summary.avgEngagementRate || 0,
      previousValue,
      change,
      series,
    };
  },
};

// ─── Metric: Virality Score ──────────────────────────────────────

const viralityScore: MetricDefinition = {
  id: "virality_score",
  label: "Virality Score",
  description: "Ratio of shares to total engagement — higher means content spreads organically",
  category: "performance",
  dataSource: "historical-analytics",
  format: "decimal",
  formatFn: (v) => v.toFixed(2),
  defaultWidget: "stat",
  color: chartColors.accentWarm,
  icon: "Zap",
  supportsTimeSeries: true,
  relatedMetrics: ["engagement_rate"],
  thresholds: [
    { min: 0.3, status: "success", label: "Viral" },
    { min: 0.1, status: "neutral", label: "Moderate" },
    { min: 0, status: "warning", label: "Low spread" },
  ],
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };

    const summary = data as {
      totalShares: number;
      totalLikes: number;
      totalComments: number;
      dailyMetrics?: Array<{
        date: string;
        shares: number;
        likes: number;
        comments: number;
      }>;
    };

    const totalEngagement =
      (summary.totalLikes || 0) +
      (summary.totalComments || 0) +
      (summary.totalShares || 0);

    const value = totalEngagement > 0 ? (summary.totalShares || 0) / totalEngagement : 0;

    const series: MetricDataPoint[] = (summary.dailyMetrics || []).map((d) => {
      const dayEngagement = d.likes + d.comments + d.shares;
      return {
        date: d.date,
        value: dayEngagement > 0 ? d.shares / dayEngagement : 0,
      };
    });

    const { change, previousValue } = periodChange(series);

    return {
      value,
      previousValue,
      change,
      series,
    };
  },
};

// ─── Metric: Views Per Post ──────────────────────────────────────

const viewsPerPost: MetricDefinition = {
  id: "views_per_post",
  label: "Views Per Post",
  description: "Average views each post receives — a measure of content reach efficiency",
  category: "reach",
  dataSource: "historical-analytics",
  format: "compact",
  defaultWidget: "stat",
  color: chartColors.primary,
  icon: "Eye",
  supportsTimeSeries: true,
  relatedMetrics: ["engagement_rate", "total_views"],
  thresholds: [
    { min: 10000, status: "success", label: "High reach" },
    { min: 1000, status: "neutral", label: "Average" },
    { min: 0, status: "warning", label: "Low reach" },
  ],
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };

    const summary = data as {
      totalViews: number;
      totalImpressions: number;
      totalPosts: number;
      dailyMetrics?: Array<{
        date: string;
        views: number;
        impressions: number;
        postCount: number;
      }>;
    };

    // Prefer views; fallback to impressions
    const totalReach =
      (summary.totalViews || 0) > 0 ? summary.totalViews : summary.totalImpressions || 0;
    const posts = summary.totalPosts || 1;
    const value = totalReach / posts;

    const series: MetricDataPoint[] = (summary.dailyMetrics || []).map((d) => {
      const reach = d.views > 0 ? d.views : d.impressions || 0;
      return {
        date: d.date,
        value: d.postCount > 0 ? reach / d.postCount : 0,
      };
    });

    const { change, previousValue } = periodChange(series);

    return {
      value,
      previousValue,
      change,
      series,
    };
  },
};

// ─── Metric: Total Views ─────────────────────────────────────────

const totalViews: MetricDefinition = {
  id: "total_views",
  label: "Total Views",
  description: "Total post views (or impressions) across all platforms",
  category: "reach",
  dataSource: "historical-analytics",
  format: "compact",
  defaultWidget: "area",
  color: chartColors.primary,
  icon: "Eye",
  supportsTimeSeries: true,
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };
    const summary = data as {
      totalViews: number;
      totalImpressions: number;
      dailyMetrics?: Array<{ date: string; views: number; impressions: number }>;
    };

    const value =
      (summary.totalViews || 0) > 0 ? summary.totalViews : summary.totalImpressions || 0;

    const series: MetricDataPoint[] = (summary.dailyMetrics || []).map((d) => ({
      date: d.date,
      value: d.views > 0 ? d.views : d.impressions || 0,
    }));

    const { change, previousValue } = periodChange(series);

    return { value, previousValue, change, series };
  },
};

// ─── Metric: Total Engagement ────────────────────────────────────

const totalEngagement: MetricDefinition = {
  id: "total_engagement",
  label: "Total Engagement",
  description: "Sum of likes, comments, and shares across all posts",
  category: "engagement",
  dataSource: "historical-analytics",
  format: "compact",
  defaultWidget: "area",
  color: chartColors.accentWarm,
  icon: "Heart",
  supportsTimeSeries: true,
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };
    const summary = data as {
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      dailyMetrics?: Array<{ date: string; likes: number; comments: number; shares: number }>;
    };

    const value = (summary.totalLikes || 0) + (summary.totalComments || 0) + (summary.totalShares || 0);

    const series: MetricDataPoint[] = (summary.dailyMetrics || []).map((d) => ({
      date: d.date,
      value: d.likes + d.comments + d.shares,
    }));

    const { change, previousValue } = periodChange(series);

    return { value, previousValue, change, series };
  },
};

// ─── Metric: Follower Count ──────────────────────────────────────

const totalFollowers: MetricDefinition = {
  id: "total_followers",
  label: "Total Followers",
  description: "Combined follower count across all connected platforms",
  category: "audience",
  dataSource: "account-growth",
  format: "compact",
  defaultWidget: "trend",
  color: chartColors.success,
  icon: "Users",
  supportsTimeSeries: false,
  compute: (data): MetricResult => {
    if (!data) return { value: 0 };
    const growth = data as {
      totalFollowers: number;
      followerChange: number;
      changePercent: number;
    };

    return {
      value: growth.totalFollowers || 0,
      change: growth.changePercent || 0,
      previousValue: (growth.totalFollowers || 0) - (growth.followerChange || 0),
    };
  },
};

// ─── Registry ────────────────────────────────────────────────────

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  engagement_rate: engagementRate,
  virality_score: viralityScore,
  views_per_post: viewsPerPost,
  total_views: totalViews,
  total_engagement: totalEngagement,
  total_followers: totalFollowers,
};

/** Get all metrics in a specific category */
export function getMetricsByCategory(category: string): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((m) => m.category === category);
}

/** Get a single metric definition by ID */
export function getMetric(id: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[id];
}

/** List all available metric IDs */
export function listMetricIds(): string[] {
  return Object.keys(METRIC_DEFINITIONS);
}
