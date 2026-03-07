# Testing Expectations

Adapted from Sentry's testing philosophy: functional tests over unit tests, user behavior
over implementation details, and permission coverage as a first-class concern.

## Table of Contents
- What Tests to Require Per Change Type
- Functional Testing Philosophy
- React Testing Library Best Practices
- Testing TanStack Query Hooks
- Testing Error and Edge Cases
- Testing Permissions and Access Control
- Demo Data Requirements
- Test Anti-Patterns

## What Tests to Require Per Change Type

| Change Type | Required Tests | Optional Tests |
|---|---|---|
| New page/route | Smoke test (renders without crash), functional test for key interactions | E2E for critical user journeys |
| New component | Functional test covering user interactions | Visual regression if layout-sensitive |
| New hook | Unit test with mock Supabase responses (success + error) | Integration test with real Supabase |
| New edge function | Contract test (request/response shape), unit test for business logic | Integration test against staging |
| Bug fix | Regression test that reproduces the bug before the fix | - |
| Migration | Integration test verifying data access with new schema | - |
| Refactor | Existing tests must still pass, no new tests required | - |
| Config/build change | Smoke test (app builds and renders) | - |

## Functional Testing Philosophy

From Sentry's docs: "Functional tests that simulate how a user would call our APIs
or use our UX are key to preventing regressions and avoiding brittle tests that are
coupled to the internals of the products we ship."

**Prefer use-case coverage over code coverage.**

```tsx
// Bad — tests implementation detail
it('calls setState with the new value', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1); // Testing internal state
});

// Good — tests user-facing behavior
it('increments the displayed count when user clicks the button', async () => {
  render(<Counter />);
  await userEvent.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

## React Testing Library Best Practices

Sourced from Sentry's RTL guide, adapted for our codebase.

**Query priority (most to least preferred):**
1. `getByRole` — accessible, resembles user perception
2. `getByLabelText` — for form elements
3. `getByText` — for non-interactive elements
4. `getByTestId` — last resort only

**Patterns:**
```tsx
// Use screen, not destructured queries
render(<MyComponent />);
const button = screen.getByRole('button', { name: /save/i });

// Use findBy for async elements, not waitFor + getBy
const alert = await screen.findByRole('alert');

// Use queryBy ONLY for asserting non-existence
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

// Use userEvent over fireEvent
await userEvent.click(button);
await userEvent.type(input, 'hello');

// Use case-insensitive regex for text matching
screen.getByText(/save changes/i); // Not 'Save Changes'
```

**Review check:** Does the test use `getByTestId` when `getByRole` would work?
Does it use `fireEvent` when `userEvent` is available?

## Testing TanStack Query Hooks

**Pattern for testing hooks that use Supabase:**
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

it('returns posts for the company', async () => {
  // Mock Supabase response
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ id: '1', title: 'Test Post' }],
        error: null,
      }),
    }),
  });

  const { result } = renderHook(() => usePosts('company-123'), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(1);
});

it('handles Supabase errors', async () => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection failed', code: 'PGRST301' },
      }),
    }),
  });

  const { result } = renderHook(() => usePosts('company-123'), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
});
```

**Review check:** Does every new hook test include both success AND error cases?

## Testing Error and Edge Cases

Sentry requires tests for more than the happy path. For each feature, test:

1. **Happy path** — normal input, expected output
2. **Empty state** — no data, empty arrays, null values
3. **Error state** — API failure, network error, invalid input
4. **Boundary values** — very long strings, zero, negative numbers, max page size
5. **Loading state** — skeleton/spinner renders correctly

```tsx
it('shows empty state when no posts exist', () => {
  render(<PostList posts={[]} />);
  expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
});

it('shows error message when fetch fails', async () => {
  server.use(http.get('/api/posts', () => HttpResponse.error()));
  render(<PostList />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i);
});
```

## Testing Permissions and Access Control

From Sentry: "Tests are also the ideal place to ensure that the changes have
considered permissions and access control logic."

```tsx
it('hides delete button for non-admin users', () => {
  render(<PostCard post={mockPost} userRole="member" />);
  expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
});

it('shows delete button for admin users', () => {
  render(<PostCard post={mockPost} userRole="admin" />);
  expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
});
```

**Review check:** Does the feature have role-based behavior? Are all roles tested?

## Demo Data Requirements

When a new feature uses TanStack Query, the demo company must have mock data.

**Checklist:**
1. Add fixtures to `src/lib/demo/demo-data.ts`
2. Populate query cache in `src/lib/demo/DemoDataProvider.tsx`
3. Verify the feature works with `isDemoCompany('demo-longtale')`

**Review check:** Does the PR add new hooks or query keys? Is demo data provided?

## Test Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| Testing implementation details | Brittle, breaks on refactor | Test user-visible behavior |
| Branching/looping in test code | Bugs in tests are hard to find | Linear test flow, one assertion path |
| Snapshot tests for dynamic content | Meaningless diffs, rubber-stamped updates | Assert specific values |
| `setTimeout` in tests | Flaky, slow | Use `findBy`, `waitFor`, or `waitForElementToBeRemoved` |
| Testing only happy path | Misses the bugs that ship to production | Test error, empty, and boundary cases |
| No mock for Supabase error path | Assumes API never fails | Always mock both `{ data, error: null }` and `{ data: null, error }` |
| Copy-pasting test setup | Hard to maintain, inconsistent | Extract shared setup into factories/fixtures |
