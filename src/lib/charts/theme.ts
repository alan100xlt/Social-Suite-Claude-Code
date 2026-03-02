import type { PartialTheme } from '@nivo/theming';
import type { ChartPresetId, ChartThemePreset } from './types';
import { brandPreset } from './presets/brand';
import { figmaKitPreset } from './presets/figma-kit';

const presetMap: Record<string, ChartThemePreset> = {
  brand: brandPreset,
  'figma-kit': figmaKitPreset,
};

/** Register a custom preset at runtime */
export function registerChartPreset(preset: ChartThemePreset): void {
  presetMap[preset.id] = preset;
}

/** Get a preset by ID (defaults to 'brand') */
export function getChartPreset(id?: ChartPresetId): ChartThemePreset {
  return presetMap[id ?? 'brand'] ?? brandPreset;
}

/**
 * Read a CSS custom property from :root.
 * SSR-safe: returns fallback when window is undefined.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

/**
 * Build a Nivo PartialTheme from CSS custom properties + a preset overlay.
 *
 * IMPORTANT: Call inside useMemo with the app theme variant as dependency:
 *   const { currentTheme } = useTheme();
 *   const theme = useMemo(() => createChartTheme('brand'), [currentTheme]);
 */
export function createChartTheme(presetId?: ChartPresetId): PartialTheme {
  const preset = getChartPreset(presetId);
  const fg = `hsl(${cssVar('--foreground', '222 47% 11%')})`;
  const muted = `hsl(${cssVar('--muted-foreground', '220 9% 46%')})`;
  const border = `hsl(${cssVar('--border', '220 13% 91%')})`;
  const cardBg = `hsl(${cssVar('--card', '0 0% 100%')})`;

  return {
    text: { fontSize: 12, fontFamily: preset.fonts.body, fill: muted },
    axis: {
      domain: { line: { stroke: 'transparent' } },
      ticks: {
        line: { stroke: 'transparent' },
        text: { fontSize: 11, fontFamily: preset.fonts.body, fill: muted },
      },
      legend: {
        text: { fontSize: 13, fontWeight: 600, fontFamily: preset.fonts.heading, fill: fg },
      },
    },
    grid: { line: { stroke: border, strokeDasharray: '3 3', strokeOpacity: 0.8 } },
    crosshair: { line: { stroke: muted, strokeWidth: 1, strokeOpacity: 0.35, strokeDasharray: '4 4' } },
    tooltip: {
      container: {
        background: cardBg,
        border: 'none',
        borderRadius: preset.card.borderRadius,
        boxShadow: preset.card.shadow,
        fontSize: 13,
        fontFamily: preset.fonts.body,
        padding: '12px 16px',
      },
    },
    legends: { text: { fontSize: 12, fontFamily: preset.fonts.body, fill: muted } },
  };
}
