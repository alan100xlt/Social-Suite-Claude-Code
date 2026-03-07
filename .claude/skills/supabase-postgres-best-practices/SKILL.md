---
name: supabase-postgres-best-practices
description: |
  Enforce Supabase Postgres best practices for indexing, RLS policy design, query
  optimization, connection pooling, and migration safety. Use when: (1) writing or
  reviewing SQL migrations, (2) creating or modifying RLS policies, (3) adding indexes,
  (4) debugging slow queries, (5) reviewing connection pooling config, (6) ensuring
  zero-downtime schema changes. Activates on any database/migration/RLS/query work.
---

## 1. Indexing Best Practices

### Index Types — When to Use Each

| Type | Use When | Example |
|------|----------|---------|
| **B-tree** (default) | Equality, range, sorting, `LIKE 'prefix%'` | `create index on orders (created_at)` |
| **BRIN** | Monotonically increasing columns on append-only tables (10x smaller than B-tree) | `create index on orders using brin(created_at)` |
| **GIN** | JSONB containment (`@>`), array overlap (`&&`), full-text search (`@@`) | `create index on posts using gin(metadata jsonb_path_ops)` |
| **GiST** | PostGIS geometry, range types, full-text search (with ranking) | `create index on locations using gist(geom)` |
| **Hash** | Equality-only on large text values (rare — B-tree is usually better) | `create index on sessions using hash(token)` |

### Composite Indexes

Put high-selectivity columns first. Column order matters for leftmost-prefix matching.

```sql
-- Good: filters on company_id first (multi-tenant), then status
create index idx_posts_company_status on posts (company_id, status);

-- This index serves queries filtering on:
--   (company_id)
--   (company_id, status)
-- But NOT queries filtering only on (status)
```

### Partial Indexes

Use when queries consistently filter a subset of rows. Smaller index = faster scans + less storage.

```sql
-- Only index active subscriptions (skip 90% of rows)
create index idx_active_subs on subscriptions (user_id)
where status = 'active';

-- Only index non-deleted posts
create index idx_visible_posts on posts (company_id, published_at)
where deleted_at is null;
```

### Index Rules

1. **Always index foreign keys** — Supabase advisor lint `0001` flags this. Unindexed FKs cause sequential scans on JOINs and cascade deletes.
2. **Use `create index concurrently`** for production tables — avoids write locks. Cannot run inside a transaction.
3. **Remove unused indexes** — check with `pg_stat_user_indexes` where `idx_scan = 0`. Each unused index slows writes.
4. **Remove duplicate indexes** — advisor lint `0009` flags overlapping indexes.
5. **Run `analyze <table>` after bulk inserts** — stale statistics cause the planner to ignore indexes.
6. **Use `reindex index concurrently`** to rebuild stale indexes without locking.

### Supabase Index Advisor

Enable `index_advisor` extension for automatic recommendations:
```sql
-- In dashboard: Database > Query Performance > Indexes tab
-- Or programmatically:
select * from index_advisor('select * from orders where customer_id = $1');
```

Use `hypopg` extension to test hypothetical indexes without creating them.

## 2. RLS Policy Design

### Core Patterns

```sql
-- Always enable RLS on public tables
alter table posts enable row level security;

-- Multi-tenant isolation (most common pattern)
create policy "tenant_isolation" on posts
  for all to authenticated
  using ((select auth.uid()) = user_id);

-- Company-scoped isolation (this project's pattern)
create policy "company_isolation" on posts
  for all to authenticated
  using (company_id in (
    select company_id from company_members
    where user_id = (select auth.uid())
  ));
```

### Performance Rules (CRITICAL)

1. **Wrap `auth.uid()` in a subselect** — `(select auth.uid())` is evaluated once per query. Without `select`, it evaluates per-row.
   ```sql
   -- GOOD: evaluated once
   using ((select auth.uid()) = user_id)

   -- BAD: evaluated per row
   using (auth.uid() = user_id)
   ```

2. **Avoid `auth.jwt()` subqueries in hot paths** — JWT decoding per-row is expensive. Cache claims in a helper function or use `(select auth.jwt()->>'claim')`.

3. **Avoid `IN (select ...)` without indexes** — the subquery in `company_id in (select company_id from company_members where user_id = ...)` MUST have an index on `company_members(user_id)`.

4. **Avoid `exists` with unindexed subqueries** — same principle.

