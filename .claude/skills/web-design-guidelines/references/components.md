# Component Design Patterns

## Table of Contents
- Cards
- Tables
- Forms
- Navigation
- Data Visualization
- Empty States
- Loading States
- Modals and Dialogs

## Cards

### Anatomy of a Dashboard Card
```
┌──────────────────────────────────────┐
│ ○ Title              ⋯ Actions menu │  ← Header: flex justify-between
│ Subtitle / description              │
├──────────────────────────────────────┤  ← Separator (optional)
│                                      │
│  Main content (chart, list, metric)  │  ← Body: flex-1
│                                      │
├──────────────────────────────────────┤  ← Separator (optional)
│ Footer (link, pagination, summary)   │  ← Footer
└──────────────────────────────────────┘
```

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <div>
      <CardTitle className="text-base font-medium">Title</CardTitle>
      <CardDescription className="text-xs text-muted-foreground">
        Subtitle
      </CardDescription>
    </div>
    <DropdownMenu>...</DropdownMenu>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter className="text-xs text-muted-foreground">
    Footer text
  </CardFooter>
</Card>
```

### Card Variants
| Variant | Use | Styling |
|---------|-----|---------|
| Default | General content | `border bg-card` |
| Metric/KPI | Single stat | Compact padding, large number |
| Interactive | Clickable | Add `hover:shadow-md transition-shadow cursor-pointer` |
| Highlighted | Attention needed | `border-primary/50 bg-primary/5` |
| Destructive | Error state | `border-destructive/50 bg-destructive/5` |

### Rules
- Card padding: `p-4` for compact, `p-6` for standard
- Card border-radius: `rounded-lg` (default Shadcn)
- Don't nest cards inside cards — use sections with subtle borders or spacing
- Card titles: `text-base font-medium`, NOT `text-lg font-bold` (too heavy for a card)

## Tables

### Design Rules for Data Tables
1. **Left-align text, right-align numbers.** Always.
2. **Use `tabular-nums`** on all numeric columns.
3. **Stripe or line** — use `divide-y` (line between rows) OR alternating `bg-muted/30` rows. Not both.
4. **Minimum column width** — set `min-w-[120px]` on columns to prevent content compression.
5. **Sticky header** — `sticky top-0 bg-card z-10` for scrollable tables.
6. **Horizontal scroll** — wrap in `overflow-x-auto` for mobile. Never let columns collapse.

### Table Header Styling
```tsx
<thead>
  <tr className="border-b">
    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
      Column Name
    </th>
    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
      Amount
    </th>
  </tr>
</thead>
```

### Row Interactions
```tsx
// Hoverable rows
<tr className="hover:bg-muted/50 transition-colors">

// Clickable rows (add cursor and focus styles)
<tr
  className="hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>

// Selected row
<tr className={cn("transition-colors", selected && "bg-accent")}>
```

### AG Grid Integration Notes
- Use AG Grid Community for all non-trivial tables (sorting, filtering, pagination)
- Shadcn `<Table>` only for tiny static displays (<10 rows, no interaction)
- Theme AG Grid to match the app: match header bg, font family, row height, border color

## Forms

### Layout
```tsx
// Single column form (settings, profile)
<form className="space-y-6 max-w-lg">
  <div className="space-y-2">
    <Label htmlFor="name">Company Name</Label>
    <Input id="name" />
    <p className="text-xs text-muted-foreground">
      This is shown to your team members.
    </p>
  </div>
</form>

// Two column form (wider forms)
<form className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
```

### Rules
- **Always associate labels with inputs** — use `htmlFor` / `id` pairs
- **Helper text below input** — `text-xs text-muted-foreground`, not above
- **Error text** — `text-xs text-destructive`, replaces helper text (don't show both)
- **Required indicator** — `*` after label text, or "(optional)" on optional fields (pick one convention)
- **Button placement** — primary action right-aligned or full-width on mobile
- **Form sections** — group related fields with a heading + description, separated by `border-t pt-6`

### Input Sizing
| Context | Height | Tailwind |
|---------|--------|----------|
| Default | 36px | `h-9` (Shadcn default) |
| Compact (tables, filters) | 32px | `h-8` |
| Large (search, hero input) | 44px | `h-11` |

### Validation Patterns
- Validate on blur for individual fields
- Validate on submit for the full form
- Show inline errors immediately after first submission attempt
- Disable submit button only when submitting (not while invalid — users need to see errors)

## Navigation

### Top Navigation Bar
```
┌─ Logo ─┬─── Nav items ───────────┬── Actions (search, notif, avatar) ─┐
│        │ Dashboard Content Inbox  │  🔍  🔔  👤                       │
└────────┴─────────────────────────┴─────────────────────────────────────┘
```
- Height: `h-14` (56px) or `h-16` (64px)
- Border: `border-b`
- Background: `bg-card` or `bg-background`
- Logo area should match sidebar width if sidebar exists

### Tab Navigation
```tsx
// Underline tabs (for page-level sections)
<nav className="flex border-b">
  <button className={cn(
    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
    active
      ? "border-primary text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
  )}>
    Tab Label
  </button>
