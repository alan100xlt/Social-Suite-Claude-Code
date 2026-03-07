# OG Config-Driven Template System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 27 individual OG template .tsx files with 8 archetype renderers + 100 JSON config objects, with company-configurable visibility layers, logo support, and deep brand color integration.

**Architecture:** Option C — typed archetype renderers (`fullbleed`, `split-lr`, `split-tb`, `centered`, `text-forward`, `card`, `banner`, `special`) each accept a JSON config object. A single `renderTemplate()` dispatcher routes to the correct archetype. Company settings control which content layers (title, author, date, logo, etc.) are visible.

**Tech Stack:** Satori + resvg-wasm (Deno edge function), React 18 JSX, Supabase Postgres + RLS, TanStack Query, Shadcn UI

**Design doc:** `docs/plans/2026-03-06-og-template-config-driven-design.md`

---

## Phase 1: Types + Config Schema + Brand Color Resolver

### Task 1: Define TypeScript types for config-driven templates

**Files:**
- Modify: `supabase/functions/og-image-generator/templates/types.ts`

**Step 1: Replace the existing types file with the full config schema**

Replace the entire contents of `types.ts` with:

```typescript
/** Input data passed to every OG template renderer */
export interface TemplateInput {
  title: string;
  description?: string;
  author?: string;
  imageBase64?: string;
  sourceName?: string;
  publishedAt?: string;
  brandColor?: string;
  brandColorSecondary?: string;
  logoBase64?: string;
  logoDarkBase64?: string;
  categoryTag?: string;
  stats?: Array<{ label: string; value: string; change?: string }>;
  visibility: OgVisibilitySettings;
  fontOverride?: OgFontOverride;
}

export interface OgFontOverride {
  fontFamily: 'sans' | 'serif' | 'mono';
  fontFamilyTitle?: 'sans' | 'serif' | 'mono';
}

export interface OgVisibilitySettings {
  showTitle: boolean;
  showDescription: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showLogo: boolean;
  showCategoryTag: boolean;
  showSourceName: boolean;
}

export const DEFAULT_VISIBILITY: OgVisibilitySettings = {
  showTitle: true,
  showDescription: true,
  showAuthor: false,
  showDate: false,
  showLogo: true,
  showCategoryTag: false,
  showSourceName: true,
};

export type LayoutArchetype =
  | 'fullbleed' | 'split-lr' | 'split-tb' | 'centered'
  | 'text-forward' | 'card' | 'banner' | 'special';

export type OverlayType =
  | 'dark-gradient-bottom' | 'dark-gradient-top' | 'dark-gradient-radial'
  | 'solid-dim' | 'brand-duotone' | 'brand-tint' | 'vignette' | 'blur';

export type ImagePosition =
  | 'fullbleed' | 'left-panel' | 'right-panel'
  | 'top-panel' | 'bottom-panel' | 'framed';

export type LogoPosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-top';

export type BrandColorSlot =
  | 'background' | 'gradient-start' | 'gradient-end' | 'overlay'
  | 'accent-bar' | 'accent-dot' | 'badge-bg' | 'source-text'
  | 'stat-number' | 'quote-mark' | 'highlight-bg' | 'divider'
  | 'card-border' | 'banner-bg' | 'category-badge';

export type SourceNameStyle =
  | 'badge' | 'uppercase-label' | 'subtle-text'
  | 'monospace-path' | 'inline-banner' | 'none';

export interface TemplateConfig {
  id: string;
  name: string;
  category: 'photo' | 'gradient' | 'news' | 'stats' | 'editorial' | 'brand';
  tags: string[];
  requiresImage: boolean;

  layout: {
    archetype: LayoutArchetype;
    splitRatio?: [number, number];
    padding: number | [number, number, number, number];
    theme: 'dark' | 'light';
  };

  background: {
    type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image-fullbleed';
    colors: string[];
    gradientAngle?: number;
  };

  image?: {
    position: ImagePosition;
    panelPercent?: number;
    overlay?: { type: OverlayType; opacity?: number };
    filter?: string;
    borderRadius?: number;
    edgeBlend?: { side: 'left' | 'right' | 'top' | 'bottom'; width: number };
  };

  title: {
    fontSize: number;
    fontWeight: number;
    fontFamily?: 'sans' | 'serif' | 'mono';
    color: string;
    alignment: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    lineHeight: number;
    maxLines: number;
    textShadow?: string;
    treatment?: 'plain' | 'highlight-segments' | 'gradient-text';
  };

  description?: {
    fontSize: number;
    fontWeight: number;
    color: string;
    lineHeight: number;
    maxLines: number;
    marginTop: number;
  };

  sourceName: {
    style: SourceNameStyle;
    position: 'above-title' | 'below-title' | 'top-left' | 'top-right' | 'bottom-bar';
    fontSize: number;
    fontWeight: number;
    color: string;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
    badgeBg?: string;
  };

  author?: {
    position: 'below-title' | 'above-title' | 'bottom-left' | 'bottom-right' | 'below-description';
    fontSize: number;
    fontWeight: number;
    color: string;
    prefix?: string;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
  };

  date?: {
    position: 'below-title' | 'below-author' | 'top-right' | 'bottom-bar' | 'inline-with-author';
    fontSize: number;
    fontWeight: number;
    color: string;
    format: 'relative' | 'short' | 'long' | 'calendar-block';
  };

  categoryTag?: {
    position: 'above-title' | 'top-left' | 'top-right' | 'inline-banner';
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: string;
    textTransform?: 'uppercase' | 'none';
  };

  logo: {
    position: LogoPosition;
    maxHeight: number;
    margin: number;
    background?: 'none' | 'white-pill' | 'dark-pill' | 'frosted';
  };

  brandColorSlots: BrandColorSlot[];

  decorations: Array<{
    type: string;
    position: string;
    width?: number;
    height?: number;
    color?: string;
    borderRadius?: number;
    opacity?: number;
    gradient?: string;
    boxShadow?: string;
    condition?: string;
  }>;

  card?: {
    backgroundColor: string;
    borderRadius: number;
    border?: string;
    padding: number;
    gradientBorder?: { colors: string[]; angle: number; width: number };
    backdropFilter?: string;
    maxWidth?: number;
  };

  staticLabels?: Array<{
    text: string;
    position: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor?: string;
    textTransform?: 'uppercase' | 'none';
  }>;

  behavior?: {
    detectBreaking?: boolean;
    showDate?: boolean;
    monospaceMeta?: boolean;
    categoryColorCoded?: boolean;
  };
}

/** Legacy render-function-based config — DEPRECATED, use TemplateConfig */
export interface LegacyTemplateConfig {
  id: string;
  name: string;
  category: TemplateConfig['category'];
  requiresImage: boolean;
  render: (input: TemplateInput) => any;
}
```

