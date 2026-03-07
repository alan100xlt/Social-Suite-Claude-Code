# Performance Checklist

Inspired by Sentry's performance monitoring, transaction tracing, and web vitals tracking.
Adapted for React 18 + Vite + TanStack Query + Supabase.

## Table of Contents
- Web Vitals
- Bundle Size
- TanStack Query Efficiency
- Supabase Query Performance
- Rendering Performance
- Lazy Loading
- Performance Anti-Patterns

## Web Vitals

Core Web Vitals directly affect user experience. Monitor these in every PR:

| Metric | Target | What Hurts It |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Large images, render-blocking JS, slow API calls |
| FID (First Input Delay) | < 100ms | Heavy JS execution on main thread, large bundles |
| CLS (Cumulative Layout Shift) | < 0.1 | Images without dimensions, dynamic content insertion, font loading |
| INP (Interaction to Next Paint) | < 200ms | Expensive event handlers, synchronous state updates |

**Review checks:**
- Does the PR add images? Do they have explicit `width`/`height` or use `aspect-ratio`?
- Does the PR add content that loads asynchronously? Is there a skeleton/placeholder to prevent layout shift?
- Does the PR add a click handler that does expensive computation? Should it be deferred or debounced?

## Bundle Size

The app is already ~4MB. Every new dependency matters.

**Before adding a dependency:**
1. Check bundle size: `npx bundlephobia <package-name>` or check bundlephobia.com
2. Consider if tree-shaking works (ESM exports only)
3. Import specific modules, never the full library: `import debounce from 'lodash/debounce'`

**Review checks:**
- Does the PR add a new `package.json` dependency? What's its gzipped size?
- Is the import tree-shakeable, or does it pull in the entire library?
- Could the functionality be achieved with existing dependencies or a few lines of custom code?

**Known heavy imports to watch:**
- `lodash` (full) — import individual functions instead
- `moment` — use `date-fns` or native `Intl.DateTimeFormat`
- `@nivo/*` — already present, but each chart type adds ~50-100KB
- Any charting library beyond Recharts/Nivo

## TanStack Query Efficiency

TanStack Query is powerful but easy to misuse.

**Stable query keys:**
```tsx
// Bad — new object reference every render, causes infinite refetching
useQuery({
  queryKey: ['posts', { filters }], // if `filters` is recreated each render
  queryFn: fetchPosts,
});

// Good — stable primitive values
useQuery({
  queryKey: ['posts', companyId, statusFilter, page],
  queryFn: fetchPosts,
});
```

**Enabled guards:**
```tsx
// Bad — fires with undefined companyId, returns error
useQuery({
  queryKey: ['posts', companyId],
  queryFn: () => fetchPosts(companyId!),
});

// Good — waits until companyId is available
useQuery({
  queryKey: ['posts', companyId],
  queryFn: () => fetchPosts(companyId!),
  enabled: !!companyId,
});
```

**Stale time tuning:**
- Data that rarely changes (company settings, user profile): `staleTime: 5 * 60 * 1000` (5 min)
- Data that changes often (posts, analytics): `staleTime: 30 * 1000` (30 sec)
- Data that must be fresh (notifications, inbox): `staleTime: 0` (default)

**Review checks:**
- Does every query with a dependency have `enabled: !!dependency`?
- Are query keys using stable values (not object references)?
- Is `staleTime` set appropriately for the data's change frequency?

## Supabase Query Performance

**Index usage:**
- Filter columns (`WHERE`, `eq`, `in`) should be indexed
- Sort columns (`ORDER BY`) should be indexed
- Compound filters need compound indexes

**Query patterns to flag:**
```tsx
// Bad — N+1: fetching related data in a loop
const posts = await fetchPosts();
for (const post of posts) {
  const analytics = await fetchAnalytics(post.id); // N queries!
}

// Good — batch fetch with join or IN clause
const { data } = await supabase
  .from('posts')
  .select('*, post_analytics_snapshots(*)')
  .eq('company_id', companyId);
```

**Pagination:**
```tsx
// Bad — fetches all rows
const { data } = await supabase.from('posts').select('*');

// Good — paginated
const { data } = await supabase
  .from('posts')
  .select('*', { count: 'exact' })
  .range(offset, offset + pageSize - 1)
  .order('created_at', { ascending: false });
```

**Review checks:**
- Does the query fetch unbounded results? Add `.limit()` or `.range()`.
- Is there a loop that makes individual Supabase calls? Batch with joins or `.in()`.
- Are filter columns indexed?

## Rendering Performance

**Unnecessary re-renders:**
```tsx
// Bad — inline object creates new reference every render
<Chart options={{ color: 'blue' }} />

// Good — stable reference
const chartOptions = useMemo(() => ({ color: 'blue' }), []);
<Chart options={chartOptions} />
```

**When to memoize:**
- `useMemo`: expensive computations (sorting large arrays, complex transformations)
- `useCallback`: callbacks passed to memoized children or used in dependency arrays
- `React.memo`: components that receive the same props frequently but parent re-renders often

**When NOT to memoize:**
- Simple values (strings, numbers, booleans)
- Components that always receive different props
- Premature optimization without measuring

**Review checks:**
- Does the PR pass new object/array literals as props to child components?
- Are there expensive computations inside render that should be in `useMemo`?
- Is there evidence of measured performance impact (not premature optimization)?

## Lazy Loading

Current state: most routes are eagerly imported (~4MB bundle).
New routes should use `React.lazy()`.

**Pattern:**
```tsx
// In App.tsx or route definitions
const AnalyticsV4 = React.lazy(() => import('./pages/AnalyticsV4'));

// In route
<Route
  path="/app/analytics-v4"
  element={
    <Suspense fallback={<PageSkeleton />}>
      <AnalyticsV4 />
    </Suspense>
  }
/>
```

**Review check:** Does the PR add a new route? Is it lazy-loaded?

## Performance Anti-Patterns

| Anti-Pattern | Impact | Fix |
|---|---|---|
| Fetching in useEffect without cleanup | Race conditions, stale data | Use TanStack Query |
| `JSON.parse(JSON.stringify(obj))` for deep clone | Slow for large objects, loses types | Use `structuredClone()` or spread |
| Unthrottled scroll/resize handlers | Jank, high CPU | `useThrottle` or `requestAnimationFrame` |
| Storing derived state | Extra renders, stale data | Compute during render or `useMemo` |
| Re-fetching on every render | API spam, slow UI | Add `staleTime`, use `enabled` guard |
| Loading all chart data upfront | Slow initial load | Paginate or lazy-load chart data |
| Synchronous `localStorage` in render | Blocks main thread | Read once in useEffect or context init |
