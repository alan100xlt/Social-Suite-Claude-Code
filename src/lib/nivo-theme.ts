import type { PartialTheme } from '@nivo/theming';

/**
 * Helper: read a CSS custom property value at runtime so
 * Nivo charts automatically adapt to light / dark mode.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

/** Build a theme that reads current CSS vars (call inside a component render). */
export function buildNivoTheme(): PartialTheme {
  const fg = `hsl(${cssVar('--foreground', '222 47% 11%')})`;
  const muted = `hsl(${cssVar('--muted-foreground', '220 9% 46%')})`;
  const border = `hsl(${cssVar('--border', '220 13% 91%')})`;
  const cardBg = `hsl(${cssVar('--card', '0 0% 100%')})`;

  return {
    text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: muted },
    axis: {
      domain: { line: { stroke: 'transparent' } },
      ticks: {
        line: { stroke: 'transparent' },
        text: { fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fill: muted },
      },
      legend: {
        text: { fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', system-ui, sans-serif", fill: fg },
      },
    },
    grid: { line: { stroke: border, strokeDasharray: '3 3', strokeOpacity: 0.8 } },
    crosshair: { line: { stroke: muted, strokeWidth: 1, strokeOpacity: 0.35, strokeDasharray: '4 4' } },
    tooltip: {
      container: {
        background: cardBg,
        border: 'none',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '10px 14px',
      },
    },
    legends: { text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: muted } },
  };
}

/** V2 variant — slightly larger typography, refined tooltip. */
export function buildNivoThemeV2(): PartialTheme {
  const base = buildNivoTheme();
  const fg = `hsl(${cssVar('--foreground', '222 47% 11%')})`;
  const muted = `hsl(${cssVar('--muted-foreground', '220 9% 46%')})`;
  const cardBg = `hsl(${cssVar('--card', '0 0% 100%')})`;

  return {
    ...base,
    text: { fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", fill: muted },
    axis: {
      ...base.axis,
      ticks: {
        line: { stroke: 'transparent' },
        text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: muted },
      },
      legend: {
        text: { fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', system-ui, sans-serif", fill: fg },
      },
    },
    tooltip: {
      container: {
        background: cardBg,
        border: 'none',
        borderRadius: '0.75rem',
        boxShadow: '0 12px 32px -6px hsl(224 71% 25% / 0.14), 0 4px 12px -4px hsl(220 13% 91% / 0.5)',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '12px 16px',
      },
    },
  };
}

// ---- Static fallback themes (for non-reactive contexts) ----

export const nivoTheme: PartialTheme = {
  text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: 'hsl(220 9% 46%)' },
  axis: {
    domain: { line: { stroke: 'transparent' } },
    ticks: { line: { stroke: 'transparent' }, text: { fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fill: 'hsl(220 9% 46%)' } },
    legend: { text: { fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', system-ui, sans-serif", fill: 'hsl(222 47% 11%)' } },
  },
  grid: { line: { stroke: 'hsl(220 13% 91%)', strokeDasharray: '3 3', strokeOpacity: 0.8 } },
  crosshair: { line: { stroke: 'hsl(224 71% 25%)', strokeWidth: 1, strokeOpacity: 0.35, strokeDasharray: '4 4' } },
  tooltip: {
    container: {
      background: 'hsl(0 0% 100%)', border: 'none', borderRadius: '0.75rem',
      boxShadow: '0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)',
      fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", padding: '10px 14px',
    },
  },
  legends: { text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: 'hsl(220 9% 46%)' } },
};

export const nivoThemeV2: PartialTheme = {
  ...nivoTheme,
  text: { fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", fill: 'hsl(220 9% 46%)' },
  axis: {
    ...nivoTheme.axis,
    ticks: { line: { stroke: 'transparent' }, text: { fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", fill: 'hsl(220 9% 56%)' } },
    legend: { text: { fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', system-ui, sans-serif", fill: 'hsl(222 47% 11%)' } },
  },
  tooltip: {
    container: {
      background: 'hsl(0 0% 100%)', border: 'none', borderRadius: '0.75rem',
      boxShadow: '0 12px 32px -6px hsl(224 71% 25% / 0.14), 0 4px 12px -4px hsl(220 13% 91% / 0.5)',
      fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", padding: '12px 16px',
    },
  },
};

/** Consistent colour palette for chart series */
export const chartColors = {
  primary: 'hsl(224 71% 25%)',
  primaryLight: 'hsl(224 71% 35%)',
  accent: 'hsl(12 95% 62%)',
  accentWarm: 'hsl(330 80% 55%)',
  success: 'hsl(142 71% 45%)',
  warning: 'hsl(38 92% 50%)',
  linkedin: 'hsl(201 100% 35%)',
  instagram: 'hsl(329 70% 58%)',
  twitter: 'hsl(203 89% 53%)',
  tiktok: 'hsl(349 100% 50%)',
  facebook: 'hsl(221 44% 41%)',
};

export const seriesColors = [
  chartColors.primary, chartColors.accent, chartColors.success, chartColors.warning, chartColors.linkedin,
];

export const chartGradientDefs = [
  { id: 'gradientPrimary', type: 'linearGradient' as const, colors: [{ offset: 0, color: chartColors.primary, opacity: 0.35 }, { offset: 100, color: chartColors.primary, opacity: 0.02 }] },
  { id: 'gradientAccent', type: 'linearGradient' as const, colors: [{ offset: 0, color: chartColors.accent, opacity: 0.30 }, { offset: 100, color: chartColors.accent, opacity: 0.02 }] },
  { id: 'gradientSuccess', type: 'linearGradient' as const, colors: [{ offset: 0, color: chartColors.success, opacity: 0.30 }, { offset: 100, color: chartColors.success, opacity: 0.02 }] },
];

export const chartFillRules = [
  { match: { id: 'Views' }, id: 'gradientPrimary' },
  { match: { id: 'Likes' }, id: 'gradientAccent' },
  { match: { id: 'Engagement' }, id: 'gradientSuccess' },
];