**Step 2: Verify**
Run: `cd supabase/functions && deno check og-image-generator/templates/types.ts`
Expected: no errors (standalone type file)

**Step 3: Commit**
`git add supabase/functions/og-image-generator/templates/types.ts && git commit -m "feat(og): define config-driven template schema types (SOC-OG-1)"`

---

### Task 2: Create brand color resolver

**Files:**
- Create: `supabase/functions/og-image-generator/templates/shared/brand-color.ts`

**Step 1: Write the brand color resolver**

```typescript
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
```

**Step 2: Commit**
`git add supabase/functions/og-image-generator/templates/shared/brand-color.ts && git commit -m "feat(og): add brand color resolver with category-coded colors (SOC-OG-2)"`

---

## Phase 2: Shared Sub-Renderers

### Task 3: Create shared title renderer

**Files:**
- Create: `supabase/functions/og-image-generator/templates/shared/title.tsx`

**Step 1: Write the title renderer**

This renders the title with configurable font, alignment, max-lines (via maxHeight), text shadow, and highlight-segments treatment. Check `input.visibility.showTitle` before rendering.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

/** Build alternating highlighted/plain word segments (for quote-highlight) */
function buildHighlightSegments(text: string, highlightColor: string): any[] {
  const words = text.split(' ');
  const segments: Array<{ text: string; highlight: boolean }> = [];
  let i = 0;
  while (i < words.length) {
    const chunkSize = 2 + Math.floor(Math.random() * 3);
    const chunk = words.slice(i, i + chunkSize).join(' ');
    segments.push({ text: chunk, highlight: segments.length % 2 === 0 });
    i += chunkSize;
  }
  return segments.map((seg, idx) => (
    <span
      key={idx}
      style={{
        display: 'inline',
        backgroundColor: seg.highlight ? highlightColor : 'transparent',
        padding: seg.highlight ? '4px 8px' : '0',
        borderRadius: seg.highlight ? 4 : 0,
      }}
    >
      {seg.text}{' '}
    </span>
  ));
}

export function renderTitle(config: TemplateConfig['title'], input: TemplateInput, brandHighlightColor?: string): any {
  if (!input.visibility.showTitle) return null;

  const color = resolveColor(config.color, input);
  const maxHeight = Math.round(config.fontSize * config.lineHeight * config.maxLines);

  if (config.treatment === 'highlight-segments' && brandHighlightColor) {
    const hlColor = resolveColor(brandHighlightColor, input);
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        color,
        lineHeight: config.lineHeight,
        textAlign: config.alignment,
        maxHeight,
        overflow: 'hidden',
      }}>
        {buildHighlightSegments(input.title, hlColor)}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      textAlign: config.alignment,
      lineHeight: config.lineHeight,
      maxHeight,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textShadow: config.textShadow || 'none',
    }}>
      {input.title}
    </div>
  );
}
```

**Step 2: Commit**
`git add supabase/functions/og-image-generator/templates/shared/title.tsx && git commit -m "feat(og): add shared title renderer with highlight-segments (SOC-OG-3)"`

---

### Task 4: Create shared logo renderer

**Files:**
- Create: `supabase/functions/og-image-generator/templates/shared/logo.tsx`

**Step 1: Write the logo renderer**

Renders the publisher logo at the configured position. Uses `layout.theme` to pick light vs dark logo variant. Supports pill backgrounds for busy image backgrounds. Checks `input.visibility.showLogo`.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';

const POSITION_STYLES: Record<string, Record<string, unknown>> = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  'center-top': { top: 0, left: '50%', transform: 'translateX(-50%)' },
};

const BG_STYLES: Record<string, Record<string, unknown>> = {
  'none': {},
  'white-pill': { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '6px 12px' },
  'dark-pill': { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '6px 12px' },
  'frosted': { backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '6px 12px' },
};

export function renderLogo(
  logoConfig: TemplateConfig['logo'],
  layoutTheme: 'dark' | 'light',
  input: TemplateInput
): any {
  if (!input.visibility.showLogo) return null;

  const logoSrc = layoutTheme === 'dark' ? input.logoBase64 : input.logoDarkBase64;
  if (!logoSrc) return null;

  const pos = POSITION_STYLES[logoConfig.position] || POSITION_STYLES['bottom-left'];
  const bg = BG_STYLES[logoConfig.background || 'none'] || {};
  const margin = logoConfig.margin;

  return (
    <div style={{
      display: 'flex',
      position: 'absolute',
      ...Object.fromEntries(
        Object.entries(pos).map(([k, v]) => [k, typeof v === 'number' ? v + margin : v])
      ),
      ...bg,
      zIndex: 10,
    }}>
      <img
        src={logoSrc}
        style={{ height: logoConfig.maxHeight, objectFit: 'contain' }}
      />
    </div>
  );
}
```

**Step 2: Commit**
`git add supabase/functions/og-image-generator/templates/shared/logo.tsx && git commit -m "feat(og): add shared logo renderer with contrast backgrounds (SOC-OG-4)"`

---

### Task 5: Create shared source-name, author, date, categoryTag, description, and decoration renderers

**Files:**
- Create: `supabase/functions/og-image-generator/templates/shared/source-name.tsx`
- Create: `supabase/functions/og-image-generator/templates/shared/meta-layers.tsx`
- Create: `supabase/functions/og-image-generator/templates/shared/decorations.tsx`

**Step 1: Write source-name renderer** (`source-name.tsx`)

Renders source name in the configured style (badge, uppercase label, subtle text, monospace path). Checks `input.visibility.showSourceName`.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

