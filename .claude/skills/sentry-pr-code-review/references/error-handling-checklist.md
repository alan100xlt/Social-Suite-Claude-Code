# Error Handling Checklist

Adapted from Sentry's engineering practices for React 18 + Supabase + TanStack Query.

## Table of Contents
- React Error Boundaries
- TanStack Query Error States
- Async/Await Error Handling
- Supabase Client Error Handling
- Edge Function Error Handling
- User-Facing Error Messages
- Anti-Patterns

## React Error Boundaries

Every route-level page and every independent widget should be wrapped in an error boundary.
An unhandled throw in a React component tears down the entire tree above it — error
boundaries prevent a single widget crash from taking out the whole page.

**Where to place boundaries:**
- Route-level: wrap each page component in `App.tsx` or in the page itself
- Widget-level: wrap each analytics chart, each dashboard card, each form section
- Never wrap the entire app in a single boundary (too coarse)

**Pattern:**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function WidgetErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="p-4 border border-destructive rounded">
      <p className="text-sm text-destructive">This widget failed to load.</p>
      <button onClick={resetErrorBoundary} className="text-xs underline">
        Try again
      </button>
    </div>
  );
}

// Usage
<ErrorBoundary FallbackComponent={WidgetErrorFallback}>
  <AnalyticsChart />
</ErrorBoundary>
```

**Review check:** If the PR adds a new page or widget, does it have an error boundary?

## TanStack Query Error States

Every `useQuery` call produces three states: loading, success, and error.
Rendering only the success case is a bug.

**Required pattern:**
```tsx
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) return <Skeleton />;
if (error) return <ErrorAlert message="Failed to load posts" />;
return <PostList posts={data} />;
```

**For mutations:**
```tsx
const mutation = useMutation({
  mutationFn: updatePost,
  onError: (error) => {
    toast.error(`Save failed: ${error.message}`);
  },
});
```

**Review check:** Does every `useQuery` render an error state? Does every `useMutation` handle `onError`?

## Async/Await Error Handling

Bare `await` without try/catch is acceptable ONLY inside TanStack Query's `queryFn`
(because TanStack Query catches and surfaces the error). Everywhere else, wrap in try/catch.

**Good — adds context:**
```tsx
try {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('company_id', companyId);
  if (error) throw error;
  return data;
} catch (err) {
  console.error('[PostService] Failed to fetch posts', { companyId, err });
  throw err; // Re-throw so the caller (query, mutation) can handle it
}
```

**Bad — swallows error:**
```tsx
try {
  await doSomething();
} catch {
  // Silent catch — bug reports will be impossible to diagnose
}
```

**Review check:** Are there any empty catch blocks? Does each catch add context before re-throwing?

## Supabase Client Error Handling

Supabase client methods return `{ data, error }` — they do NOT throw.
Forgetting to check `error` means you silently use `null` data.

**Required pattern:**
```tsx
const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('company_id', companyId);

if (error) {
  console.error('[useAccounts] Supabase error', { error, companyId });
  throw new Error(`Failed to fetch accounts: ${error.message}`);
}
// Now `data` is safe to use
```

**Review check:** Every Supabase `.select()`, `.insert()`, `.update()`, `.delete()`, `.rpc()`
call must check the `error` field before using `data`.

## Edge Function Error Handling

Supabase edge functions should return structured error JSON, never raw text.

**Required pattern:**
```typescript
// In edge function handler
try {
  const result = await processRequest(req);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} catch (err) {
  console.error('[edge/my-function] Error', {
    error: err.message,
    requestId: crypto.randomUUID(),
  });
  return new Response(
    JSON.stringify({ error: err.message, code: 'PROCESSING_FAILED' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  );
}
```

**HTTP status code guide:**
- 400 — bad input (missing fields, invalid format)
- 401 — no auth token or expired
- 403 — valid auth but insufficient permissions
- 404 — resource not found
- 422 — valid structure but business logic rejection
- 500 — unexpected server error

**Review check:** Does the edge function always return JSON? Are status codes appropriate?

## User-Facing Error Messages

Users should never see raw exception text, stack traces, or technical jargon.

**Rules:**
1. Tell the user WHAT happened in plain language
2. Tell the user WHAT TO DO (retry, contact support, check input)
3. Never expose internal IDs, SQL errors, or stack traces

**Good:** "We couldn't save your post. Please check your connection and try again."
**Bad:** "Error: duplicate key value violates unique constraint 'posts_pkey'"

**Review check:** Search the diff for `error.message` passed directly to `toast()` or rendered in JSX.
Those likely expose raw backend errors to users.

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| `catch {}` (empty) | Errors vanish, impossible to debug | Log + re-throw, or handle explicitly |
| `catch (e) { console.log(e) }` | Logged but not handled — UI shows stale/broken state | Add user-facing feedback |
| Checking `data` without checking `error` | Supabase returns `null` data on error | Always check `error` first |
| `toast(error.message)` | Exposes raw backend errors to users | Map to user-friendly message |
| Single error boundary for entire app | One crash takes out everything | Granular boundaries per route/widget |
| `throw new Error("error")` | No context for debugging | Include operation name, IDs, context |
