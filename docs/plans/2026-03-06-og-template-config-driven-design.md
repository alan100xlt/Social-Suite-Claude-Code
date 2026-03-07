# OG Template System: Config-Driven Refactor + 100 Templates

**Date:** 2026-03-06
**Status:** Design
**Scope:** Refactor 27 individual .tsx template files into a config-driven system with 8 archetype renderers, then scale to 100 templates (80 image-driven, 20 text-only).

---

## Problem

The current OG image system has 27 individual `.tsx` files, each ~80-100 lines of Satori JSX. Adding new templates requires writing JSX by hand. Only 9 of 27 (33%) use images. The system lacks logo support and brand color integration is superficial (one accent per template).

## Goals

1. Replace 27 .tsx files with 8 archetype renderers + 100 JSON config objects
2. 80% image-driven templates (80 with images, 20 without)
3. First-class logo support (position, sizing, contrast background)
4. Deep brand color integration (multiple slots per template, not just one accent)
5. AI (Gemini) considers logo, brand colors, and content type when recommending templates
6. Category-coded color system for media companies (breaking=red, analysis=blue, etc.)

---

## Architecture: Option C — Archetype Renderers + Typed Config

### TemplateInput (expanded)

```typescript
interface TemplateInput {
  title: string;
  description?: string;
  author?: string;                // article author name
  imageBase64?: string;           // pre-fetched article image as data URI
  sourceName?: string;            // feed / publication name
  publishedAt?: string;           // ISO date string
  brandColor?: string;            // primary brand color (hex)
  brandColorSecondary?: string;   // secondary brand color (hex)
  logoBase64?: string;            // publisher logo for dark backgrounds
  logoDarkBase64?: string;        // publisher logo for light backgrounds
  categoryTag?: string;           // e.g. "BREAKING", "OPINION", "TECH"
  stats?: Array<{                 // for stats templates
    label: string;
    value: string;
    change?: string;
  }>;
  // Company-level visibility settings (merged at render time)
  visibility: OgVisibilitySettings;
}

/** Company configures which content layers appear on their OG images.
 *  Templates define WHERE each layer goes; these settings control WHETHER it shows. */
interface OgVisibilitySettings {
  showTitle: boolean;             // default: true
  showDescription: boolean;       // default: true (if available)
  showAuthor: boolean;            // default: false
  showDate: boolean;              // default: false
  showLogo: boolean;              // default: true (if logo uploaded)
  showCategoryTag: boolean;       // default: false
  showSourceName: boolean;        // default: true
}

/** Company-level font override. When set, overrides template fontFamily defaults. */
interface OgFontSettings {
  fontFamily: 'sans' | 'serif' | 'mono';        // applies to all text by default
  fontFamilyTitle?: 'sans' | 'serif' | 'mono';  // optional separate font for titles only
}
```

### Company OG Settings (new table: `og_company_settings`)

Each company can configure their OG image preferences:

```sql
create table og_company_settings (
  company_id uuid primary key references companies(id),
  show_title boolean not null default true,
  show_description boolean not null default true,
  show_author boolean not null default false,
  show_date boolean not null default false,
  show_logo boolean not null default true,
  show_category_tag boolean not null default false,
  show_source_name boolean not null default true,
  logo_url text,                    -- light logo (for dark backgrounds)
  logo_dark_url text,               -- dark logo (for light backgrounds)
  brand_color text default '#3B82F6',
  brand_color_secondary text,
  font_family text default 'sans',         -- 'sans' | 'serif' | 'mono' — overrides template default
  font_family_title text,                  -- optional separate font for titles (null = use font_family)
  preferred_template_ids text[],    -- pinned favorite templates
  disabled_template_ids text[],     -- templates this company has turned off
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

The edge function fetches these settings at render time and merges them into `TemplateInput.visibility`. Templates don't need "with logo" and "without logo" variants — one config handles both via visibility flags.

**Template enable/disable flow:**
- `disabled_template_ids` stores templates a company has turned off
- `getAvailableTemplates(hasImage, companySettings)` filters out disabled templates
- AI recommendation prompt only includes enabled templates in the candidate list
- `preferred_template_ids` are weighted higher in AI recommendation
- Frontend settings page shows a grid of all 100 templates with on/off toggles per company
- Default: all templates enabled. Companies curate their library over time.

### Config Schema

```typescript
type LayoutArchetype =
  | 'fullbleed'      // image fills canvas, overlay + text on top
  | 'split-lr'       // left/right panels (image + text or text + text)
  | 'split-tb'       // top/bottom panels
  | 'centered'       // content centered vertically + horizontally
  | 'text-forward'   // left-aligned text stack, minimal decoration
  | 'card'           // content inside a card (glass, bordered, etc.)
  | 'banner'         // top banner bar + main text + bottom bar
  | 'special';       // date-block, bracket-text, etc.