export function renderSourceName(config: TemplateConfig['sourceName'], input: TemplateInput): any {
  if (!input.visibility.showSourceName || !input.sourceName || config.style === 'none') return null;

  const color = resolveColor(config.color, input);

  if (config.style === 'badge') {
    const bg = resolveColor(config.badgeBg || 'brandColor', input);
    return (
      <div style={{
        display: 'flex',
        backgroundColor: bg,
        color: '#ffffff',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        padding: '8px 20px',
        borderRadius: 8,
        letterSpacing: config.letterSpacing || 0,
        textTransform: config.textTransform || 'none',
      }}>
        {input.sourceName}
      </div>
    );
  }

  if (config.style === 'monospace-path') {
    return (
      <div style={{
        display: 'flex',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        color,
        fontFamily: 'monospace',
        letterSpacing: config.letterSpacing || 0,
      }}>
        ~/{input.sourceName}
      </div>
    );
  }

  // uppercase-label, subtle-text, inline-banner
  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      letterSpacing: config.letterSpacing || 0,
      textTransform: config.textTransform || 'none',
    }}>
      {input.sourceName}
    </div>
  );
}
```

**Step 2: Write meta-layers renderer** (`meta-layers.tsx`)

Renders author, date, and categoryTag layers. Each checks its visibility flag.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

function formatDate(iso: string, format: 'relative' | 'short' | 'long' | 'calendar-block'): string {
  const d = new Date(iso);
  if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (format === 'long') return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  // 'relative' — approximate
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function renderAuthor(config: TemplateConfig['author'], input: TemplateInput): any {
  if (!config || !input.visibility.showAuthor || !input.author) return null;
  const color = resolveColor(config.color, input);
  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      letterSpacing: config.letterSpacing || 0,
      textTransform: config.textTransform || 'none',
    }}>
      {config.prefix || ''}{input.author}
    </div>
  );
}

export function renderDate(config: TemplateConfig['date'], input: TemplateInput): any {
  if (!config || !input.visibility.showDate || !input.publishedAt) return null;
  const color = resolveColor(config.color, input);
  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
    }}>
      {formatDate(input.publishedAt, config.format)}
    </div>
  );
}

export function renderCategoryTag(config: TemplateConfig['categoryTag'], input: TemplateInput): any {
  if (!config || !input.visibility.showCategoryTag || !input.categoryTag) return null;
  const color = resolveColor(config.color, input);
  const bg = config.backgroundColor ? resolveColor(config.backgroundColor, input) : undefined;
  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      backgroundColor: bg,
      borderRadius: config.borderRadius || 0,
      padding: config.padding || '0',
      textTransform: config.textTransform || 'none',
    }}>
      {input.categoryTag}
    </div>
  );
}
```

**Step 3: Write decorations renderer** (`decorations.tsx`)

Renders accent bars, dividers, dots, circles, quote marks, and other decorative elements from the config array.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

function shouldRender(condition: string | undefined, input: TemplateInput): boolean {
  if (!condition) return true;
  if (condition === 'no-description') return !input.description;
  if (condition === 'has-category') return !!input.categoryTag;
  if (condition === 'has-image') return !!input.imageBase64;
  return true;
}

export function renderDecorations(
  decorations: TemplateConfig['decorations'],
  input: TemplateInput
): any[] {
  return decorations
    .filter(d => shouldRender(d.condition, input))
    .map((d, i) => {
      const color = d.color ? resolveColor(d.color, input) : undefined;
      const style: Record<string, unknown> = {
        display: 'flex',
        position: 'absolute' as const,
        width: d.width,
        height: d.height,
        backgroundColor: color,
        borderRadius: d.borderRadius,
        opacity: d.opacity,
        boxShadow: d.boxShadow,
      };

      // Map position string to CSS
      if (d.position === 'top') Object.assign(style, { top: 0, left: 0, right: 0 });
      if (d.position === 'bottom') Object.assign(style, { bottom: 0, left: 0, right: 0 });
      if (d.position === 'left') Object.assign(style, { top: 0, left: 0, bottom: 0 });
      if (d.position === 'right') Object.assign(style, { top: 0, right: 0, bottom: 0 });
      if (d.position === 'top-left') Object.assign(style, { top: 0, left: 0 });
      if (d.position === 'top-right') Object.assign(style, { top: 0, right: 0 });
      if (d.position === 'bottom-left') Object.assign(style, { bottom: 0, left: 0 });
      if (d.position === 'bottom-right') Object.assign(style, { bottom: 0, right: 0 });

      if (d.gradient) {
        const resolvedGradient = d.gradient.replace(/brandColor/g, resolveColor('brandColor', input));
        style.backgroundImage = resolvedGradient;
      }

      return <div key={i} style={style} />;
    });
}
```

**Step 4: Commit**
`git add supabase/functions/og-image-generator/templates/shared/ && git commit -m "feat(og): add shared sub-renderers (source-name, meta-layers, decorations) (SOC-OG-5)"`

---

## Phase 3: Archetype Renderers

### Task 6: Create the fullbleed archetype renderer

**Files:**
- Create: `supabase/functions/og-image-generator/templates/archetypes/fullbleed.tsx`

**Step 1: Write the fullbleed renderer**

The fullbleed archetype: image fills the entire 1200x630 canvas, overlay on top, text content at the bottom or center, logo in a corner. This is the workhorse archetype covering ~25 templates.

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

function buildOverlay(overlay: NonNullable<TemplateConfig['image']>['overlay'], input: TemplateInput): Record<string, unknown> {
  if (!overlay) return {};
  const opacity = overlay.opacity ?? 0.7;

  switch (overlay.type) {
    case 'dark-gradient-bottom':
      return { background: `linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,${opacity}) 100%)` };
    case 'dark-gradient-top':
      return { background: `linear-gradient(to top, rgba(0,0,0,0) 30%, rgba(0,0,0,${opacity}) 100%)` };
    case 'dark-gradient-radial':
      return { background: `radial-gradient(circle at center, rgba(0,0,0,0) 20%, rgba(0,0,0,${opacity}) 100%)` };
    case 'solid-dim':
      return { backgroundColor: `rgba(0,0,0,${opacity})` };
    case 'brand-duotone': {
      const brand = resolveColor('brandColor', input);
      return { backgroundColor: brand, opacity, mixBlendMode: 'multiply' };
    }
    case 'brand-tint': {
      const brand = resolveColor('brandColor', input);
      return { backgroundColor: brand, opacity: opacity * 0.4 };
    }
    case 'vignette':
      return { background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${opacity}) 100%)` };
    default:
      return {};
  }
}

