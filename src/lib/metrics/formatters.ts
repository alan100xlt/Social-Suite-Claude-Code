/**
 * Metrics Registry — Value Formatters
 *
 * Pure functions that format metric values for display.
 * Used by MetricWidget and any component that renders metrics.
 */

import type { MetricFormat, MetricThreshold } from "./types";

/** Format a number according to the metric's format type */
export function formatMetricValue(value: number, format: MetricFormat, customFn?: (v: number) => string): string {
  if (customFn) return customFn(value);

  switch (format) {
    case "number":
      return value.toLocaleString();

    case "compact":
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toLocaleString();

    case "percent":
      return `${value.toFixed(2)}%`;

    case "decimal":
      return value.toFixed(2);

    case "change":
      const sign = value >= 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}%`;

    case "duration":
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;

    case "custom":
    default:
      return value.toString();
  }
}

/** Format a change percentage with sign and color context */
export function formatChange(change: number): {
  text: string;
  type: "positive" | "negative" | "neutral";
} {
  if (Math.abs(change) < 0.05) {
    return { text: "0.0%", type: "neutral" };
  }
  const sign = change >= 0 ? "+" : "";
  return {
    text: `${sign}${change.toFixed(1)}%`,
    type: change >= 0 ? "positive" : "negative",
  };
}

/** Evaluate which threshold a value falls into */
export function evaluateThreshold(
  value: number,
  thresholds?: MetricThreshold[]
): MetricThreshold | null {
  if (!thresholds || thresholds.length === 0) return null;

  // Thresholds are defined from highest to lowest min
  const sorted = [...thresholds].sort((a, b) => b.min - a.min);
  for (const threshold of sorted) {
    if (value >= threshold.min) return threshold;
  }
  return sorted[sorted.length - 1];
}
