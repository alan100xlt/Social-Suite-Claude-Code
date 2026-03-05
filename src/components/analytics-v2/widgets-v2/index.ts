// Premium widget library (widgets-v2)
// Glassmorphism cards, multi-stop gradients, vibrant palettes

// Design foundation
export { ChartCard } from "./ChartCard";
export {
  buildPremiumTheme,
  premiumColors,
  premiumSeriesLight,
  premiumSeriesDark,
  getPremiumSeries,
  makeAreaGradient,
  makeBarGradient,
  getPremiumGradientDefs,
  kpiTypography,
  formatMetric,
  formatTickValue,
} from "./premium-theme";

// Rebuilt widgets (same prop interfaces as v1)
export { StatSparklineWidget } from "./StatSparklineWidget";
export { AreaTrendWidget } from "./AreaTrendWidget";
export { BarComparisonWidget } from "./BarComparisonWidget";
export { DonutKpiWidget } from "./DonutKpiWidget";
export { HeatmapWidget } from "./HeatmapWidget";
export { RadarStrengthWidget } from "./RadarStrengthWidget";

// New chart types
export { TreemapWidget } from "./TreemapWidget";
export { SankeyWidget } from "./SankeyWidget";
export { BulletWidget } from "./BulletWidget";
export { GaugeWidget } from "./GaugeWidget";
export { FunnelWidget } from "./FunnelWidget";