export function renderFullbleed(config: TemplateConfig, input: TemplateInput): any {
  const pad = typeof config.layout.padding === 'number'
    ? config.layout.padding
    : config.layout.padding[0]; // use top padding as uniform for simplicity
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  const overlayStyle = config.image?.overlay ? buildOverlay(config.image.overlay, input) : {};
  const imgFilter = config.image?.filter || undefined;
  const vertJustify = config.title.verticalAlign === 'bottom' ? 'flex-end'
    : config.title.verticalAlign === 'center' ? 'center' : 'flex-start';

  return (
    <div style={{ display: 'flex', width: 1200, height: 630, position: 'relative' }}>
      {/* Background image */}
      {input.imageBase64 && (
        <img
          src={input.imageBase64}
          style={{
            width: 1200, height: 630, objectFit: 'cover',
            position: 'absolute', top: 0, left: 0,
            filter: imgFilter,
          }}
        />
      )}

      {/* Overlay */}
      <div style={{
        display: 'flex', position: 'absolute', top: 0, left: 0,
        width: 1200, height: 630, ...overlayStyle,
      }} />

      {/* Content */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: vertJustify,
        width: 1200, height: 630, position: 'relative',
        padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
      }}>
        {/* Category tag (if position is above-title or top-left) */}
        {renderCategoryTag(config.categoryTag, input)}

        {/* Source name (if position is above-title) */}
        {config.sourceName.position === 'above-title' && renderSourceName(config.sourceName, input)}

        {/* Title */}
        {renderTitle(config.title, input)}

        {/* Description */}
        {input.visibility.showDescription && input.description && config.description && (
          <div style={{
            display: 'flex',
            fontSize: config.description.fontSize,
            fontWeight: config.description.fontWeight,
            color: resolveColor(config.description.color, input),
            lineHeight: config.description.lineHeight,
            maxHeight: config.description.maxLines * config.description.fontSize * config.description.lineHeight,
            overflow: 'hidden',
            marginTop: config.description.marginTop,
          }}>
            {input.description}
          </div>
        )}

        {/* Author + Date */}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}

        {/* Source name (if position is below-title) */}
        {config.sourceName.position === 'below-title' && renderSourceName(config.sourceName, input)}
      </div>

      {/* Source name badge (absolute positioned) */}
      {(config.sourceName.position === 'top-left' || config.sourceName.position === 'top-right') && (
        <div style={{
          display: 'flex', position: 'absolute',
          ...(config.sourceName.position === 'top-left' ? { top: 32, left: 32 } : { top: 32, right: 32 }),
        }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Decorations */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
```

**Step 2: Commit**
`git add supabase/functions/og-image-generator/templates/archetypes/fullbleed.tsx && git commit -m "feat(og): add fullbleed archetype renderer (SOC-OG-6)"`

---

### Task 7: Create remaining 7 archetype renderers

**Files:**
- Create: `supabase/functions/og-image-generator/templates/archetypes/split-lr.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/split-tb.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/centered.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/text-forward.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/card.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/banner.tsx`
- Create: `supabase/functions/og-image-generator/templates/archetypes/special.tsx`

Each follows the same pattern as fullbleed: accept `(config: TemplateConfig, input: TemplateInput)`, compose Satori JSX from config values, call shared sub-renderers for title/logo/source/meta/decorations.

**Key per-archetype details:**

**split-lr.tsx** — Two panels side by side. `config.layout.splitRatio` determines widths (e.g. `[50, 50]`). Image panel on one side, text on the other. Optional `edgeBlend` gradient where panels meet. Accent bar between panels if in decorations.

**split-tb.tsx** — Two panels stacked. `config.layout.splitRatio` determines heights. Image panel top or bottom, text in the other. Optional framed image with `borderRadius`.

**centered.tsx** — All content centered. Optional image background (same as fullbleed but content is centered not bottom-aligned). Decorative shapes around edges.

**text-forward.tsx** — Left-aligned text stack with generous padding. No image or subtle image. Accent bars at top/bottom/left edges. Most minimal archetype.

**card.tsx** — Background (gradient or image) with a centered card. Card can have `backdropFilter: 'blur(20px)'` for frosted glass, or `gradientBorder` for startup-style borders. Content rendered inside the card.

**banner.tsx** — Three zones: top banner bar (configurable height, color), main content area (title + meta), bottom bar (ticker, live indicator). `staticLabels` rendered in banner/bottom zones.

**special.tsx** — Switch on `config.id` prefix for specialized layouts:
  - `calendar-*` → date-block layout (parsed month/day/year block on left, text on right)
  - `terminal-*` → bracket-text layout (terminal dots, curly brackets flanking title, grid bg)
  - Default → falls back to centered layout

Write each renderer following the fullbleed pattern. Each is ~50-70 lines. Use the shared sub-renderers. Import `resolveColor` for any color token.

**Step 2: Commit after each renderer, or batch commit all 7:**
`git add supabase/functions/og-image-generator/templates/archetypes/ && git commit -m "feat(og): add 7 remaining archetype renderers (SOC-OG-7)"`

---

### Task 8: Create the template renderer dispatcher

**Files:**
- Create: `supabase/functions/og-image-generator/templates/renderer.ts`

**Step 1: Write the dispatcher**

```typescript
/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';
import { renderFullbleed } from './archetypes/fullbleed.tsx';
import { renderSplitLR } from './archetypes/split-lr.tsx';
import { renderSplitTB } from './archetypes/split-tb.tsx';
import { renderCentered } from './archetypes/centered.tsx';
import { renderTextForward } from './archetypes/text-forward.tsx';
import { renderCard } from './archetypes/card.tsx';
import { renderBanner } from './archetypes/banner.tsx';
import { renderSpecial } from './archetypes/special.tsx';

const ARCHETYPE_RENDERERS: Record<string, (config: TemplateConfig, input: TemplateInput) => any> = {
  'fullbleed': renderFullbleed,
  'split-lr': renderSplitLR,
  'split-tb': renderSplitTB,
  'centered': renderCentered,
  'text-forward': renderTextForward,
  'card': renderCard,
  'banner': renderBanner,
  'special': renderSpecial,
};

export function renderFromConfig(config: TemplateConfig, input: TemplateInput): any {
  const renderer = ARCHETYPE_RENDERERS[config.layout.archetype];
  if (!renderer) {
    throw new Error(`Unknown archetype: ${config.layout.archetype}`);
  }
  return renderer(config, input);
}
```

**Step 2: Commit**
`git add supabase/functions/og-image-generator/templates/renderer.ts && git commit -m "feat(og): add template renderer dispatcher (SOC-OG-8)"`

---

## Phase 4: Convert Existing 27 Templates to JSON Configs

### Task 9: Convert all 27 existing templates to JSON config objects

**Files:**
- Create: `supabase/functions/og-image-generator/templates/configs/photo/` (7 files)
- Create: `supabase/functions/og-image-generator/templates/configs/gradient/` (6 files)
- Create: `supabase/functions/og-image-generator/templates/configs/news/` (3 files)
- Create: `supabase/functions/og-image-generator/templates/configs/stats/` (3 files)
- Create: `supabase/functions/og-image-generator/templates/configs/editorial/` (4 files)
- Create: `supabase/functions/og-image-generator/templates/configs/brand/` (4 files)

Each config is a `.ts` file that exports a `TemplateConfig` object. Example for `photo-hero`:

**File:** `configs/photo/photo-hero.ts`
```typescript
import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-hero',
  name: 'Photo Hero',
  category: 'photo',
  tags: ['dark', 'bold', 'overlay'],
  requiresImage: true,
  layout: { archetype: 'fullbleed', padding: 60, theme: 'dark' },
  background: { type: 'image-fullbleed', colors: [] },
  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.85 },
  },
  title: {
    fontSize: 52, fontWeight: 700, color: '#ffffff',
    alignment: 'left', verticalAlign: 'bottom',
    lineHeight: 1.2, maxLines: 3,
    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },
  sourceName: {
    style: 'badge', position: 'top-left',
    fontSize: 18, fontWeight: 700, color: '#ffffff',
    badgeBg: 'brandColor',
  },
  author: {
    position: 'below-title', fontSize: 20, fontWeight: 400,
    color: 'rgba(255,255,255,0.7)', prefix: 'By ',
  },
  date: {
    position: 'below-author', fontSize: 16, fontWeight: 400,
    color: 'rgba(255,255,255,0.5)', format: 'short',
  },
  categoryTag: {
    position: 'above-title', fontSize: 14, fontWeight: 700,
    color: '#ffffff', backgroundColor: 'category-coded',
    borderRadius: 4, padding: '4px 12px', textTransform: 'uppercase',
  },
  logo: { position: 'top-right', maxHeight: 32, margin: 32, background: 'frosted' },
  brandColorSlots: ['badge-bg', 'category-badge'],
  decorations: [],
};

