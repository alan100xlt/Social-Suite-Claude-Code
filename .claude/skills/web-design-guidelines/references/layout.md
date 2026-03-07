# Layout Reference

## Table of Contents
- Grid Systems
- Dashboard Layout Patterns
- Responsive Breakpoints
- Sidebar Patterns
- Content Width
- Fluid Typography
- Common Mistakes

## Grid Systems

### CSS Grid for Dashboard Layouts
```tsx
// Metric cards — auto-fill with minimum width
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <MetricCard />
  <MetricCard />
  <MetricCard />
  <MetricCard />
</div>

// Alternative: auto-fill (adapts to container width)
<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
```

### When to Use Flexbox vs Grid
| Use Case | Layout |
|----------|--------|
| Navigation bar | Flexbox (`flex items-center justify-between`) |
| Metric card row | Grid (`grid grid-cols-4 gap-4`) |
| Card content (vertical stack) | Flexbox (`flex flex-col gap-3`) |
| Form layout | Grid (`grid grid-cols-2 gap-6`) or Flexbox column |
| Dashboard page structure | Grid (sidebar + main) |
| Inline icon + text | Flexbox (`flex items-center gap-2`) |

## Dashboard Layout Patterns

### Standard SaaS Layout
```
┌─────────────────────────────────────────────┐
│ Top bar (h-14 or h-16)                      │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │  Main content                    │
│ (w-64)   │  (flex-1, px-6 py-6)            │
│          │                                  │
│          │  ┌─────┬─────┬─────┬─────┐      │
│          │  │ KPI │ KPI │ KPI │ KPI │      │
│          │  └─────┴─────┴─────┴─────┘      │
│          │                                  │
│          │  ┌──────────────────────┐        │
│          │  │ Chart (full width)   │        │
│          │  └──────────────────────┘        │
│          │                                  │
│          │  ┌──────────┬───────────┐        │
│          │  │ Table    │ Activity  │        │
│          │  │          │ feed      │        │
│          │  └──────────┴───────────┘        │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

```tsx
// Implementation
<div className="flex h-screen">
  <aside className="w-64 border-r bg-card flex-shrink-0">
    <Sidebar />
  </aside>
  <div className="flex-1 flex flex-col overflow-hidden">
    <header className="h-14 border-b bg-card flex items-center px-6">
      <TopBar />
    </header>
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page content */}
      </div>
    </main>
  </div>
</div>
```

### Content Area Spacing
```
Page padding:        px-6 py-6 (24px)
Between sections:    space-y-6 or gap-6 (24px)
Between cards:       gap-4 (16px)
Inside cards:        p-4 or p-6 (16px or 24px)
Card header/body:    space-y-3 or space-y-4
```

## Responsive Breakpoints

### Tailwind Defaults (use these — don't customize)
| Breakpoint | Width | Typical Use |
|------------|-------|-------------|
| `sm` | 640px | Stack → 2 columns for cards |
| `md` | 768px | Show sidebar, 2-col forms |
| `lg` | 1024px | Full sidebar, 3-4 col cards |
| `xl` | 1280px | Max content width kicks in |
| `2xl` | 1536px | Wide monitors, extra columns |

### Mobile-First Patterns
```tsx
// Cards: 1 col → 2 → 4
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"

// Sidebar: hidden on mobile, fixed on desktop
className="hidden lg:flex lg:w-64 lg:flex-col"

// Table: horizontal scroll on mobile
className="overflow-x-auto"

// Stack form fields on mobile, side-by-side on desktop
className="grid grid-cols-1 md:grid-cols-2 gap-4"
```

### What to Hide on Mobile
- Secondary sidebar panels
- Non-essential table columns (use responsive column visibility)
- Chart legends (move to tooltip)
- Multi-column metric rows (stack vertically)

### What NOT to Hide
- Primary navigation (use hamburger/sheet)
- Key metrics (stack, don't hide)
- Action buttons (move to bottom for thumb reach)

## Sidebar Patterns

### Dimensions
```
Expanded:   w-64 (256px) or w-72 (288px)
Collapsed:  w-16 (64px) — icon only
Transition: transition-all duration-200
```

### Sidebar Navigation Structure
```
Logo / Brand (h-14, matching top bar)
─────────────────
Primary nav items
  Dashboard
  Content
  Analytics
  Connections
─────────────────
Secondary nav items
  Settings
  Help
─────────────────
User avatar / account
```

**Rules:**
- Active nav item: `bg-accent text-accent-foreground` or `bg-primary/10 text-primary`
- Hover: `bg-accent/50`
- Icons: 20px (Lucide `size={20}`), consistent stroke width
- Text labels: `text-sm font-medium`
- Vertical padding per item: `py-2 px-3`
- Group separators: `border-t` with `my-2`

## Content Width

| Content Type | Max Width | Tailwind |
|-------------|-----------|----------|
| Dashboard (data-dense) | 1400px | `max-w-7xl` |
| Standard page | 1200px | `max-w-6xl` |
| Settings/forms | 720px | `max-w-3xl` |
| Text-heavy content | 65ch | `max-w-prose` |
| Full-bleed (tables) | 100% | No max-width |

**Rule:** Always center with `mx-auto`. Never let content stretch to full viewport width on wide monitors.

## Fluid Typography

For marketing/landing pages (not dashboards), use `clamp()`:

```css
/* Heading that scales from 24px at 320px viewport to 48px at 1280px */
font-size: clamp(1.5rem, 1rem + 2.5vw, 3rem);

/* Body text: 14px to 16px */
font-size: clamp(0.875rem, 0.8rem + 0.25vw, 1rem);
```

**For dashboards:** Fixed sizes are better. Data-dense UIs need predictable text sizing. Use the type scale from typography.md.

## Common Mistakes

1. **No max-width on content** — Text and cards stretching across 2560px ultrawide monitors. Always set `max-w-7xl mx-auto`.
2. **Fixed heights on containers** — Use `min-h-[value]` instead of `h-[value]` to prevent overflow clipping.
3. **Padding on the wrong element** — Put padding on the content container, not the scroll container. Otherwise padding is lost when scrolling.
4. **Not testing sidebar collapsed state** — Content should reflow when sidebar collapses. Use flex-1, not fixed widths.
5. **Ignoring the 1024px breakpoint** — This is where most SaaS apps transition from mobile to desktop layout. Test thoroughly.
6. **Scroll containers without `overflow-hidden` on parents** — Nested scroll areas need the parent to clip. Missing this causes double scrollbars.
7. **Z-index chaos** — Establish a scale: sidebar=40, dropdown=50, modal=100, toast=200. Document it.