</nav>
```

**Rules:**
- Max 5-7 tabs visible at once (Hick's Law)
- On mobile, use a `<Select>` dropdown or horizontal scroll for tabs
- Active tab: `border-primary` underline, not background color change
- Tab content area padding: consistent with page padding

### Breadcrumbs
- Use for 3+ levels of navigation depth
- Separator: `/` or `>` (Lucide `ChevronRight` at 14px)
- Current page: `text-foreground font-medium` (not a link)
- Parent pages: `text-muted-foreground hover:text-foreground`

## Data Visualization

### Chart Containers
```tsx
<Card>
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base font-medium">Chart Title</CardTitle>
      <Select> {/* Time range selector */} </Select>
    </div>
  </CardHeader>
  <CardContent>
    <div className="h-[300px]"> {/* Fixed height container */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>...</LineChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

### Rules
- Minimum chart height: 250-300px
- Always use `ResponsiveContainer` (Recharts) or responsive wrapper
- Chart title in CardHeader, not inside the chart
- Legend: below chart or integrated into title area. Never overlapping chart area.
- Axis labels: muted color, small text (11-12px)
- Grid lines: very subtle (`stroke="#e5e7eb"` light, `stroke="#1e293b"` dark)
- Tooltip: `bg-card border shadow-lg rounded-lg p-3`

### Sparklines (in metric cards)
- Height: 40-60px
- No axis labels, no grid lines, no legend
- Single color, thin stroke (1.5-2px)
- Area fill at 10-20% opacity

## Empty States

Every list, table, and data container needs an empty state.

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-3 mb-4">
    <InboxIcon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-sm font-medium text-foreground mb-1">No messages yet</h3>
  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
    Connect your social accounts to start receiving messages.
  </p>
  <Button size="sm">Connect Account</Button>
</div>
```

**Rules:**
- Center-aligned (this is one of the few valid uses of centered layout)
- Icon + heading + description + CTA
- Keep description under 2 lines
- CTA should directly solve the empty state

## Loading States

### Skeleton Screens (preferred over spinners)
```tsx
// Skeleton for a metric card
<Card>
  <CardContent className="p-4">
    <Skeleton className="h-3 w-24 mb-3" />  {/* Label */}
    <Skeleton className="h-8 w-32 mb-2" />  {/* Value */}
    <Skeleton className="h-3 w-16" />        {/* Trend */}
  </CardContent>
</Card>
```

### When to Use What
| Duration | Pattern |
|----------|---------|
| <200ms | No indicator (perceived as instant) |
| 200ms-1s | Skeleton screen |
| 1-5s | Skeleton + subtle pulse animation |
| 5s+ | Progress bar or status message |
| Background task | Toast notification when complete |

### Rules
- Skeletons should match the layout of real content (same heights, widths, positions)
- Use `animate-pulse` (Tailwind) for skeleton shimmer
- Never show a spinner AND skeleton together
- Place loading state at the component level, not the page level (partial loading)

## Modals and Dialogs

### Sizing
| Content | Width | Tailwind |
|---------|-------|----------|
| Confirmation | 400px | `max-w-md` |
| Form | 500-600px | `max-w-lg` to `max-w-xl` |
| Complex content | 700-800px | `max-w-2xl` to `max-w-3xl` |
| Full preview | 90vw | `max-w-[90vw]` |

### Rules
- Always have a close button (X) in the top right
- Title + optional description in the header
- Actions (Cancel + Primary) in the footer, right-aligned
- Cancel = secondary/ghost button, Primary = primary button
- Destructive actions: red primary button with confirmation text
- Close on Escape key and backdrop click (Radix Dialog handles this)
- Don't nest modals — use a sheet or navigate to a new page instead
- On mobile, full-screen modals (`Sheet` from bottom) work better than centered dialogs
