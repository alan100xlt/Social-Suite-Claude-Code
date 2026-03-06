---
name: deploy
description: Deploy Supabase edge functions — auto-detects changed functions, deploys them, and verifies.
disable-model-invocation: true
---

# Deploy Edge Functions

Deploy one or more Supabase edge functions with verification.

## Usage

- `/deploy` — auto-detect and deploy all locally modified edge functions
- `/deploy <name>` — deploy a specific function by name
- `/deploy <name1> <name2>` — deploy multiple specific functions

## Steps

### 1. Identify functions to deploy

If no function name provided, detect which functions have local changes:

```bash
# List all edge functions
ls supabase/functions/*/index.ts

# Check git status for modified functions
git diff --name-only HEAD supabase/functions/
git diff --name-only --cached supabase/functions/
```

If specific names provided, use those.

### 2. Deploy each function

Use the Docker bypass (Docker ECR pull fails on this machine):

```bash
DOCKER_HOST=invalid npx supabase functions deploy <function-name>
```

Deploy functions one at a time. Report success/failure for each.

### 3. Verify deployment

```bash
npx supabase functions list
```

Confirm each deployed function appears in the list and the version timestamp is recent.

### 4. Report results

Output a summary table:

| Function | Status | Notes |
|----------|--------|-------|
| name     | Deployed / Failed | version or error |

If any function failed, show the error output and suggest fixes.

## Common issues

- **Auth errors**: Run `npx supabase login` first
- **Missing secrets**: Check MEMORY.md for required secrets, set with `npx supabase secrets set KEY=VALUE`
- **Import errors in function**: Check that shared modules in `supabase/functions/_shared/` are correct