export default config;
```

Convert all 27 templates following the same pattern. Reference the original .tsx files for exact font sizes, colors, positions, and decorative elements. Every config MUST include `author`, `date`, `categoryTag`, and `logo` blocks (with sensible defaults for the archetype) even though visibility settings may hide them.

**Step 2: Verify all configs export valid TemplateConfig by importing them in a test file.**

**Step 3: Commit per category or batch:**
`git add supabase/functions/og-image-generator/templates/configs/ && git commit -m "feat(og): convert 27 existing templates to JSON configs (SOC-OG-9)"`

---

### Task 10: Update the registry to load configs instead of legacy templates

**Files:**
- Modify: `supabase/functions/og-image-generator/templates/registry.ts`

**Step 1: Rewrite registry.ts**

Replace the 27 individual imports with config imports. Keep the same public API (`getTemplate`, `getAllTemplates`, `getAvailableTemplates`, `fallbackTemplateId`) but internally use `TemplateConfig` objects and the new `renderFromConfig` dispatcher.

```typescript
import type { TemplateConfig } from './types.ts';
import { renderFromConfig } from './renderer.ts';

// Import all config objects
import photoHero from './configs/photo/photo-hero.ts';
// ... (all 27 config imports)

const allConfigs: TemplateConfig[] = [
  photoHero,
  // ... all configs
];

const configMap = new Map<string, TemplateConfig>();
for (const c of allConfigs) configMap.set(c.id, c);

export function getTemplate(id: string): TemplateConfig | undefined {
  return configMap.get(id);
}

export function getAllTemplates(): TemplateConfig[] {
  return allConfigs;
}

export function getAvailableTemplates(
  hasImage: boolean,
  disabledIds?: string[]
): TemplateConfig[] {
  return allConfigs.filter(t =>
    (!t.requiresImage || hasImage) &&
    (!disabledIds || !disabledIds.includes(t.id))
  );
}

export function fallbackTemplateId(title: string, hasImage: boolean): string {
  const lower = title.toLowerCase();
  const hasNumbers = /\d+%|\d+\.\d|\$\d/.test(title);
  const isUrgent = /breaking|urgent|alert|just in|developing/i.test(lower);
  if (hasImage && isUrgent) return 'news-photo-banner';
  if (hasImage) return 'photo-hero';
  if (isUrgent) return 'news-banner';
  if (hasNumbers) return 'stats-card';
  return 'gradient-clean';
}

/** Render a config-driven template to Satori JSX */
export { renderFromConfig };
```

**Step 2: Update `index.ts` to use the new rendering path**

In `supabase/functions/og-image-generator/index.ts`, update the `renderTemplate` function (around line 169) to use config-driven rendering:

Change:
```typescript
const template = getTemplate(templateId);
if (!template) throw new Error(`Unknown template: ${templateId}`);
const jsx = template.render(input);
```

To:
```typescript
import { renderFromConfig } from "./templates/renderer.ts";
import { DEFAULT_VISIBILITY } from "./templates/types.ts";