type OverlayType =
  | 'dark-gradient-bottom'    // transparent top -> dark bottom
  | 'dark-gradient-top'       // dark top -> transparent bottom
  | 'dark-gradient-radial'    // dark edges, lighter center
  | 'solid-dim'               // uniform dark overlay
  | 'brand-duotone'           // grayscale + brand color mapping
  | 'brand-tint'              // brand color at low opacity
  | 'vignette'                // dark edges only
  | 'blur';                   // gaussian blur background

type ImagePosition =
  | 'fullbleed'               // entire 1200x630
  | 'left-panel'              // left % of frame
  | 'right-panel'             // right % of frame
  | 'top-panel'               // top % of frame
  | 'bottom-panel'            // bottom % of frame
  | 'framed';                 // inset with padding + border-radius

type LogoPosition =
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'center-top';

type BrandColorSlot =
  | 'background'         // entire background
  | 'gradient-start'     // first stop of gradient
  | 'gradient-end'       // last stop of gradient
  | 'overlay'            // duotone/tint overlay
  | 'accent-bar'         // thin bar (top, bottom, left, right)
  | 'accent-dot'         // small circle accent
  | 'badge-bg'           // source name badge background
  | 'source-text'        // source name text color
  | 'stat-number'        // large metric number
  | 'quote-mark'         // decorative quotation marks
  | 'highlight-bg'       // text highlight background
  | 'divider'            // separator line
  | 'card-border'        // card border or gradient border
  | 'banner-bg'          // news banner background
  | 'category-badge';    // category tag badge

type SourceNameStyle =
  | 'badge'              // colored pill/badge
  | 'uppercase-label'    // uppercase, letter-spaced
  | 'subtle-text'        // small gray text
  | 'monospace-path'     // ~/sourceName terminal style
  | 'inline-banner'      // inside a banner bar
  | 'none';

interface TemplateConfig {
  id: string;
  name: string;
  category: 'photo' | 'gradient' | 'news' | 'stats' | 'editorial' | 'brand';
  tags: string[];               // faceted filtering: ['minimal', 'dark', 'serif']
  requiresImage: boolean;

  layout: {
    archetype: LayoutArchetype;
    splitRatio?: [number, number];  // e.g. [60, 40] for split layouts
    padding: number | [number, number, number, number];
    theme: 'dark' | 'light';       // determines which logo variant to use
  };

  background: {
    type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image-fullbleed';
    colors: string[];               // hex values or 'brandColor'/'brandColorSecondary'
    gradientAngle?: number;         // CSS degrees
  };

  image?: {
    position: ImagePosition;
    panelPercent?: number;          // for split layouts
    overlay?: {
      type: OverlayType;
      opacity?: number;
    };
    filter?: string;                // CSS filter string
    borderRadius?: number;
    edgeBlend?: {                   // gradient blend at split edge
      side: 'left' | 'right' | 'top' | 'bottom';
      width: number;
    };
  };

  title: {
    fontSize: number;               // 32-72px
    fontWeight: number;             // 400-900
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
    color: string;                  // hex or 'brandColor'
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
    badgeBg?: string;               // for badge style: hex or 'brandColor'
  };

