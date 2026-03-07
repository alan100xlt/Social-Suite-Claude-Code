# Platform Metrics Matrix Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Connections page metrics matrix to clearly separate connected platforms (live data) from unconnected platforms (availability indicators + Connect CTA).

**Architecture:** Drop AG Grid in favor of a native HTML table rendered by React. AG Grid's row model doesn't support divider rows or per-row click behavior differences cleanly. A native table with Tailwind styling matches the approved prototype exactly and is simpler to maintain. The component stays reusable — `mode="analytics"` still renders only connected platforms in AG Grid style.

**Tech Stack:** React, Tailwind CSS, Lucide icons, react-icons/fa6, Shadcn Tooltip

**Design Reference:** `prototype-metrics-matrix.html` (v3 — with Connect button next to name, greyed-out icons)

---

## Design Checklist

**Source:** `prototype-metrics-matrix.html`

### Section Header
- [ ] Title: "Metrics by Platform" (`text-xl font-semibold`)
- [ ] Subtitle: "Live engagement data for connected platforms. Connect more to unlock tracking." (`text-sm text-muted-foreground`)

### Legend Row
- [ ] 4 items in a horizontal flex row above the table
- [ ] Green dot + "Connected (live data)"
- [ ] Green checkmark + "Available if connected"
- [ ] Amber warning triangle + "Partial support"
- [ ] Gray dash + "Not available"
- [ ] Text: `text-xs text-muted-foreground`, gap-6

### Table Container
- [ ] White background, rounded-xl, border border-border, overflow-hidden, shadow-sm

### Column Headers
- [ ] "Platform" left-aligned, w-[200px]
- [ ] 8 metric columns center-aligned: Impressions, Reach, Likes, Comments, Shares, Saves, Clicks, Views
- [ ] Last column: empty, w-[50px] (for chevron)
- [ ] Headers: `text-xs font-semibold text-muted-foreground uppercase tracking-wider`

### Connected Rows (top group)
- [ ] Green left border: `border-left: 3px solid #22c55e`
- [ ] Platform icon: 32px rounded-lg, brand color background, white initials (full opacity)
- [ ] Platform name: `text-sm font-medium text-foreground`
- [ ] Green dot (8px) next to name indicating connected status
- [ ] Metric values: monospace font (`font-mono`), `text-sm font-medium`, formatted (45.2K, 1.8K)
- [ ] Null metrics: gray dash icon (`text-muted-foreground/30`)
- [ ] Chevron icon in last column (right-pointing, rotates 90deg on expand)
- [ ] Row hover: light green tint (`hover:bg-emerald-50/50`)
- [ ] Row is clickable — toggles sparkline expansion
- [ ] Alternating row backgrounds (subtle)

### Sparkline Expansion (connected rows only)
- [ ] Full-width row below clicked row, green left border continues
- [ ] Background: `bg-emerald-50/40`
- [ ] Horizontal flex of sparkline cards, one per available metric
- [ ] Each card: metric label (uppercase, 11px), SVG sparkline (100x28), current value below
- [ ] "30-day trend" label right-aligned
- [ ] Animated open/close (max-height transition, 0.3s)

### Divider Row
- [ ] Full-width colspan row between connected and unconnected groups
- [ ] "NOT YET CONNECTED" label: `text-xs font-semibold text-muted-foreground uppercase tracking-wider`
- [ ] Horizontal rule extending to fill remaining width
- [ ] Platform count on right: "8 platforms" (dynamic)
- [ ] Background: `bg-muted`, top/bottom borders

