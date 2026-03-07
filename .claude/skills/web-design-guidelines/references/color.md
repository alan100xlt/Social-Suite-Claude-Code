# Color System Reference

## Table of Contents
- Semantic Color Palette
- Contrast Ratios (WCAG)
- Building Accessible Palettes
- Dashboard Color Usage
- Chart Color Palettes
- Dark Mode
- Common Mistakes

## Semantic Color Palette

Every SaaS app needs these semantic color roles. Map them to CSS custom properties, not hardcoded hex values.

```css
:root {
  /* Surfaces */
  --background:      hsl(0 0% 100%);        /* page background */
  --card:            hsl(0 0% 100%);        /* card background */
  --popover:         hsl(0 0% 100%);        /* dropdown/tooltip background */
  --muted:           hsl(210 40% 96%);      /* disabled, subtle backgrounds */

  /* Text */
  --foreground:      hsl(222 47% 11%);      /* primary text */
  --muted-foreground: hsl(215 16% 47%);     /* secondary text, placeholders */

  /* Interactive */
  --primary:         hsl(221 83% 53%);      /* primary buttons, links */
  --primary-foreground: hsl(0 0% 100%);     /* text on primary */
  --secondary:       hsl(210 40% 96%);      /* secondary buttons */
  --accent:          hsl(210 40% 96%);      /* hover states, selected rows */

  /* Feedback */
  --destructive:     hsl(0 84% 60%);        /* errors, delete actions */
  --warning:         hsl(38 92% 50%);       /* warnings, caution */
  --success:         hsl(142 71% 45%);      /* success, positive trends */

  /* Structure */
  --border:          hsl(214 32% 91%);      /* borders, dividers */
  --ring:            hsl(221 83% 53%);      /* focus rings */
}
```

## WCAG Contrast Ratios

| Level | Ratio | Applies To |
|-------|-------|------------|
| AA (normal text) | 4.5:1 | Body text, labels, form inputs |
| AA (large text, 18px+ bold or 24px+) | 3:1 | Headings, hero metrics |
| AAA (normal text) | 7:1 | Ideal for body text |
| AA (UI components) | 3:1 | Borders, icons, form controls |

### Checking Contrast
```bash
# Browser DevTools → Elements → Styles → click any color swatch
# Shows contrast ratio and AA/AAA pass/fail
```

### Safe Combinations (Light Mode)
```
Background white (#fff) + Text:
  #111827 (gray-900) → 18.1:1 ✓ AAA   — primary text
  #374151 (gray-700) → 10.7:1 ✓ AAA   — secondary text
  #6B7280 (gray-500) → 5.9:1  ✓ AA    — tertiary/muted text
  #9CA3AF (gray-400) → 3.5:1  ✗ FAIL  — too light for text
```

### Safe Combinations (Dark Mode)
```
Background #0f172a (slate-900) + Text:
  #f8fafc (slate-50)  → 16.3:1 ✓ AAA  — primary text
  #cbd5e1 (slate-300) → 9.1:1  ✓ AAA  — secondary text
  #94a3b8 (slate-400) → 5.6:1  ✓ AA   — muted text
  #64748b (slate-500) → 3.6:1  ✗ FAIL — too dim for text
```

## Building Accessible Palettes

### The 9-Shade System
For each semantic color, generate 9 shades (50-900). Use HSL and adjust lightness:

```
50:  Very light background (alerts, badges)
100: Light background (hover states)
200: Light border
300: Muted icons, disabled text
400: Secondary icons
500: Primary — the "brand" shade (buttons, links)
600: Hover state for primary
700: Active/pressed state
800: High-contrast text on light backgrounds
900: Highest contrast
```

**Rule:** The 500 shade should pass AA contrast on white for text usage. If it doesn't, use 600+ for text and keep 500 for large elements (buttons, fills).

