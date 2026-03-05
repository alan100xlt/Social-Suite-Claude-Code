import type { PartialTheme } from '@nivo/theming';

/**
 * Premium Nivo theme for widgets-v2.
 * Rich multi-stop gradients, vibrant color palettes, refined typography.
 */

// ---- CSS-var helper ----
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    document.body.className.includes('dark-pro') ||
    document.body.className.includes('aurora');
}

// ---- Premium color palettes ----

export const premiumColors = {
  // Core vibrant palette
  deepPurple: 'hsl(262 83% 58%)',
  electricBlue: 'hsl(217 91% 60%)',
  cyan: 'hsl(186 95% 50%)',
  teal: 'hsl(172 66% 50%)',
  emerald: 'hsl(152 69% 47%)',
  coral: 'hsl(12 95% 62%)',
  rose: 'hsl(340 82% 52%)',
  amber: 'hsl(38 92% 50%)',
  violet: 'hsl(280 87% 65%)',
  indigo: 'hsl(234 89% 74%)',

  // Dark mode luminous variants (higher saturation/brightness)
  luminousPurple: 'hsl(262 95% 72%)',
  luminousBlue: 'hsl(217 100% 72%)',
  luminousCyan: 'hsl(186 100% 62%)',
  luminousTeal: 'hsl(172 80% 60%)',
  luminousEmerald: 'hsl(152 82% 58%)',
  luminousCoral: 'hsl(12 100% 72%)',
  luminousRose: 'hsl(340 95% 65%)',
  luminousAmber: 'hsl(38 100% 65%)',

  // Platform colors (consistent with existing)
  linkedin: 'hsl(201 100% 35%)',
  instagram: 'hsl(329 70% 58%)',
  twitter: 'hsl(203 89% 53%)',
  tiktok: 'hsl(349 100% 50%)',
  facebook: 'hsl(221 44% 41%)',
  youtube: 'hsl(0 100% 50%)',

  // Surface colors for dark mode
  darkNavy: 'hsl(222 47% 8%)',
  darkCharcoal: 'hsl(220 20% 12%)',
  darkSurface: 'hsl(220 16% 16%)',
};

/** Series color cycle for light mode */
export const premiumSeriesLight = [
  premiumColors.deepPurple,
  premiumColors.coral,
  premiumColors.teal,
  premiumColors.amber,
  premiumColors.electricBlue,
  premiumColors.rose,
  premiumColors.emerald,
  premiumColors.violet,
];

/** Series color cycle for dark mode — luminous variants */
export const premiumSeriesDark = [
  premiumColors.luminousPurple,
  premiumColors.luminousCoral,
  premiumColors.luminousTeal,
  premiumColors.luminousAmber,
  premiumColors.luminousBlue,
  premiumColors.luminousRose,
  premiumColors.luminousEmerald,
  premiumColors.indigo,
];

/** Get the appropriate series colors for current mode */
export function getPremiumSeries(): string[] {
  return isDarkMode() ? premiumSeriesDark : premiumSeriesLight;
}

// ---- SVG Gradient presets ----

export interface GradientDef {
  id: string;
  type: 'linearGradient';
  colors: { offset: number; color: string; opacity: number }[];
}

/** Multi-stop area gradient with softer fade */
export function makeAreaGradient(id: string, color: string, intensity = 0.35): GradientDef {
  return {
    id,
    type: 'linearGradient',
    colors: [
      { offset: 0, color, opacity: intensity },
      { offset: 40, color, opacity: intensity * 0.6 },
      { offset: 100, color, opacity: 0.01 },
    ],
  };
}

/** Multi-stop bar gradient (bottom-to-top) */
export function makeBarGradient(id: string, color: string): GradientDef {
  return {
    id,
    type: 'linearGradient',
    colors: [
      { offset: 0, color, opacity: 0.95 },
      { offset: 100, color, opacity: 0.65 },
    ],
  };
}

/** Pre-built gradient defs for common series */
export function getPremiumGradientDefs(): GradientDef[] {
  const series = getPremiumSeries();
  return series.map((color, i) => makeAreaGradient(`premGrad_${i}`, color, 0.32));
}

// ---- Premium Nivo Theme ----

export function buildPremiumTheme(): PartialTheme {
  const fg = `hsl(${cssVar('--foreground', '222 47% 11%')})`;
  const muted = `hsl(${cssVar('--muted-foreground', '220 9% 46%')})`;
  const border = `hsl(${cssVar('--border', '220 13% 91%')})`;
  const cardBg = `hsl(${cssVar('--card', '0 0% 100%')})`;
  const dark = isDarkMode();

  return {
    text: {
      fontSize: 12,
      fontFamily: "'Inter', system-ui, sans-serif",
      fill: muted,
    },
    axis: {
      domain: { line: { stroke: 'transparent' } },
      ticks: {
        line: { stroke: 'transparent' },
        text: {
          fontSize: 11,
          fontFamily: "'Inter', system-ui, sans-serif",
          fill: muted,
        },
      },
      legend: {
        text: {
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fill: fg,
        },
      },
    },
    grid: {
      line: {
        stroke: border,
        strokeDasharray: '2 4',
        strokeOpacity: dark ? 0.3 : 0.6,
      },
    },
    crosshair: {
      line: {
        stroke: dark ? 'hsl(220 20% 50%)' : muted,
        strokeWidth: 1,
        strokeOpacity: 0.4,
        strokeDasharray: '4 4',
      },
    },
    tooltip: {
      container: {
        background: dark ? 'hsl(220 16% 16% / 0.95)' : `${cardBg}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: dark ? '1px solid hsl(220 20% 24%)' : '1px solid hsl(220 13% 91%)',
        borderRadius: '0.875rem',
        boxShadow: dark
          ? '0 16px 40px -8px hsl(0 0% 0% / 0.5), 0 4px 16px -4px hsl(0 0% 0% / 0.3)'
          : '0 16px 40px -8px hsl(224 71% 25% / 0.12), 0 4px 16px -4px hsl(220 13% 91% / 0.5)',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '12px 16px',
      } as any,
    },
    legends: {
      text: {
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        fill: muted,
      },
    },
  };
}

// ---- KPI Typography helpers ----

export const kpiTypography = {
  hero: {
    fontSize: '2.5rem',      // 40px
    fontWeight: 800,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
  },
  large: {
    fontSize: '1.75rem',     // 28px
    fontWeight: 700,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  medium: {
    fontSize: '1.25rem',     // 20px
    fontWeight: 700,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    letterSpacing: '-0.015em',
    lineHeight: 1.3,
  },
  label: {
    fontSize: '0.6875rem',   // 11px
    fontWeight: 500,
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
} as const;

/** Format large numbers with K/M suffix */
export function formatMetric(v: string | number): string {
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)}K`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function formatTickValue(v: string | number): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return formatMetric(n);
}
