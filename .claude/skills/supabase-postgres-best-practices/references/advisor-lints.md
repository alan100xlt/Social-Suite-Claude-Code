# Supabase Database Advisor Lints

Complete reference for all 24 lints checked by Supabase's Performance and Security Advisors.
Dashboard: Database > Security Advisor / Performance Advisor.

## Table of Contents

- [0001 Unindexed Foreign Keys](#0001)
- [0002 Auth Users Exposed](#0002)
- [0003 Auth RLS Initplan](#0003)
- [0004 No Primary Key](#0004)
- [0005 Unused Index](#0005)
- [0006 Multiple Permissive Policies](#0006)
- [0007 Policy Exists RLS Disabled](#0007)
- [0008 RLS Enabled No Policy](#0008)
- [0009 Duplicate Index](#0009)
- [0010 Security Definer View](#0010)
- [0011 Function Search Path Mutable](#0011)
- [0012 Auth Allow Anonymous Sign Ins](#0012)
- [0013 RLS Disabled in Public](#0013)
- [0014 Extension in Public](#0014)
- [0015 RLS References User Metadata](#0015)
- [0016 Materialized View in API](#0016)
- [0017 Foreign Table in API](#0017)
- [0018 Unsupported Reg Types](#0018)
- [0019 Insecure Queue Exposed in API](#0019)
- [0020 Table Bloat](#0020)
- [0021 FKey to Auth Unique](#0021)
- [0022 Extension Versions Outdated](#0022)
- [0023 Sensitive Columns Exposed](#0023)
- [0024 Permissive RLS Policy](#0024)

---

## 0001 Unindexed Foreign Keys {#0001}
**Level:** INFO | **Type:** Performance

Foreign key columns should be indexed for JOIN performance and cascade delete speed.

**Fix:**
```sql
create index ix_<table>_<column> on <table>(<fk_column>);
```

## 0002 Auth Users Exposed {#0002}
**Level:** WARN | **Type:** Security

Direct references to `auth.users` in views or policies expose sensitive user data. Use `auth.uid()` instead.

## 0003 Auth RLS Initplan {#0003}
**Level:** WARN | **Type:** Performance

`auth.uid()` or `auth.jwt()` called without a subselect wrapper causes per-row evaluation instead of once-per-query.

**Fix:** Wrap in subselect:
```sql
-- Before (per-row)
using (auth.uid() = user_id)
-- After (once)
using ((select auth.uid()) = user_id)
```

## 0004 No Primary Key {#0004}
**Level:** WARN | **Type:** Performance

Tables without a primary key cannot be efficiently updated or deleted. Realtime requires a PK.

## 0005 Unused Index {#0005}
**Level:** INFO | **Type:** Performance

Index has zero scans since last stats reset. Unused indexes waste storage and slow writes.

**Check:** `select * from pg_stat_user_indexes where idx_scan = 0;`

## 0006 Multiple Permissive Policies {#0006}
**Level:** INFO | **Type:** Security

Multiple permissive policies on the same table/operation are ORed. This may grant broader access than intended.

**Consider:** Use `as restrictive` for policies that must ALL pass.

## 0007 Policy Exists RLS Disabled {#0007}
**Level:** WARN | **Type:** Security

Policies exist on a table but RLS is not enabled — the policies have no effect.

**Fix:** `alter table <name> enable row level security;`

## 0008 RLS Enabled No Policy {#0008}
**Level:** WARN | **Type:** Security

RLS is enabled but no policies exist. All access is denied (safe but likely unintentional).

## 0009 Duplicate Index {#0009}
**Level:** WARN | **Type:** Performance

Two indexes cover the same columns in the same order. Remove the redundant one.

## 0010 Security Definer View {#0010}
**Level:** WARN | **Type:** Security

Views with `security_definer` bypass RLS of the calling user. Use `security_invoker = on` instead.

## 0011 Function Search Path Mutable {#0011}
**Level:** WARN | **Type:** Security

Functions without `set search_path` can be exploited via schema injection. Always set:
```sql
create function my_func() returns void
language plpgsql security definer
set search_path = public, pg_catalog
as $$ ... $$;
```

## 0012 Auth Allow Anonymous Sign Ins {#0012}
**Level:** INFO | **Type:** Security

Anonymous sign-ins are enabled. Verify this is intentional.

## 0013 RLS Disabled in Public {#0013}
**Level:** WARN | **Type:** Security

A table in the `public` schema does not have RLS enabled. Any API consumer can read/write all rows.

**Fix:** `alter table public.<name> enable row level security;`

## 0014 Extension in Public {#0014}
**Level:** WARN | **Type:** Security

Extensions installed in the `public` schema are exposed through the Data API. Move to a dedicated schema:
```sql
create schema if not exists extensions;
create extension pg_trgm schema extensions;
```

## 0015 RLS References User Metadata {#0015}
**Level:** WARN | **Type:** Security

RLS policy references `raw_user_meta_data` from `auth.users`. User metadata is mutable and not trustworthy for authorization decisions.

## 0016 Materialized View in API {#0016}
**Level:** INFO | **Type:** Security

Materialized views in `public` schema are exposed via the API without RLS protection.

## 0017 Foreign Table in API {#0017}
**Level:** INFO | **Type:** Security

Foreign tables in `public` schema are exposed via the API. Consider moving to a non-public schema.

## 0018 Unsupported Reg Types {#0018}
**Level:** WARN | **Type:** Compatibility

Columns using `reg*` types (e.g., `regclass`) are not supported by the Data API.

## 0019 Insecure Queue Exposed in API {#0019}
**Level:** WARN | **Type:** Security

PGMQ queues in the `public` schema are accessible via the API without proper access controls.

## 0020 Table Bloat {#0020}
**Level:** INFO | **Type:** Performance

Table has significant dead-tuple bloat. Run `vacuum full` or use `pg_repack` extension for online compaction.

## 0021 FKey to Auth Unique {#0021}
**Level:** WARN | **Type:** Compatibility

Foreign key references a unique constraint in `auth` schema. This can break during Supabase auth migrations.

## 0022 Extension Versions Outdated {#0022}
**Level:** INFO | **Type:** Maintenance

Extensions are not on the latest available version. Update with:
```sql
alter extension <name> update;
```

## 0023 Sensitive Columns Exposed {#0023}
**Level:** WARN | **Type:** Security

Columns with sensitive data patterns (email, phone, SSN) are exposed without column-level security.

## 0024 Permissive RLS Policy {#0024}
**Level:** INFO | **Type:** Security

A permissive policy grants access too broadly (e.g., `using (true)` without role restriction).