// In renderTemplate function:
const config = getTemplate(templateId);
if (!config) throw new Error(`Unknown template: ${templateId}`);
const jsx = renderFromConfig(config, { ...input, visibility: input.visibility || DEFAULT_VISIBILITY });
```

Also update the `TemplateInput` construction in the generate/regenerate action (~line 343) to include the new fields with defaults:

```typescript
const renderInput = {
  title: item.title || 'Untitled',
  description: item.description || undefined,
  imageBase64,
  sourceName: feed.name,
  publishedAt: item.published_at || undefined,
  brandColor: undefined, // TODO: pull from og_company_settings
  visibility: DEFAULT_VISIBILITY,
};
const png = await renderOgTemplate(chosenTemplateId, renderInput);
```

**Step 3: Verify — deploy and test that existing templates render identically**
Run: `DOCKER_HOST=invalid npx supabase functions deploy og-image-generator --no-verify-jwt`
Test via the preview action in the frontend.

**Step 4: Commit**
`git commit -am "feat(og): switch registry to config-driven rendering (SOC-OG-10)"`

---

### Task 11: Delete the 27 legacy .tsx template files

**Files:**
- Delete: All `supabase/functions/og-image-generator/templates/*.tsx` files (not types.ts, registry.ts, renderer.ts)

Only do this AFTER verifying the config-driven versions render correctly. Keep a git branch or tag as a safety net.

**Step 1:**
```bash
cd supabase/functions/og-image-generator/templates
rm photo-hero.tsx photo-glass.tsx photo-caption.tsx photo-split.tsx photo-duotone.tsx photo-frame.tsx photo-sidebar.tsx
rm gradient-clean.tsx gradient-modern.tsx gradient-bold.tsx gradient-minimal.tsx gradient-glass.tsx gradient-startup.tsx
rm news-banner.tsx news-photo-banner.tsx news-ticker.tsx
rm stats-bars.tsx stats-card.tsx stats-grid.tsx
rm quote-classic.tsx quote-highlight.tsx editorial-magazine.tsx photo-quote.tsx
rm brand-minimal.tsx brand-announce.tsx brand-code.tsx brand-event.tsx
```

**Step 2: Commit**
`git add -A && git commit -m "refactor(og): remove legacy .tsx template files, now config-driven (SOC-OG-11)"`

---

## Phase 5: Generate 73 New Template Configs

### Task 12: Generate 73 new template configs to reach 100

**Files:**
- Create: 73 new `.ts` files across `configs/photo/`, `configs/editorial/`, `configs/news/`, `configs/gradient/`, `configs/stats/`, `configs/brand/`

**Distribution (adding to the 27 existing):**

| Category | Existing | New | Total | With Image | Without |
|---|---|---|---|---|---|
| photo | 7 | 23 | 30 | 30 | 0 |
| editorial | 4 | 16 | 20 | 12 | 8 |
| news | 3 | 12 | 15 | 10 | 5 |
| gradient | 6 | 9 | 15 | 0 | 15 |
| stats | 3 | 7 | 10 | 5 | 5 |
| brand | 4 | 6 | 10 | 3 | 7 |

**Naming convention:** `{category}-{style}-{variant}.ts` e.g. `photo-cinematic-dark.ts`, `editorial-author-spotlight.ts`

**Template design guidelines:**
- Every template MUST use `brandColor` in at least 2 `brandColorSlots`
- Every template MUST have `logo`, `author`, `date`, `categoryTag` configs
- Image templates should vary across all 9 overlay types (see design doc)
- Mix font sizes: 32-72px titles, some serif, some mono
- Include trending 2025-2026 styles: aurora gradients, glassmorphism, mixed-weight typography, bento-style
- Use the research findings for naming and purpose:
  - Photo: hero, cinematic, vignette, duotone, tint, editorial-cover, frame, sidebar, polaroid, glass, ...
  - Editorial: quote-card, author-spotlight, magazine-column, opinion-badge, pull-quote, ...
  - News: breaking, alert, live-indicator, ticker, urgent, developing, ...
  - Gradient: aurora, mesh, warm, cool, neon, minimal, brutalist, ...
  - Stats: dashboard, metric, comparison, trend, percentage, ...
  - Brand: announcement, launch, event, hiring, changelog, minimal, ...

**Step 1: Write all 73 configs.** Each is a ~30-50 line TypeScript file exporting a `TemplateConfig`.

**Step 2: Update registry.ts to import all 100 configs.**

**Step 3: Commit per batch (by category):**
```bash
git add supabase/functions/og-image-generator/templates/configs/photo/ && git commit -m "feat(og): add 23 new photo template configs (SOC-OG-12a)"
git add supabase/functions/og-image-generator/templates/configs/editorial/ && git commit -m "feat(og): add 16 new editorial template configs (SOC-OG-12b)"
git add supabase/functions/og-image-generator/templates/configs/news/ && git commit -m "feat(og): add 12 new news template configs (SOC-OG-12c)"
git add supabase/functions/og-image-generator/templates/configs/gradient/ && git commit -m "feat(og): add 9 new gradient template configs (SOC-OG-12d)"
git add supabase/functions/og-image-generator/templates/configs/stats/ && git commit -m "feat(og): add 7 new stats template configs (SOC-OG-12e)"
git add supabase/functions/og-image-generator/templates/configs/brand/ && git commit -m "feat(og): add 6 new brand template configs (SOC-OG-12f)"
```

---

## Phase 6: Database Migration + Company Settings

### Task 13: Create og_company_settings migration

**Files:**
- Create: `supabase/migrations/20260307120000_og_company_settings.sql`

**Step 1: Write the migration**

```sql
-- OG Image company-level settings
create table if not exists og_company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  show_title boolean not null default true,
  show_description boolean not null default true,
  show_author boolean not null default false,
  show_date boolean not null default false,
  show_logo boolean not null default true,
  show_category_tag boolean not null default false,
  show_source_name boolean not null default true,
  logo_url text,
  logo_dark_url text,
  brand_color text default '#3B82F6',
  brand_color_secondary text,
  font_family text default 'sans',          -- 'sans' | 'serif' | 'mono' — overrides template default for all text
  font_family_title text,                   -- optional separate font for titles only (null = use font_family)
  preferred_template_ids text[] default '{}',
  disabled_template_ids text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: company members can read their own settings
alter table og_company_settings enable row level security;

create policy "Members can view own company OG settings"
  on og_company_settings for select
  using (
    company_id in (
      select cm.company_id from company_memberships cm where cm.user_id = auth.uid()
    )
  );

-- Only owners/admins can update
create policy "Admins can update own company OG settings"
  on og_company_settings for update
  using (
    company_id in (
      select cm.company_id from company_memberships cm
      where cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

create policy "Admins can insert own company OG settings"
  on og_company_settings for insert
  with check (
    company_id in (
      select cm.company_id from company_memberships cm
      where cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

-- Service role bypass (for edge functions)
create policy "Service role full access to OG settings"
  on og_company_settings for all
  using (auth.role() = 'service_role');

-- Updated_at trigger
create or replace function update_og_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger og_settings_updated_at
  before update on og_company_settings
  for each row execute function update_og_settings_timestamp();
```

**Step 2: Apply migration**
Run: `npx supabase db push`
Expected: migration applied successfully

**Step 3: Commit**
`git add supabase/migrations/20260307120000_og_company_settings.sql && git commit -m "feat(og): add og_company_settings table with RLS (SOC-OG-13)"`

---

### Task 14: Update edge function to fetch company OG settings

**Files:**
- Modify: `supabase/functions/og-image-generator/index.ts`

**Step 1: Add helper to fetch company settings**

Add this function near the top of `index.ts` (after the imports):

```typescript
import { DEFAULT_VISIBILITY, type OgVisibilitySettings, type TemplateInput } from "./templates/types.ts";

async function getCompanyOgSettings(admin: ReturnType<typeof createClient>, companyId: string) {
  const { data } = await admin
    .from('og_company_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  return data;
}

function settingsToVisibility(settings: Record<string, unknown> | null): OgVisibilitySettings {
  if (!settings) return DEFAULT_VISIBILITY;
  return {
    showTitle: settings.show_title as boolean ?? true,
    showDescription: settings.show_description as boolean ?? true,
    showAuthor: settings.show_author as boolean ?? false,
    showDate: settings.show_date as boolean ?? false,
    showLogo: settings.show_logo as boolean ?? true,
    showCategoryTag: settings.show_category_tag as boolean ?? false,
    showSourceName: settings.show_source_name as boolean ?? true,
  };
}
```

**Step 2: Update the generate/regenerate action**

In the generate/regenerate block (~line 307), after fetching the feed item:

```typescript
// Fetch company OG settings
const ogSettings = await getCompanyOgSettings(admin, feed.company_id);
const visibility = settingsToVisibility(ogSettings);

// Fetch logo if available
let logoBase64: string | undefined;
let logoDarkBase64: string | undefined;
if (ogSettings?.logo_url) {
  logoBase64 = (await imageToBase64(ogSettings.logo_url)) || undefined;
}
if (ogSettings?.logo_dark_url) {
  logoDarkBase64 = (await imageToBase64(ogSettings.logo_dark_url)) || undefined;
}
```

Then update the renderInput to use all settings:

```typescript
const renderInput: TemplateInput = {
  title: item.title || 'Untitled',
  description: item.description || undefined,
  author: item.author || undefined,
  imageBase64,
  sourceName: feed.name,
  publishedAt: item.published_at || undefined,
  brandColor: ogSettings?.brand_color || undefined,
  brandColorSecondary: ogSettings?.brand_color_secondary || undefined,
  logoBase64,
  logoDarkBase64,
  categoryTag: item.category_tag || undefined,
  visibility,
};
```

**Step 3: Update `getAvailableTemplates` call in `aiRecommend` to pass `disabledIds`**

When calling `aiRecommend`, pass the company's `disabled_template_ids` so AI only considers enabled templates:

```typescript
const disabledIds = ogSettings?.disabled_template_ids || [];
// In aiRecommend, filter the template list
const templates = getAvailableTemplates(hasImage, disabledIds);
```

**Step 4: Commit**
`git commit -am "feat(og): integrate company OG settings into rendering pipeline (SOC-OG-14)"`

---

## Phase 7: Frontend — Update OG_TEMPLATES + Settings UI

### Task 15: Update frontend OG_TEMPLATES constant

**Files:**
- Modify: `src/hooks/useOgImage.ts`

**Step 1: Update the `OG_TEMPLATES` array to include all 100 templates**

Replace the static array with all 100 template entries. Each entry needs `id`, `name`, `category`, `requiresImage`, and add a new `tags` field.

```typescript
export interface OgTemplateInfo {
  id: string;
  name: string;
  category: string;
  requiresImage: boolean;
  tags: string[];
}

export const OG_TEMPLATES: OgTemplateInfo[] = [
  // Photo (30)
  { id: 'photo-hero', name: 'Photo Hero', category: 'photo', requiresImage: true, tags: ['dark', 'bold'] },
  // ... all 100 entries
];
```

**Step 2: Add a hook for company OG settings**

Add to `src/hooks/useOgImage.ts`:

```typescript
export function useOgCompanySettings() {
  const { selectedCompanyId } = useSelectedCompany();
  return useQuery({
    queryKey: ['og-company-settings', selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('og_company_settings')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
}

export function useUpdateOgCompanySettings() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useSelectedCompany();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { error } = await supabase
        .from('og_company_settings')
        .upsert({ company_id: selectedCompanyId, ...settings });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['og-company-settings'] });
      toast({ title: 'OG Settings Updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update settings', description: error.message, variant: 'destructive' });
    },
  });
}
```

**Step 3: Commit**
`git commit -am "feat(og): update frontend OG_TEMPLATES to 100 entries + settings hooks (SOC-OG-15)"`

---

### Task 16: Create OG Settings tab in Company Settings

**Files:**
- Create: `src/components/settings/OgSettingsTab.tsx`
- Modify: `src/pages/Settings.tsx` (add the tab)

**Step 1: Build the OG Settings component**

This component renders:
1. **Visibility toggles** — switches for showTitle, showDescription, showAuthor, showDate, showLogo, showCategoryTag, showSourceName
2. **Brand color pickers** — primary and secondary brand color
3. **Logo upload** — light logo + dark logo
4. **Template grid** — all 100 templates shown as cards with on/off toggles. Grouped by category. Filter by category/tags.

Use Shadcn components: `Switch`, `Label`, `Input`, `Card`, `Badge`, `Tabs`.

```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OG_TEMPLATES, useOgCompanySettings, useUpdateOgCompanySettings } from '@/hooks/useOgImage';
// ... full component implementation
```

The template grid shows each template as a small card with:
- Template name
- Category badge
- "Requires image" indicator
- Toggle switch (enabled/disabled)
- Disabled templates go into `disabled_template_ids` array
- Star icon for preferred templates (goes into `preferred_template_ids`)

**Step 2: Add the tab to Settings page**

In `src/pages/Settings.tsx`, add an "OG Images" tab alongside existing tabs (Profile, Company, Brand Voice, etc.):

```tsx
<TabsTrigger value="og-images">OG Images</TabsTrigger>
// ...
<TabsContent value="og-images"><OgSettingsTab /></TabsContent>
```

**Step 3: Verify**
Run: `npx tsc --noEmit`
Expected: no type errors

**Step 4: Commit**
`git commit -am "feat(og): add OG Settings tab with template toggle grid (SOC-OG-16)"`

---

## Phase 8: Update AI Recommendation + Fonts

### Task 17: Expand Gemini AI prompt for template recommendation

**Files:**
- Modify: `supabase/functions/og-image-generator/index.ts` (the `aiRecommend` function)

**Step 1: Update the aiRecommend function signature and prompt**

Add parameters for company context:

```typescript
async function aiRecommend(
  title: string,
  description: string | null,
  hasImage: boolean,
  sourceName: string | null,
  opts?: {
    hasLogo?: boolean;
    brandColor?: string;
    categoryTag?: string;
    preferredIds?: string[];
    disabledIds?: string[];
  }
)
```

Update the system prompt to include the expanded recommendation criteria from the design doc:

```
Rules:
- If has_image is false, NEVER pick a template that requires image
- Breaking/urgent news -> prefer news-* templates
- Data-heavy articles -> prefer stats-* templates
- Opinion/quotes/interviews -> prefer editorial templates
- Articles with good photos -> prefer photo-* templates
- Articles without images -> prefer gradient-* or brand-* templates
- If has_logo is true, prefer templates where logo position doesn't conflict with content
- Consider brand color vibrancy for gradient templates
- If category_tag is set, prefer templates with categoryColorCoded support
- PREFERRED templates (company favorites): ${opts?.preferredIds?.join(', ') || 'none'}
- DISABLED templates: never pick these
- Consider title length: short titles (1-5 words) -> large centered, long titles -> smaller left-aligned
```

Update the user message to include:

```typescript
{
  title,
  description: (description || '').substring(0, 200),
  has_image: hasImage,
  source_name: sourceName || 'Unknown',
  has_logo: opts?.hasLogo ?? false,
  brand_color: opts?.brandColor || '#3B82F6',
  category_tag: opts?.categoryTag || null,
}
```

Filter the template list to exclude disabled templates before sending to Gemini.

**Step 2: Commit**
`git commit -am "feat(og): expand AI recommendation prompt with logo/brand/category awareness (SOC-OG-17)"`

---

### Task 18: Add serif and mono fonts to font loader

**Files:**
- Modify: `supabase/functions/og-image-generator/utils/fonts.ts`

**Step 1: Add font variants**

The config schema supports `fontFamily: 'sans' | 'serif' | 'mono'`. Add serif (Source Serif 4) and mono (JetBrains Mono) fonts:

```typescript
let serifCache: ArrayBuffer | null = null;
let serifBoldCache: ArrayBuffer | null = null;
let monoCache: ArrayBuffer | null = null;

export async function loadFonts() {
  if (!fontCache) {
    const [regular, bold, serif, serifBold, mono] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4@latest/latin-400-normal.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4@latest/latin-700-normal.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf').then(r => r.arrayBuffer()),
    ]);
    fontCache = regular;
    fontBoldCache = bold;
    serifCache = serif;
    serifBoldCache = serifBold;
    monoCache = mono;
  }

  return [
    { name: 'Inter', data: fontCache, weight: 400, style: 'normal' },
    { name: 'Inter', data: fontBoldCache!, weight: 700, style: 'normal' },
    { name: 'Source Serif 4', data: serifCache!, weight: 400, style: 'normal' },
    { name: 'Source Serif 4', data: serifBoldCache!, weight: 700, style: 'normal' },
    { name: 'JetBrains Mono', data: monoCache!, weight: 400, style: 'normal' },
  ];
}
```

The archetype renderers should map fontFamily to the font name:
- `'sans'` -> `'Inter'`
- `'serif'` -> `'Source Serif 4'`
- `'mono'` -> `'JetBrains Mono'`

**Font override resolution** (in shared title renderer and all text renderers):
```typescript
function resolveFontFamily(configFont: 'sans' | 'serif' | 'mono' | undefined, input: TemplateInput, isTitle: boolean): string {
  const FONT_MAP = { sans: 'Inter', serif: 'Source Serif 4', mono: 'JetBrains Mono' };
  // Company override takes precedence over template config
  if (input.fontOverride) {
    if (isTitle && input.fontOverride.fontFamilyTitle) return FONT_MAP[input.fontOverride.fontFamilyTitle];
    return FONT_MAP[input.fontOverride.fontFamily];
  }
  return FONT_MAP[configFont || 'sans'];
}
```

This ensures company font settings override individual template defaults for brand consistency.

**Step 2: Commit**
`git commit -am "feat(og): add serif and mono fonts for template variety (SOC-OG-18)"`

---

## Phase 9: Update OgImagePreview Dropdown + Deploy

### Task 19: Update OgImagePreview dropdown to handle 100 templates

**Files:**
- Modify: `src/components/content/OgImagePreview.tsx`

**Step 1: Update the dropdown to support 100 templates with filtering**

The current dropdown shows all templates grouped by 6 categories. With 100 templates, add a search filter and respect company disabled templates.

Add `useOgCompanySettings` to filter out disabled templates. Add a search input at the top of the dropdown.

The `CATEGORIES` array should match the 6 categories from the design doc: `['photo', 'editorial', 'news', 'gradient', 'stats', 'brand']`.

**Step 2: Verify**
Run: `npx tsc --noEmit`
Expected: no type errors

**Step 3: Commit**
`git commit -am "feat(og): update OG preview dropdown for 100 templates with search (SOC-OG-19)"`

---

### Task 20: Add demo data for OG company settings

**Files:**
- Modify: `src/lib/demo/demo-data.ts`
- Modify: `src/lib/demo/DemoDataProvider.tsx`

**Step 1: Add demo OG settings fixture**

In `demo-data.ts`, add:
```typescript
export const DEMO_OG_SETTINGS = {
  company_id: DEMO_COMPANY_ID,
  show_title: true,
  show_description: true,
  show_author: false,
  show_date: false,
  show_logo: true,
  show_category_tag: false,
  show_source_name: true,
  brand_color: '#6366F1',
  brand_color_secondary: '#8B5CF6',
  preferred_template_ids: ['photo-hero', 'gradient-clean', 'news-banner'],
  disabled_template_ids: [],
};
```

**Step 2: Populate in DemoDataProvider**

In `DemoDataProvider.tsx`, add:
```typescript
queryClient.setQueryData(['og-company-settings', DEMO_COMPANY_ID], DEMO_OG_SETTINGS);
```

**Step 3: Commit**
`git commit -am "feat(og): add demo data for OG company settings (SOC-OG-20)"`

---

### Task 21: Deploy edge function + migration

**Step 1: Push migration**
Run: `npx supabase db push`

**Step 2: Deploy edge function**
Run: `DOCKER_HOST=invalid npx supabase functions deploy og-image-generator --no-verify-jwt`

**Step 3: Verify end-to-end**
1. Log in as superadmin at http://localhost:8080/app/content
2. Expand an article row, check OG preview loads
3. Click "Change Template" — verify 100 templates appear grouped by category
4. Select a new template — verify image regenerates
5. Go to Settings > OG Images — verify toggles work
6. Disable a template — verify it disappears from the dropdown

**Step 4: Commit any final fixes**
`git commit -am "fix(og): final adjustments after e2e testing (SOC-OG-21)"`

---

## Summary

| Phase | Tasks | Description |
|---|---|---|
| 1 | 1-2 | Types, config schema, brand color resolver |
| 2 | 3-5 | Shared sub-renderers (title, logo, source, meta, decorations) |
| 3 | 6-8 | 8 archetype renderers + dispatcher |
| 4 | 9-11 | Convert 27 existing templates to configs, update registry, delete legacy files |
| 5 | 12 | Generate 73 new template configs |
| 6 | 13-14 | Database migration + edge function integration |
| 7 | 15-16 | Frontend hooks, OG_TEMPLATES update, Settings UI |
| 8 | 17-18 | AI prompt expansion, serif/mono fonts |
| 9 | 19-21 | Dropdown update, demo data, deploy |
