---
name: web-design-guidelines
description: |
  Web design quality guidelines for SaaS dashboards — layout, typography, color theory,
  spacing systems, responsive design, visual hierarchy, and component patterns. Use when:
  (1) Building or reviewing UI components, pages, or layouts,
  (2) Making color, typography, or spacing decisions,
  (3) Reviewing designs for accessibility or visual consistency,
  (4) Fixing layout issues, alignment problems, or visual hierarchy,
  (5) Implementing dark mode or responsive breakpoints,
  (6) Designing data-dense UIs (analytics dashboards, tables, metric cards).
  Covers Laws of UX, Refactoring UI principles, and design system best practices.
---

Review or apply web design guidelines: $ARGUMENTS

## Core Principles (Refactoring UI)

### Visual Hierarchy — Size, Weight, Color
Every UI has three levels. Use all three levers, not just font size:
- **Primary** (page title, key metric): large size OR heavy weight OR high-contrast color
- **Secondary** (labels, supporting text): medium size, normal weight, muted color (`text-muted-foreground`)
- **Tertiary** (timestamps, metadata): small size, normal weight, lightest color

**Rule:** If everything is bold, nothing is bold. De-emphasize secondary content instead of only emphasizing primary content.

### Don't Use Grey Text on Colored Backgrounds
On colored/dark backgrounds, reduce opacity instead of using grey. Grey on blue looks washed out; `rgba(255,255,255,0.65)` looks intentional.

### Semantic Hierarchy Over Visual Hierarchy
Don't let semantic HTML dictate visual weight. An `<h3>` sidebar title should look lighter than a card's `<p>` key metric. Style for hierarchy, not element type.

### Start with Too Much White Space
Cramped UIs are harder to fix than spacious ones. Start generous, then remove space until it feels right. For data-dense dashboards, tight spacing works — but consistent tight spacing.

## Spacing System

Use a **base-4/base-8** scale. Never freestyle pixel values.

```
4px  — tight inline gaps (icon-to-label)
8px  — compact padding (badges, tags, small buttons)
12px — form field padding, tight card padding
16px — standard card padding, paragraph gaps
24px — section gaps within a card
32px — between cards/sections
48px — major page sections
64px — page-level vertical rhythm
```

**Rules:**
- Padding inside a container < gap between sibling containers
- Related items closer together, unrelated items farther apart (Law of Proximity)
- Margins on cards/sections should use the SAME value across a page — never mix `gap-4` and `gap-5`
- Use `gap` on flex/grid containers, not margins on children

## Typography

See [references/typography.md](references/typography.md) for type scale, pairing rules, and dashboard-specific guidance.

**Quick reference — SaaS dashboard type scale:**
```
12px — captions, badges, metadata
13px — table cells, secondary labels
14px — body text, form labels (base)
16px — card titles, subheadings
18px — section headings
20px — page subtitles
24px — page titles
30px — hero metrics (dashboard KPIs)
```

## Color

See [references/color.md](references/color.md) for full color system, contrast ratios, accessible palettes, and dark mode.

**Quick reference — semantic palette:**
```
primary    — brand action (buttons, links, active states)
secondary  — subtle actions, secondary buttons
destructive — delete, error states (red family)
warning    — caution states (amber/yellow family)
success    — positive states, growth indicators (green family)
muted      — backgrounds, disabled states, borders
accent     — highlights, selected rows, focus rings
```

## Layout

See [references/layout.md](references/layout.md) for grid systems, responsive breakpoints, and dashboard layout patterns.

**Quick reference — dashboard layout rules:**
- Sidebar: fixed 240-280px (collapsed: 64px)
- Content max-width: 1400px for dashboards, 720px for forms/settings
- Metric cards: CSS Grid `repeat(auto-fill, minmax(240px, 1fr))`
- Charts: minimum 300px height, 16:9 or 4:3 aspect ratio preferred

## Component Patterns

See [references/components.md](references/components.md) for cards, tables, forms, navigation, and data visualization patterns.

## Laws of UX (Key Subset for Dashboards)

| Law | Implication |
|-----|-------------|
| **Fitts's Law** | Make click targets large enough. Minimum 44x44px touch targets, 32x32px mouse. |
| **Hick's Law** | Fewer choices = faster decisions. Limit dashboard filters to 5-7 visible options. |
| **Miller's Law** | Chunk information into groups of 5-7. Group metrics into themed cards. |
| **Jakob's Law** | Users expect your app to work like others they know. Follow platform conventions. |
| **Law of Proximity** | Items near each other are perceived as related. Use spacing to create groups. |
| **Law of Similarity** | Items that look alike are perceived as related. Consistent card styles = group identity. |
| **Law of Common Region** | Items in the same bounded area are perceived as grouped. Cards create regions. |
| **Aesthetic-Usability Effect** | Attractive UIs are perceived as more usable. Polish matters for trust. |
| **Doherty Threshold** | Response time <400ms feels instant. Show skeletons/spinners for slower loads. |
| **Postel's Law** | Be liberal in what you accept, conservative in what you display. Truncate long text gracefully. |
| **Peak-End Rule** | Users judge experience by peak moments and endings. Polish empty states and success confirmations. |
| **Von Restorff Effect** | Distinctive items are memorable. Use color/size to highlight the ONE key metric. |

## Anti-Patterns Checklist

When reviewing UI code, flag these:

1. **Centered everything** — Center alignment only for hero sections, empty states, and modals. Body text, forms, labels, and data should be left-aligned (or right-aligned for numbers).
2. **Too many font sizes** — Use the type scale above. If more than 6 distinct sizes appear on one page, consolidate.
3. **Inconsistent spacing** — Every gap value should come from the spacing scale. Search for arbitrary pixel values.
4. **Border-heavy design** — Use background color differences or spacing to separate sections. Reserve borders for tables and form inputs.
5. **Low contrast text** — Body text needs 4.5:1 minimum contrast. Large text (18px+) needs 3:1. Check with browser DevTools.
6. **Icon overload** — Don't put icons on everything. Icons without labels are ambiguous. If you need a label anyway, consider dropping the icon.
7. **Misaligned columns** — Numbers in tables should be right-aligned and use tabular-nums. Text left-aligned. Never center table data.
8. **Orphan actions** — Buttons floating without context. Group actions near the content they affect.
9. **Rainbow dashboards** — Limit chart colors to 5-6 max. Use a single hue with varying lightness for related data.
10. **Walls of text** — Break into scannable chunks. Use bullet points, bold key terms, add spacing between paragraphs.
