import type { TemplateInput } from '../types.ts';

/** Category-coded color overrides for media companies */
const CATEGORY_COLORS: Record<string, string> = {
  BREAKING: '#DC2626',
  OPINION: '#7C3AED',
  ANALYSIS: '#2563EB',
  TECH: '#059669',
  LIFESTYLE: '#D97706',
  SPORTS: '#EA580C',
};

const DEFAULT_BRAND_COLOR = '#3B82F6';

/**
 * Resolve color tokens like 'brandColor', 'brandColorSecondary', 'category-coded'
 * into actual hex values from the input.
 */
export function resolveColor(value: string | undefined, input: TemplateInput): string {
  if (!value) return DEFAULT_BRAND_COLOR;
  if (value === 'brandColor') return input.brandColor || DEFAULT_BRAND_COLOR;
  if (value === 'brandColorSecondary') return input.brandColorSecondary || input.brandColor || DEFAULT_BRAND_COLOR;
  if (value === 'category-coded') {
    return (input.categoryTag && CATEGORY_COLORS[input.categoryTag.toUpperCase()])
      || input.brandColor || DEFAULT_BRAND_COLOR;
  }
  return value; // literal hex/rgba
}

/**
 * Resolve all color tokens in a style object.
 * Scans known color properties and replaces tokens.
 */
export function resolveColors<T extends Record<string, unknown>>(style: T, input: TemplateInput): T {
  const result = { ...style };
  for (const key of ['color', 'backgroundColor', 'borderColor'] as const) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = resolveColor(result[key] as string, input);
    }
  }
  return result;
}