### Status Colors for Dashboards
```
Success:  emerald-500 (#10b981) on white → 3.4:1 (large text only)
          emerald-700 (#047857) on white → 5.9:1 ✓ AA for small text
Warning:  amber-600   (#d97706) on white → 3.5:1 (large text only)
          amber-800   (#92400e) on white → 7.3:1 ✓ AAA
Error:    red-500     (#ef4444) on white → 3.9:1 (large text only)
          red-700     (#b91c1c) on white → 6.1:1 ✓ AA
Info:     blue-500    (#3b82f6) on white → 3.1:1 (large text only)
          blue-700    (#1d4ed8) on white → 5.9:1 ✓ AA
```

**Pattern for status indicators:** Use the 500 shade for background fills (pills, badges with white text) and the 700 shade for text on white backgrounds.

## Dashboard Color Usage

### Metric Cards — Trend Colors
```tsx
// Green for positive, red for negative, muted for neutral
const trendColor = change > 0
  ? 'text-emerald-600 dark:text-emerald-400'
  : change < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground';
```

### Row Highlighting
- Hover: `bg-muted/50` (half-opacity muted)
- Selected: `bg-accent` or `bg-primary/5`
- Never use saturated colors for row backgrounds — they compete with content

### Borders
- Default: `border-border` (the CSS variable)
- Use `divide-y divide-border` for table rows instead of individual borders
- Card borders: `border` (1px) not `border-2` — subtle separation, not emphasis

## Chart Color Palettes

### Sequential (single metric, varying intensity)
```js
// Light to dark blue — use for heatmaps, single-series intensity
['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a']
```

### Categorical (multiple series, distinct items)
```js
// Max 6 colors — beyond that, use a table instead
['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
// blue,     emerald,   amber,     red,       violet,    pink
```

### Diverging (positive/negative from center)
```js
// Red ← neutral → Green (financial, sentiment)
['#ef4444', '#fca5a5', '#e5e7eb', '#86efac', '#22c55e']
```

**Rules:**
- Never use more than 6 categorical colors in one chart
- Never rely on color alone — add labels, patterns, or tooltips
- Test with color blindness simulators (Chrome DevTools → Rendering → Emulate vision deficiencies)
- For pie/donut charts, adjacent slices need sufficient contrast between them

## Dark Mode

### Principles
1. **Don't just invert.** Dark mode is NOT `filter: invert(1)`. Surfaces are dark gray, not pure black.
2. **Reduce contrast slightly.** White text on pure black (#000) causes halation. Use `slate-950` (#020617) or `zinc-950` (#09090b) for backgrounds, `slate-50` for text.
3. **Elevate with lightness.** In dark mode, "higher" surfaces are LIGHTER (opposite of light mode shadows). Card on page = lighter gray on darker gray.
4. **Desaturate colors.** Saturated colors on dark backgrounds vibrate. Shift semantic colors toward pastels: `emerald-400` instead of `emerald-500`.
5. **Borders become more important.** Without shadows, borders separate elements. Use `border-slate-700` or `border-slate-800`.

### Surface Elevation Stack (Dark Mode)
```
Level 0 — Page background:    hsl(222 47% 5%)   / slate-950
Level 1 — Card/panel:         hsl(222 47% 8%)   / slate-900
Level 2 — Popover/dropdown:   hsl(222 47% 11%)  / slate-800
Level 3 — Tooltip/dialog:     hsl(222 47% 14%)  / slate-700
```

### Color Adjustments for Dark Mode
```
Light Mode          → Dark Mode
primary-500           primary-400 (lighter for visibility)
emerald-600           emerald-400
red-600               red-400
amber-600             amber-400
gray-100 backgrounds  slate-800/900
gray-900 text         slate-50/100
```

## Common Mistakes

1. **Using opacity instead of proper dark-mode colors** — `text-white/60` is fine for overlays, but semantic text should use proper muted variables.
2. **Same chart colors in both modes** — Blue-500 on white is fine, but blue-500 on slate-900 may be too dim. Lighten by 1-2 stops.
3. **Forgetting focus rings in dark mode** — `ring-primary` may be invisible on dark surfaces. Test keyboard navigation.
4. **Red/green for status without secondary indicator** — 8% of men have color vision deficiency. Add icons or text labels alongside color.
5. **Saturated background colors** — `bg-red-500` for error banners is overwhelming. Use `bg-red-500/10` with `text-red-700` (light mode) or `bg-red-400/10` with `text-red-400` (dark mode).