5. **Do NOT reference `auth.users` in RLS policies** — advisor lint `0002`. Reference `auth.uid()` instead. Exposing `auth.users` is a security risk.

6. **Do NOT reference `raw_user_meta_data`** — advisor lint `0015`. User metadata is mutable and not trustworthy for authorization.

### Policy Composition

- Multiple `PERMISSIVE` policies on the same table/operation are ORed together (any one passing = access granted). Advisor lint `0006` warns when this creates overly broad access.
- `RESTRICTIVE` policies are ANDed (all must pass). Use for cross-cutting constraints like tenant isolation.

```sql
-- Restrictive: always enforced (AND)
create policy "must_be_in_company" on posts
  as restrictive for all to authenticated
  using (company_id in (
    select company_id from company_members
    where user_id = (select auth.uid())
  ));

-- Permissive: any of these grant access (OR)
create policy "owner_crud" on posts
  for all to authenticated
  using ((select auth.uid()) = created_by);

create policy "admin_read" on posts
  for select to authenticated
  using (exists (
    select 1 from company_members
    where user_id = (select auth.uid())
    and role = 'admin'
    and company_id = posts.company_id
  ));
```

### RLS Checklist for New Tables

- [ ] `alter table <name> enable row level security;`
- [ ] At least one policy exists (lint `0008` flags RLS enabled with no policies)
- [ ] `company_id` column exists and is indexed for multi-tenant tables
- [ ] Policy uses `(select auth.uid())` not `auth.uid()`
- [ ] Subquery columns in policies are indexed
- [ ] No direct references to `auth.users` or `raw_user_meta_data`

## 3. Query Optimization

### Using EXPLAIN ANALYZE

```sql
-- Basic plan (estimates only)
explain select * from posts where company_id = 'abc';

-- Actual execution (runs the query)
explain (analyze, buffers, format text)
  select * from posts where company_id = 'abc';
```

**Via Supabase client:**
```typescript
const { data } = await supabase.from('posts').select().explain();
```
Requires `pgrst.db_plan_enabled = true` on `authenticator` role (disable in production).

### Reading EXPLAIN Output

| Node | Meaning | Action |
|------|---------|--------|
| `Seq Scan` | Full table scan | Add index on filter columns |
| `Index Scan` | Index lookup + heap fetch | Good for selective queries |
| `Index Only Scan` | Index-only (no heap) | Best case — covering index |
| `Bitmap Index Scan` | Multiple index ranges combined | OK for moderate selectivity |
| `Nested Loop` | Per-row join | Fine for small outer sets; problematic at scale |
| `Hash Join` | Hash-based join | Good for large equi-joins |

### Common Anti-Patterns

1. **`SELECT *` when you need 2 columns** — fetches unnecessary data, prevents index-only scans.
2. **Missing `LIMIT` on unbounded queries** — always paginate via `.range()` or `limit`.
3. **`OR` conditions on different columns** — prevents index use. Rewrite as `UNION ALL`.
4. **Functions on indexed columns** — `where lower(email) = 'x'` cannot use a B-tree index on `email`. Create a functional index: `create index on users (lower(email))`.
5. **`NOT IN (subquery)`** — use `NOT EXISTS` instead (handles NULLs correctly and performs better).
6. **`count(*)` on large tables** — Postgres counts all rows. Use `pg_class.reltuples` for estimates.
7. **Implicit type casts** — `where id = '123'` when `id` is integer forces a cast on every row.

### pg_stat_statements

Enable for slow query discovery:
```sql
-- Find top 10 slowest queries by total time
select query, calls, mean_exec_time, total_exec_time
from pg_stat_statements
order by total_exec_time desc
limit 10;
```

## 4. Connection Management

### Supavisor (Supabase's Connection Pooler)

Supabase uses **Supavisor** (not pgbouncer) for connection pooling. Two modes:

| Mode | Port | Use When |
|------|------|----------|
| **Transaction** (default) | 6543 | Most applications. Connection returned after each transaction. |
| **Session** | 5432 (direct) | Prepared statements, `LISTEN/NOTIFY`, advisory locks, temp tables. |

### Pool Size Guidelines

- If heavily using PostgREST (Data API): keep pool size at **40%** of max connections
- Otherwise: up to **80%** of max connections
- Always leave room for Auth, Realtime, and admin connections

### Connection Strings