  // --- Configurable content layers ---
  // Templates define WHERE these go; company settings control WHETHER they show.
  // The renderer checks input.visibility before rendering each layer.

  author?: {
    position: 'below-title' | 'above-title' | 'bottom-left' | 'bottom-right' | 'below-description';
    fontSize: number;               // typically 18-24px
    fontWeight: number;
    color: string;
    prefix?: string;                // e.g. "By " or "Written by "
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
  };

  date?: {
    position: 'below-title' | 'below-author' | 'top-right' | 'bottom-bar' | 'inline-with-author';
    fontSize: number;               // typically 14-20px
    fontWeight: number;
    color: string;
    format: 'relative' | 'short' | 'long' | 'calendar-block';  // "2h ago" vs "Mar 6" vs "March 6, 2026"
  };

  categoryTag?: {
    position: 'above-title' | 'top-left' | 'top-right' | 'inline-banner';
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor?: string;       // hex or 'brandColor' or 'category-coded'
    borderRadius?: number;
    padding?: string;
    textTransform?: 'uppercase' | 'none';
  };

  logo: {
    position: LogoPosition;
    maxHeight: number;              // 24-48px
    margin: number;                 // px from edge
    background?: 'none' | 'white-pill' | 'dark-pill' | 'frosted';
  };

  brandColorSlots: BrandColorSlot[];

  decorations: Array<{
    type: string;                   // 'accent-bar', 'divider', 'circle', 'quote-marks', etc.
    position: string;
    width?: number;
    height?: number;
    color?: string;                 // hex or 'brandColor'
    borderRadius?: number;
    opacity?: number;
    gradient?: string;
    boxShadow?: string;
    condition?: string;             // 'no-description', 'has-category', etc.
  }>;

  card?: {
    backgroundColor: string;
    borderRadius: number;
    border?: string;
    padding: number;
    gradientBorder?: {
      colors: string[];
      angle: number;
      width: number;
    };
    backdropFilter?: string;
    maxWidth?: number;
  };

