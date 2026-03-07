# Observability Checklist

Inspired by Sentry's breadcrumb, span, and structured logging patterns.
Adapted for a React 18 + PostHog + Supabase stack that does NOT use Sentry SDK.

## Table of Contents
- Structured Logging
- Breadcrumb Patterns
- PostHog Event Tracking
- Performance Timing
- Edge Function Observability
- What NOT to Log

## Structured Logging

Console output is the primary debugging tool when there is no Sentry.
Make it grep-able, parseable, and contextual.

**Format:** `[Module/Component] Operation description` + context object

```typescript
// Good — structured, searchable
console.error('[useAccounts] Failed to fetch accounts', {
  companyId,
  error: error.message,
  statusCode: error.status,
});

// Bad — unstructured, no context
console.log(error);
console.log('something went wrong');
```

**Log level guide:**
- `console.error` — failures that affect user experience (API errors, missing data)
- `console.warn` — degraded behavior that self-heals (retry succeeded, fallback used)
- `console.info` — significant state transitions (auth change, company switch, feature toggle)
- `console.debug` — verbose debugging (query params, cache hits) — strip before merge or guard with `import.meta.env.DEV`

**Review check:** Are new `console.log` calls structured with a `[Module]` prefix and context object?

## Breadcrumb Patterns

Breadcrumbs create a trail of events leading up to a problem. Without Sentry SDK,
we implement this pattern manually for critical flows.

**Navigation breadcrumbs** — track route changes:
```typescript
// In a route change listener or layout component
useEffect(() => {
  console.info('[Navigation]', {
    type: 'navigation',
    from: previousPath,
    to: location.pathname,
    timestamp: new Date().toISOString(),
  });
}, [location.pathname]);
```

**User action breadcrumbs** — track significant interactions:
```typescript
function handlePublish() {
  console.info('[PostComposer] User initiated publish', {
    type: 'user_action',
    postId,
    platforms: selectedPlatforms,
    timestamp: new Date().toISOString(),
  });
  mutation.mutate(postData);
}
```

**HTTP breadcrumbs** — log API calls that fail:
```typescript
// Already covered by Supabase error handling, but for custom fetches:
console.warn('[API] Request failed', {
  type: 'http',
  url: requestUrl,
  method: 'POST',
  statusCode: response.status,
  duration: `${Date.now() - startTime}ms`,
});
```

**Review check:** Does the PR add new user-facing flows? Are key actions breadcrumbed?

## PostHog Event Tracking

PostHog is our analytics/observability layer. Track events that answer product questions.

**What to track:**
- Feature adoption: "Did users find and use the new feature?"
- Error frequency: "How often does this error path get hit?"
- Performance perception: "How long do users wait for this action?"

**Pattern:**
```typescript
import { posthog } from '@/lib/posthog';

// Feature usage
posthog.capture('post_published', {
  platform: 'twitter',
  has_media: true,
  company_id: companyId,
});

// Error occurrence
posthog.capture('api_error', {
  endpoint: '/accounts',
  status_code: 500,
  error_code: 'FETCH_FAILED',
});

// Performance
posthog.capture('page_load_time', {
  page: 'analytics',
  duration_ms: loadTime,
  company_id: companyId,
});
```

**Review check:** Does the PR add a new feature? Is there a PostHog capture event for its usage?

## Performance Timing

Without Sentry performance monitoring, measure critical operations manually.

**Pattern for Supabase calls:**
```typescript
async function fetchPosts(companyId: string) {
  const start = performance.now();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('company_id', companyId);

  const duration = performance.now() - start;

  if (duration > 2000) {
    console.warn('[Performance] Slow query detected', {
      operation: 'fetchPosts',
      duration: `${duration.toFixed(0)}ms`,
      companyId,
      rowCount: data?.length,
    });
  }

  if (error) throw error;
  return data;
}
```

**Pattern for component render timing:**
```typescript
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (duration > 5000) {
      console.warn('[Performance] Long component lifetime', {
        component: 'AnalyticsDashboard',
        duration: `${duration.toFixed(0)}ms`,
      });
    }
  };
}, []);
```

**Review check:** Does the PR add new Supabase queries? Are slow-query warnings in place for
queries that could return unbounded results?

## Edge Function Observability

Edge functions run in Deno — console output goes to Supabase logs.

**Required logging in every edge function:**
```typescript
// At entry
console.info(`[edge/${functionName}] Request received`, {
  method: req.method,
  requestId,
  companyId,
});

// At exit (success)
console.info(`[edge/${functionName}] Completed`, {
  requestId,
  duration: `${Date.now() - startTime}ms`,
  resultCount: results.length,
});

// At exit (error)
console.error(`[edge/${functionName}] Failed`, {
  requestId,
  error: err.message,
  duration: `${Date.now() - startTime}ms`,
});
```

**Review check:** Does every edge function log entry, exit, and errors with a request ID?

## What NOT to Log

| Do Not Log | Why | Instead |
|---|---|---|
| Auth tokens, API keys | Security breach if logs are exposed | Log `token_present: true/false` |
| Full user objects | PII exposure | Log `userId` only |
| Request/response bodies | May contain PII, bloats logs | Log summary: `{ fields: Object.keys(body) }` |
| Passwords or secrets | Obvious | Never |
| Full Supabase error objects | May contain connection strings | Log `error.message` and `error.code` only |
| High-frequency events in production | Log spam, performance hit | Guard with `import.meta.env.DEV` |
