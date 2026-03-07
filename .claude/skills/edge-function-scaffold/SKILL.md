name: edge-function-scaffold
description: Scaffold a new Supabase edge function with standard boilerplate — auth middleware, CORS, CronMonitor, error handling, deadline guards, and health probe test. Use when creating a new edge function.

---

# Edge Function Scaffold Skill

Creates a new Supabase edge function following all Social Suite conventions.

## Usage

`/edge-function-scaffold <name> [--cron] [--auth] [--public]`

## Steps

### 1. Create Function Directory

```bash
mkdir -p supabase/functions/<name>
```

### 2. Generate index.ts

Based on flags, generate the appropriate boilerplate:

#### Standard (with auth)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return handleCors();

  try {
    const { user, supabase } = await verifyAuth(req);

    // TODO: Implement function logic

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[<name>] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

#### Cron (with CronMonitor + deadline guard)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CronMonitor } from "../_shared/cron-monitor.ts";

const DEADLINE_MS = 45_000;
const startTime = Date.now();
const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const monitor = new CronMonitor(supabase, "<name>");
  await monitor.start();

  try {
    // TODO: Implement cron logic
    // Use pastDeadline() between operations to check timeout
    // Use AbortSignal.timeout(15000) on all fetch() calls

    await monitor.complete({ itemsProcessed: 0 });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[<name>] Error:", error);
    await monitor.fail(error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### 3. Add Health Probe Test

Append to `src/tests/integration/edge-function-health.test.ts`:

```typescript
test('<name> boots and responds', async () => {
  const res = await supabaseAdmin.functions.invoke('<name>', {
    method: 'POST',
    body: {},
  });
  // Expect either success or auth error (not boot failure)
  expect([200, 401, 403]).toContain(res.status ?? 200);
});
```

### 4. If Cron, Add to Dispatcher Whitelist

Edit `supabase/functions/cron-dispatcher/index.ts` and add `'<name>'` to the `ALLOWED_FUNCTIONS` array.

### 5. Deploy

```bash
DOCKER_HOST=invalid npx supabase functions deploy <name>
```

### 6. Verify

```bash
npx supabase functions list
```

## Conventions

- Function names use kebab-case: `inbox-sync`, `analytics-export`
- All external API calls MUST use `AbortSignal.timeout(15000)`
- Cron functions MUST use `pastDeadline()` between operations
- Auth functions MUST use the shared `verifyAuth()` middleware
- Public functions MUST still have CORS headers
- Every function MUST handle errors with try/catch and return structured JSON errors