  staticLabels?: Array<{
    text: string;                   // 'Breaking News', 'LIVE', etc.
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
    categoryColorCoded?: boolean;   // use categoryTag to pick accent color
  };
}
```

### 8 Archetype Renderers

Each renderer is a function that takes `(config: TemplateConfig, input: TemplateInput)` and returns Satori JSX.

| Renderer | Responsibility | Est. Lines |
|---|---|---|
| `renderFullbleed` | Image bg -> overlay layer -> text layer (bottom/center aligned) -> logo | ~60 |
| `renderSplitLR` | Left/right panels with optional edge blend, accent bar between | ~70 |
| `renderSplitTB` | Top/bottom panels with configurable ratio | ~60 |
| `renderCentered` | Content centered, optional image bg, decorations around | ~50 |
| `renderTextForward` | Left-aligned text stack, accent bars at edges | ~40 |
| `renderCard` | Outer bg -> centered card (glass/bordered) -> content inside | ~60 |
| `renderBanner` | Top banner bar -> main content -> bottom bar | ~60 |
| `renderSpecial` | Date-block, bracket-text, and other one-off layouts | ~50 |
| **Shared** | `renderLogo`, `renderSourceName`, `renderDecorations`, `renderTitle` | ~100 |
| **Total** | | **~550 lines** |

Plus a `renderTemplate(config, input)` dispatcher that routes to the right archetype.

### Shared Sub-renderers

These are called by every archetype renderer:

- `renderLogo(config.logo, input)` — places logo at configured position with contrast background
- `renderSourceName(config.sourceName, input)` — renders source name in configured style
- `renderTitle(config.title, input)` — renders title with configured typography + treatment
- `renderDescription(config.description, input)` — optional description block
- `renderDecorations(config.decorations, input)` — iterates decoration array, renders each
- `resolveBrandColor(colorValue, input)` — replaces 'brandColor'/'brandColorSecondary' tokens with actual hex values

---

## 100 Template Distribution

### By Archetype + Image

| Archetype | With Image | Without Image | Total | Example Names |
|---|---|---|---|---|
| fullbleed | 25 | 0 | 25 | hero-dark, hero-light, cinematic, vignette, duotone-warm, duotone-cool, tint-brand, headline-overlay, editorial-cover, ... |
| split-lr | 20 | 2 | 22 | split-clean, split-accent, split-diagonal, sidebar-narrow, sidebar-wide, quote-photo, ... |
| split-tb | 15 | 0 | 15 | caption-bottom, caption-top, framed-polaroid, framed-rounded, magazine-top, ... |
| centered | 8 | 5 | 13 | card-over-photo, glass-over-photo, gradient-clean, gradient-aurora, gradient-mesh, ... |
| text-forward | 2 | 7 | 9 | bold-serif, minimal-white, minimal-dark, typographic-hero, gradient-bold, ... |
| card | 5 | 3 | 8 | glass-photo, startup-bordered, neon-card, frosted-dark, ... |
| banner | 5 | 1 | 6 | breaking-photo, news-ticker, live-banner, alert-photo, ... |
| special | 0 | 2 | 2 | calendar-event, terminal-code |
| **Total** | **80** | **20** | **100** | |

### By Category (user-facing)

| Category | Count | Description |
|---|---|---|
| Photo-Forward | 30 | Hero images, split panels, framed photos — for articles with strong imagery |
| Editorial | 20 | Magazine layouts, quote cards, opinion pieces, author spotlights |
| News | 15 | Breaking banners, live indicators, alert styles, ticker bars |
| Gradient | 15 | Aurora, mesh, brand-colored, minimal — for articles without photos |
| Data & Stats | 10 | Metric callouts, chart decorations, report-style layouts |
| Brand | 10 | Announcements, events, minimal brand cards, institutional |

### Image Overlay Variety (across 80 image templates)

| Overlay Style | Count | Description |
|---|---|---|
| Dark gradient (bottom) | 20 | Classic — transparent top, dark bottom for text |
| Dark gradient (top) | 5 | Inverted — dark top for title, image visible bottom |
| Dark gradient (radial) | 5 | Dark edges, lighter center focal point |
| Solid dim | 8 | Uniform 40-60% dark overlay |
| Brand duotone | 10 | Grayscale image + brand color mapping |
| Brand tint | 8 | Brand color at 20-40% opacity over photo |
| Vignette | 4 | Dark edges only, center preserved |
| Blur background | 5 | Gaussian blur behind card/text |
| Split (no overlay) | 15 | Image in one panel, clean edge to text panel |

---

## Logo Integration

Every template includes a `logo` config block:

```json
{
  "logo": {
    "position": "bottom-left",
    "maxHeight": 32,
    "margin": 32,
    "background": "none"
  }
}
```

**Position rules by archetype:**
- **fullbleed**: top-left or bottom-right (avoid competing with bottom-left title)
- **split-lr**: inside text panel, bottom corner
- **split-tb**: bottom panel, left or right
- **centered**: top-center or bottom-left
- **text-forward**: top-left (above title)
- **card**: inside card, bottom or outside card top-left
- **banner**: inside banner bar, left side
- **special**: varies

**Contrast handling:**
- `layout.theme: 'dark'` -> use `input.logoBase64` (light/white logo)
- `layout.theme: 'light'` -> use `input.logoDarkBase64` (dark logo)
- `logo.background: 'white-pill'` -> renders a white rounded rect behind logo for busy backgrounds
- `logo.background: 'frosted'` -> backdrop-blur pill behind logo

**AI considerations:**
- Gemini prompt includes: "Logo is present: yes/no", "Logo variant: light/dark"
- AI avoids templates where logo position conflicts with image focal point
- AI prefers templates where brand color and logo create visual harmony

---

## Brand Color Deep Integration

Instead of one accent per template, each template declares multiple `brandColorSlots`:

```json
{
  "brandColorSlots": ["gradient-start", "badge-bg", "accent-bar", "category-badge"]
}
```

The renderer resolves `'brandColor'` tokens in any color field to `input.brandColor`.

**Category-coded colors** (optional per-company setting):
```typescript
const CATEGORY_COLORS: Record<string, string> = {
  'BREAKING': '#DC2626',    // red
  'OPINION': '#7C3AED',     // purple
  'ANALYSIS': '#2563EB',    // blue
  'TECH': '#059669',        // green
  'LIFESTYLE': '#D97706',   // amber
  'SPORTS': '#EA580C',      // orange
};
```

When `behavior.categoryColorCoded: true` and `input.categoryTag` is present, the category color overrides `brandColor` for accent elements — creating instant visual taxonomy in social feeds.

---

## AI Recommendation Updates

The Gemini prompt for template recommendation expands to include:

```
Content: "{title}"
Has image: {yes/no}
Has logo: {yes/no}
Brand color: {hex}
Category: {categoryTag or "none"}
Publisher: {sourceName}

