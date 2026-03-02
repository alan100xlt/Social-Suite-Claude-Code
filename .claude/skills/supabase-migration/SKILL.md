---
name: supabase-migration
description: Scaffold and apply a new Supabase database migration following project conventions
tools: Read, Edit, Write, Bash, Glob, Grep
user-invocable: true
---

Create a new Supabase migration: $ARGUMENTS

## Naming Convention
Migrations use timestamp prefix: `YYYYMMDDHHMMSS_<snake_case_description>.sql`
Get current timestamp: `date +%Y%m%d%H%M%S`

## Steps

1. **Read context**
   - Check `supabase/migrations/` for the latest migration to understand current schema state
   - Read `src/integrations/supabase/types.ts` to understand existing types

2. **Scaffold the migration file**
   - File: `supabase/migrations/<timestamp>_<description>.sql`
   - Always use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - Every table needs: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Every multi-tenant table needs: `company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
   - Add RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`
   - Add RLS policy for company isolation:
     ```sql
     CREATE POLICY "<table>_company_isolation" ON <table>
       USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
     ```
   - Add indexes on `company_id` and any foreign keys
   - Add descriptive comment at top of file

3. **Update TypeScript types**
   - Run `npx supabase gen types typescript --local > src/integrations/supabase/types.ts` if Supabase is running locally
   - Otherwise note that types will need regenerating after migration is applied

4. **Apply the migration**
   - Run `npm run db:migrate` to apply
   - If that fails, check `supabase status` first

5. **Verify**
   - Run `npx tsc --noEmit` to confirm no type errors
   - Confirm migration appears in `supabase/migrations/`

## RLS Pattern for this project
```sql
-- Always check company_id via profiles table join
CREATE POLICY "policy_name" ON table_name
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
```
