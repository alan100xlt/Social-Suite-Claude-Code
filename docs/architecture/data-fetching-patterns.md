# Data Fetching Patterns

Engineering reference for how the frontend fetches and mutates data. All data flows through TanStack Query v5 hooks that wrap Supabase client calls.

## Supabase Client

**File:** `src/integrations/supabase/client.ts`

A single shared client instance, typed with the auto-generated `Database` type:

```typescript
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  }
);
```

Never use `process.env.*`. Always `import.meta.env.VITE_*`.

## Query Conventions

All hooks live in `src/hooks/` (~45+ files). They follow a consistent pattern.

### Basic Query Hook

Example from `src/hooks/useRssFeeds.ts`:

```typescript
export function useRssFeeds() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['rss-feeds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('rss_feeds')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RssFeed[];
    },
    enabled: !!company?.id,
  });
}
```

### Rules

1. **company_id in every query.** All user-facing data is scoped by company. The company comes from `useCompany()` or `useSelectedCompany()`. RLS enforces this server-side, but the client filters too for correct cache keying.

2. **Query keys include the company ID.** This ensures cache isolation between companies: `['rss-feeds', company?.id]`, `['inbox-conversations', selectedCompanyId, filters]`.

3. **`enabled` guards.** Queries are disabled until dependencies are available: `enabled: !!company?.id`, `enabled: !!selectedCompanyId && !!conversationId`.

4. **Error handling via throw.** `if (error) throw error` lets TanStack Query handle the error state. Never silently swallow Supabase errors.

### Demo Data Guard

For the built-in demo company, hooks either:
- Return early with static demo data (`src/lib/demo/demo-data.ts`)
- Rely on the `DemoDataProvider` pre-populating the query cache

Example from `src/hooks/useInboxConversations.ts`:

```typescript
const isDemo = isDemoCompany(selectedCompanyId);

return useQuery({
  queryKey: ['inbox-conversations', selectedCompanyId, filters],
  queryFn: async () => {
    if (isDemo) return DEMO_INBOX_CONVERSATIONS;
    // ... real Supabase call
  },
  staleTime: isDemo ? Infinity : 0,
  refetchInterval: isDemo ? false : 30000,
});
```

### staleTime and refetchInterval

Most hooks use the defaults (staleTime: 0). Real-time-ish data like inbox uses `refetchInterval: 30000` (30 seconds). Demo data uses `staleTime: Infinity` to prevent refetches.

## Mutation Conventions

Mutations follow a standard pattern. Example from `src/hooks/useRssFeeds.ts`:

```typescript
export function useCreateRssFeed() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      if (!company?.id) throw new Error('No company found');
      const { data, error } = await supabase
        .from('rss_feeds')
        .insert({ company_id: company.id, name, url, auto_publish: false })
        .select()
        .single();
      if (error) throw error;
      return data as RssFeed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast({ title: 'Feed Added', description: '...' });
    },
    onError: (error) => {
      toast({ title: 'Failed to Add Feed', description: error.message, variant: 'destructive' });
    },
  });
}
```

### Rules

1. **Invalidate, don't update.** After a mutation, call `queryClient.invalidateQueries()` to refetch from the server. We do not use optimistic updates anywhere in the codebase currently.

2. **Toast on success and error.** Using the Shadcn toast system via `useToast()`.

3. **company_id on inserts.** Always include `company_id: company.id` when inserting rows.

4. **Broad invalidation keys.** `queryClient.invalidateQueries({ queryKey: ['rss-feeds'] })` invalidates all queries starting with `'rss-feeds'`, regardless of company ID suffix. This is intentional -- it keeps things simple.

## Content Workflow Mutations

The post drafts hook (`src/hooks/usePostDrafts.ts`) has the most complex mutations. It uses a state machine pattern for content status transitions:

```typescript
export function useSubmitForApproval() {
  return useMutation({
    mutationFn: async ({ draftId, currentStatus, reviewerId }) => {
      if (!canTransition(currentStatus, 'awaiting_approval')) {
        throw new Error(`Cannot submit for approval from status "${currentStatus}"`);
      }
      // ... update status, log activity, notify reviewer
    },
  });
}
```

The `canTransition()` function from `src/lib/content-workflow.ts` prevents invalid status transitions (e.g., can't approve a draft that's already published).

Side effects in mutations:
- `logContentActivity()` writes to `inbox_activity_log` for audit trails
- `notifyWorkflowEvent()` calls the `send-in-app-notification` edge function
- `sendNotification()` calls the notification API for assignment notifications

## Query Key Catalog

Common query key patterns across the codebase:

| Key Pattern | Hook | Data |
|-------------|------|------|
| `['rss-feeds', companyId]` | `useRssFeeds` | RSS feed configurations |
| `['rss-feed-items', feedId]` | `useRssFeedItems` | Items from a specific feed |
| `['post-drafts', companyId]` | `usePostDrafts` | Draft posts |
| `['post-draft', draftId]` | `usePostDraft` | Single draft |
| `['inbox-conversations', companyId, filters]` | `useInboxConversations` | Inbox conversations |
| `['inbox-conversation', companyId, id]` | `useInboxConversation` | Single conversation |
| `['analytics-stats', companyId]` | `useAnalyticsStats` | Analytics overview |
| `['top-posts', companyId]` | `useTopPerformingPosts` | Top posts by engagement |
| `['account-growth', companyId]` | `useAccountGrowth` | Follower growth data |

## Edge Function Invocations

Some hooks invoke edge functions instead of querying tables directly:

```typescript
const { data } = await supabase.functions.invoke('generate-social-post', {
  body: { mode: 'strategy', title, platforms },
});
```

This is used when the operation requires server-side logic (API keys, AI calls, etc.).

## API Abstraction Layer

The inbox has an additional API layer (`src/lib/api/inbox.ts`) that wraps Supabase calls into a service object:

```typescript
const result = await inboxApi.conversations.list(selectedCompanyId, filters);
if (!result.success) throw new Error(result.error);
```

This exists because inbox operations involve complex joins and cross-outlet queries. Most other features call Supabase directly from hooks.

## Common Pitfalls

1. **Missing company_id filter.** Every query MUST filter by company_id. RLS enforces this, but without it the query returns empty results (not an error), which is confusing to debug.

2. **Using `snapshot_date` on post analytics.** NEVER filter `post_analytics_snapshots` by `snapshot_date`. Use `published_at`. See `docs/architecture/decisions/adr-002-analytics-dates.md`.

3. **Type casting with `as any`.** Some hooks use `as any` when the auto-generated types don't include newly created tables (e.g., `post_drafts`). This is a code smell but harmless until types are regenerated.

4. **Fire-and-forget side effects.** Notification calls in `onSuccess` are not awaited and errors are caught silently. This is intentional -- notifications should never block the main operation.
