# Typography Reference

## Table of Contents
- Type Scale
- Font Pairing
- Line Height & Measure
- Dashboard Typography
- Tailwind Mapping
- Common Mistakes

## Type Scale

Use a **modular scale** with ratio 1.125 (Major Second) for data-dense UIs or 1.25 (Major Third) for marketing pages.

### SaaS Dashboard Scale (base 14px, ratio ~1.125)

| Step | Size | Use | Tailwind |
|------|------|-----|----------|
| -2 | 11px | Fine print, disabled labels | `text-[11px]` |
| -1 | 12px | Captions, badges, timestamps | `text-xs` |
| 0 | 13px | Table cells, secondary text | `text-[13px]` |
| +1 | 14px | **Base** — body, form labels | `text-sm` |
| +2 | 16px | Card titles, subheadings | `text-base` |
| +3 | 18px | Section headings | `text-lg` |
| +4 | 20px | Page subtitles | `text-xl` |
| +5 | 24px | Page titles | `text-2xl` |
| +6 | 30px | Hero metrics, KPIs | `text-3xl` |
| +7 | 36px | Dashboard hero number | `text-4xl` |

**Rule:** A page should use at most 4-5 sizes from this scale. If you need more, your hierarchy is too complex.

## Font Pairing

For SaaS dashboards, a single font family (Inter, Plus Jakarta Sans, or Geist) handles everything. Pair with a monospace font for code/data.

### Recommended Stacks

**Primary (UI):**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Monospace (data/code):**
```css
font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Numbers in tables/metrics:**
```css
font-variant-numeric: tabular-nums;
```
Always use `tabular-nums` for numbers that need to align vertically (table columns, KPI cards, counters).

## Line Height

| Context | Line Height | Tailwind |
|---------|------------|----------|
| Headings (24px+) | 1.1-1.2 | `leading-tight` |
| UI labels, buttons | 1.0-1.25 | `leading-none` to `leading-tight` |
| Body text | 1.5-1.6 | `leading-normal` to `leading-relaxed` |
| Compact tables | 1.25-1.4 | `leading-snug` |
| Long-form reading | 1.6-1.8 | `leading-relaxed` to `leading-loose` |

**Rule:** Larger text = tighter line height. A 30px hero metric with `leading-relaxed` looks disjointed.

## Measure (Line Length)

- **Optimal:** 50-75 characters per line (45-65ch)
- **Max readable:** 80 characters
- **Dashboard cards:** Width-constrained, not an issue
- **Settings/form pages:** Cap at `max-w-2xl` (672px) or `max-w-3xl` (768px)

```tsx
// Good — constrained prose width
<div className="max-w-prose"> {/* 65ch */}
  <p className="text-sm text-muted-foreground leading-relaxed">...</p>
</div>
```

## Dashboard Typography Patterns

### KPI / Metric Cards
```tsx
<div>
  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
    Total Revenue
  </p>
  <p className="text-3xl font-bold tabular-nums tracking-tight">
    $124,592
  </p>
  <p className="text-xs text-emerald-600">
    +12.5% vs last month
  </p>
</div>
```

Key decisions:
- Label: smallest size, muted, uppercase with wide tracking for scannability
- Value: largest size, bold, `tabular-nums` for alignment, tight tracking
- Trend: small size, semantic color (green=up, red=down)

### Table Headers vs. Cells
```tsx
// Header: smaller, uppercase, muted, medium weight
<th className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">

// Cell: base size, normal weight
<td className="text-sm text-foreground px-4 py-3 tabular-nums">
```

### Chart Labels
- Axis labels: 11-12px, muted color
- Axis tick values: 11-12px, `tabular-nums`
- Chart title: 14-16px, medium weight
- Tooltip text: 12-13px

## Font Weight Usage

| Weight | Value | Use |
|--------|-------|-----|
| Normal | 400 | Body text, table cells, descriptions |
| Medium | 500 | Labels, card titles, nav items, table headers |
| Semibold | 600 | Section headings, active nav items |
| Bold | 700 | Page titles, hero metrics, primary actions |

**Rule:** Never use more than 3 weights on a single page. Normal + Medium + Bold covers 99% of dashboard needs.

## Common Mistakes

1. **Using `font-bold` on everything** — If labels, values, and headings are all bold, hierarchy collapses. Use weight + size + color together.
2. **Mixing `text-sm` and `text-[13px]`** — Pick one base size and stick with it across a component.
3. **Forgetting `tabular-nums`** — Numbers in columns that don't align vertically look sloppy.
4. **Too-tight line height on multi-line text** — `leading-tight` on a paragraph is claustrophobic. Reserve it for single-line headings.
5. **Uppercase without letter-spacing** — Uppercase text needs `tracking-wider` or `tracking-widest` to be readable.
6. **Inconsistent heading hierarchy** — If page title is `text-2xl`, section heading should be `text-lg`, not `text-xl`. Skip at most one step.