```
# Pooled (transaction mode) — use for most app connections
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Direct — use for migrations, LISTEN/NOTIFY, prepared statements
postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

### Monitoring Connections

```sql
-- Live connection count by role
select usename, state, count(*)
from pg_stat_activity
group by usename, state
order by count desc;
```

### Connection Roles (for debugging)

| Role | Source |
|------|--------|
| `authenticator` | PostgREST (Data API) |
| `supabase_auth_admin` | Auth service |
| `supabase_storage_admin` | Storage service |
| `supabase_admin` | Supabase internal + Realtime |
| `postgres` | Dashboard, external tools, migrations |

## 5. Migration Safety

### Zero-Downtime Rules

1. **Never `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a default** — locks entire table for rewrite on older Postgres. In PG 11+ with a constant default, this is instant.
   ```sql
   -- Safe (PG 11+): metadata stored, no rewrite
   alter table posts add column archived boolean not null default false;

   -- Dangerous: volatile default causes rewrite
   alter table posts add column created_at timestamptz not null default now();
   -- Fix: add nullable, backfill, then set not null
   ```

2. **Never `ALTER TABLE ... ALTER COLUMN TYPE`** on large tables — full table rewrite + exclusive lock. Instead: add new column, backfill, swap.

3. **Always use `CREATE INDEX CONCURRENTLY`** — cannot run inside a transaction block. Supabase migrations run in a transaction by default, so:
   ```sql
   -- In migration file, add at the top:
   -- supabase migration files auto-wrap in transactions
   -- For concurrent index, use a separate migration or:
   set local statement_timeout = '0';
   create index concurrently if not exists idx_name on table_name (column);
   ```
   Note: `concurrently` cannot run inside `BEGIN/COMMIT`. If your migration tool wraps in a transaction, create the index in a separate migration file.

4. **Never `DROP COLUMN` without checking dependencies** — views, functions, policies, and triggers may reference it.

5. **Backfill in batches** — avoid long-running transactions that hold locks:
   ```sql
   -- Backfill 10k rows at a time
   update posts set new_col = old_col
   where id in (select id from posts where new_col is null limit 10000);
   ```

6. **Add constraints as `NOT VALID` first, then validate separately:**
   ```sql
   alter table posts add constraint chk_status
     check (status in ('draft','published','archived')) not valid;
   -- Later (no lock):
   alter table posts validate constraint chk_status;
   ```

### Migration File Conventions (this project)

- Location: `supabase/migrations/YYYYMMDDHHMMSS_<description>.sql`
- Always include RLS enable + policies for new tables
- Always include indexes on foreign keys
- Test with `supabase db reset` locally before pushing

## 6. Supabase-Specific Patterns

### Realtime

- Only tables in `public` schema with RLS enabled can use Realtime
- Realtime respects RLS policies — no separate auth needed
- Enable per-table in Dashboard > Database > Replication
- Avoid Realtime on high-write tables (>100 writes/sec) — use polling instead

### Storage

- Storage objects are in the `storage` schema — do not modify directly
- Storage RLS policies go on `storage.objects` table
- Use `storage.foldername(name)` and `storage.filename(name)` helpers in policies
- Bucket policies are separate from object policies

### Auth Schema

- **Never query `auth.users` directly** in application code or RLS policies
- Use `auth.uid()` for current user ID
- Use `auth.jwt()` for JWT claims (role, email, metadata)
- Use `(select auth.uid())` (with subselect) for performance
- Create a `public.profiles` table that references `auth.users(id)` for user data
- `auth.uid()` returns `null` when unauthenticated — always guard: `auth.uid() is not null and auth.uid() = user_id`

### Database Advisor Lints (key ones to watch)

For the full list of 24 lints, see [references/advisor-lints.md](references/advisor-lints.md).

| Lint | Severity | What It Catches |
|------|----------|----------------|
| `0001` | INFO | Unindexed foreign keys |
| `0002` | WARN | `auth.users` exposed in policies |
| `0003` | WARN | `auth` functions causing initplan in RLS |
| `0005` | INFO | Unused indexes |
| `0006` | INFO | Multiple permissive policies (OR behavior) |
| `0009` | WARN | Duplicate indexes |
| `0013` | WARN | RLS disabled on public table |
| `0015` | WARN | RLS references user metadata |
| `0020` | INFO | Table bloat (run `pg_repack`) |