Pick the best template ID from the available list. Consider:
- Image quality and composition when choosing overlay type
- Logo contrast (prefer dark themes for light logos, light themes for dark logos)
- Brand color vibrancy (saturated colors work in gradients, muted colors work as accents)
- Category coding (breaking news -> banner templates, opinion -> editorial)
- Title length (short titles -> large font centered, long titles -> smaller font left-aligned)
```

---

## File Structure (after refactor)

```
supabase/functions/og-image-generator/
  templates/
    types.ts                  # TemplateInput, TemplateConfig types
    registry.ts               # loads all configs, getTemplate(), getAvailableTemplates()
    renderer.ts               # renderTemplate() dispatcher
    archetypes/
      fullbleed.tsx           # renderFullbleed()
      split-lr.tsx            # renderSplitLR()
      split-tb.tsx            # renderSplitTB()
      centered.tsx            # renderCentered()
      text-forward.tsx        # renderTextForward()
      card.tsx                # renderCard()
      banner.tsx              # renderBanner()
      special.tsx             # renderSpecial()
    shared/
      logo.tsx                # renderLogo()
      source-name.tsx         # renderSourceName()
      title.tsx               # renderTitle()
      decorations.tsx         # renderDecorations()
      brand-color.ts          # resolveBrandColor(), category colors
    configs/
      photo/                  # 30 JSON configs
      editorial/              # 20 JSON configs
      news/                   # 15 JSON configs
      gradient/               # 15 JSON configs
      stats/                  # 10 JSON configs
      brand/                  # 10 JSON configs
```

---

## Migration Plan

1. Build archetype renderers + shared sub-renderers
2. Convert existing 27 templates to JSON configs (verify pixel-perfect output)
3. Add logo + expanded brand color support to all 27
4. Generate 73 new template configs to reach 100
5. Update frontend `OG_TEMPLATES` array and dropdown UI
6. Update Gemini prompt with new template IDs and recommendation factors
7. Update voting gallery with all 100 templates

---

## What CAN'T Be Config-Driven

These need special handling in archetype code:

| Feature | Templates | Solution |
|---|---|---|
| `buildSegments()` text highlighting | quote-highlight | `title.treatment: 'highlight-segments'` flag triggers algorithm in renderer |
| Hardcoded mock stats data | stats-bars, stats-card, stats-grid | `staticData` field in config OR `input.stats` array |
| Breaking keyword detection | news-ticker | `behavior.detectBreaking` flag + keyword list in renderer |
| Date parsing into calendar block | brand-event | `behavior.showDate` + `dateDisplay` config |
| Terminal aesthetic (dots+brackets) | brand-code | Handled by `special` archetype |
| Conditional decorative lines | editorial-magazine | `decoration.condition: 'no-description'` |
| Diagonal stripe pattern | brand-announce | Raw `backgroundImage` CSS string in decoration |

---

## Success Criteria

- All 27 existing templates render identically from JSON configs
- 100 templates total, 80 with images, 20 without
- Every template has logo placement configured
- Every template uses brandColor in 2+ visual elements
- AI recommendation considers logo, brand color, category, and content type
- Adding a new template = adding one JSON file (no JSX)
- Frontend dropdown grouped by category with template count
