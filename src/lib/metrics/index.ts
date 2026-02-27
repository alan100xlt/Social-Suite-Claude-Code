// Metrics Registry — Public API
export type {
  MetricDefinition,
  MetricResult,
  MetricDataPoint,
  MetricBreakdownItem,
  MetricFormat,
  MetricCategory,
  MetricThreshold,
  WidgetConfig,
  WidgetType,
  DataSourceId,
  DataSourceParams,
} from "./types";

export { METRIC_CATEGORIES } from "./types";

export {
  METRIC_DEFINITIONS,
  getMetric,
  getMetricsByCategory,
  listMetricIds,
} from "./definitions";

export {
  formatMetricValue,
  formatChange,
  evaluateThreshold,
} from "./formatters";