### Unconnected Rows (bottom group)
- [ ] NO green left border
- [ ] Platform icon: 32px rounded-lg, **gray background (#d1d5db)**, **gray text (#6b7280)** — NOT brand colors
- [ ] Platform name: `text-sm font-medium text-muted-foreground` (dimmed)
- [ ] "Connect" button inline next to platform name (not in last column)
- [ ] Connect button: `text-xs font-medium`, outline style, 6px border-radius, `border-gray-300`
- [ ] Connect button hover: green border, green text, light green background
- [ ] Metric cells: availability indicators only (no numbers)
  - Available: green checkmark (`CheckCircle2`, `text-emerald-500`)
  - Partial: amber warning triangle (`AlertTriangle`, `text-amber-500`, `cursor-help`)
  - Unavailable: faint gray dash (`Minus`, `text-muted-foreground/20`)
- [ ] Partial-support cells have Shadcn Tooltip with note text on hover
- [ ] Rows are NOT clickable, no cursor pointer, no hover highlight
- [ ] Last column: empty (no chevron)

### Interactions
- [ ] Click connected row -> expand/collapse sparkline panel
- [ ] Only one sparkline panel open at a time (accordion behavior)
- [ ] Click "Connect" button -> calls `onConnect(platform)` callback
- [ ] Tooltips on partial-availability cells

---

## Phase 1: Rewrite PlatformMetricsMatrix for Connections Mode

### Task 1: Update tests for new component props

**Files:**
- Modify: `src/test/platform-metrics.test.ts`

**Step 1:** Add a test for the new `onConnect` callback prop shape:

```typescript
// Add to getCellDisplayState describe block:
it('connected platforms sort before unconnected', () => {
  const connected: Platform[] = ['twitter', 'instagram'];
  const all: Platform[] = ['youtube', 'twitter', 'instagram', 'reddit'];
  const sorted = [...all].sort((a, b) => {
    const aConn = connected.includes(a) ? 0 : 1;
    const bConn = connected.includes(b) ? 0 : 1;
    return aConn - bConn;
  });
  expect(sorted[0]).toBe('twitter');
  expect(sorted[1]).toBe('instagram');
  expect(sorted[2]).toBe('youtube');
  expect(sorted[3]).toBe('reddit');
});
```

**Step 2: Verify**
Run: `npx vitest run src/test/platform-metrics.test.ts`
Expected: All tests pass including the new one

**Step 3: Commit**
`git commit -m "test: add sort order test for connected platforms"`

---

### Task 2: Rewrite PlatformMetricsMatrix component

**Files:**
- Modify: `src/components/shared/PlatformMetricsMatrix.tsx`

**Step 1:** Replace the entire component with a native table implementation. The component must:

- Accept new prop: `onConnect?: (platform: Platform) => void`
- In `connections` mode: render a native `<table>` with two groups separated by a divider row
- In `analytics` mode: keep existing AG Grid behavior (only connected platforms, no divider)
- Connected rows: sorted to top, green left border, live metric values in monospace, chevron, clickable for sparkline
- Divider row: "NOT YET CONNECTED" + count
- Unconnected rows: greyed-out icons, availability indicators, Connect button next to name, not clickable
- Legend row above the table (connections mode only)

Key implementation details:
- Sort `ALL_PLATFORMS` so connected come first
- Use `useState` for `expandedPlatform` (accordion — only one open)
- Connected row click toggles sparkline (reuse `PlatformSparklineDetail`)
- Unconnected row has no click handler, no hover state
- Platform icon for unconnected: `bg-gray-300 text-gray-500` instead of brand colors
- Connect button calls `onConnect?.(platform)` with `e.stopPropagation()`
- Metric cells use existing `getCellDisplayState` + `PLATFORM_METRICS` for tooltips
- Shadcn `<Tooltip>` on partial-availability cells

The full component code follows the prototype's structure with these React adaptations:
- SVG icons from Lucide (`CheckCircle2`, `AlertTriangle`, `Minus`, `ChevronRight`)
- `formatNumber()` from `data-grid-cells.tsx` for metric values
- `extendedPlatformMeta` for platform icons (existing code)
- Tooltip from Shadcn for partial-support notes
- `useTheme()` for dark mode awareness on backgrounds

**Step 2: Verify**
Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**
`git commit -m "feat: rewrite PlatformMetricsMatrix with connected/unconnected groups"`

---

### Task 3: Update Connections page to pass onConnect

**Files:**
- Modify: `src/pages/Connections.tsx`

**Step 1:** Update the `PlatformMetricsMatrix` usage to pass `onConnect`:

```tsx
<PlatformMetricsMatrix
  mode="connections"
  connectedPlatforms={(accounts ?? []).map((a) => a.platform)}
  onConnect={handleConnect}
/>
```

Also update the section header and add subtitle:

```tsx
{/* Metrics by Platform */}
<div className="mt-8">
  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
    Metrics by Platform
  </h2>
  <p className="text-sm text-muted-foreground mb-4">
    Live engagement data for connected platforms. Connect more to unlock tracking.
  </p>
  <PlatformMetricsMatrix
    mode="connections"
    connectedPlatforms={(accounts ?? []).map((a) => a.platform)}
    onConnect={handleConnect}
  />
</div>
```

**Step 2: Verify**
Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**
`git commit -m "feat: wire Connect button in metrics matrix to OAuth flow"`

---

### Task 4: Update smoke tests

**Files:**
- Modify: `src/tests/smoke/platform-metrics-matrix.test.ts`

**Step 1:** Verify existing smoke tests still pass (they test imports, not rendering):

Run: `npx vitest run src/tests/smoke/platform-metrics-matrix.test.ts`
Expected: All 4 tests pass

**Step 2: Commit** (only if changes were needed)

---

### Task 5: Production build + full test suite

**Step 1:** Run type check:
`npx tsc --noEmit`
Expected: Clean

**Step 2:** Run all unit tests:
`npx vitest run src/test/platform-metrics.test.ts src/test/usePlatformMetricsMatrix.test.ts src/test/usePlatformSparklines.test.ts`
Expected: All pass

**Step 3:** Run build:
`npm run build`
Expected: Build succeeds

**Step 4: Commit**
`git commit -m "chore: verify platform metrics matrix redesign passes all checks"`

---

### Task 6: Visual QA Against Prototype

**This task is NOT optional. Do not skip. Do not mark the phase complete without this.**

**Step 1: Open prototype and running app side-by-side**
- Prototype: `prototype-metrics-matrix.html` (open in browser)
- App: `http://localhost:8080/app/connections`

**Step 2: Walk through every Design Checklist item**
For each unchecked item, either:
- Check it off (matches prototype)
- Fix it (doesn't match — make the code change now)
- Mark `[DEFERRED: reason]` (intentional deviation with justification)

**Step 3: Take a screenshot of the running app**
Save to project root as `metrics-matrix-visual-qa.png`

**Step 4: Document deviations**
If any items are deferred, add a `## Design Deviations` section to this plan with:
- What was deferred
- Why
- When it will be addressed

**Step 5: Commit**
`git commit -m "chore: visual QA pass for platform metrics matrix redesign"`

---

## Test Architecture

| Phase | Test Layer | What to Test | Pure Logic to Extract | Source Import |
|-------|-----------|-------------|----------------------|--------------|
| Phase 1 | L4 Unit | Platform sort order (connected first) | Already in `src/lib/platform-metrics.ts` | `import { getCellDisplayState } from '@/lib/platform-metrics'` |
| Phase 1 | L4 Unit | Cell display state logic | Already extracted | `import { getCellDisplayState } from '@/lib/platform-metrics'` |
| Phase 1 | L3 Smoke | Component imports successfully | N/A | `import { PlatformMetricsMatrix } from '@/components/shared/PlatformMetricsMatrix'` |
| Phase 1 | L5 E2E | Connections page shows matrix with two groups, Connect buttons visible | N/A | Playwright navigation |

No new test files needed — existing tests cover the pure logic. The visual redesign is verified via Visual QA (Task 6).
