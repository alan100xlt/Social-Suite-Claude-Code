import { describe, test, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Smoke test: verifies DB connectivity and core functions exist.
// Uses anon key — no service role needed for basic health checks.

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("Database health smoke test", () => {
  test("can connect to Supabase", async () => {
    // Use an RPC call to test connectivity (table selects require auth)
    const { data, error } = await supabase.rpc("is_superadmin");
    expect(error).toBeNull();
    expect(typeof data).toBe("boolean");
  });

  test("user_is_member function exists", async () => {
    const { error } = await supabase.rpc("user_is_member", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _company_id: "00000000-0000-0000-0000-000000000000",
    });
    // Should return false, not "function does not exist"
    expect(error).toBeNull();
  });

  test("user_belongs_to_company function exists", async () => {
    const { error } = await supabase.rpc("user_belongs_to_company", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _company_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeNull();
  });

  test("is_superadmin function exists", async () => {
    const { data, error } = await supabase.rpc("is_superadmin");
    expect(error).toBeNull();
    expect(typeof data).toBe("boolean");
  });

  test("core tables exist (RLS may deny reads without auth)", async () => {
    const tables = [
      "companies",
      "company_memberships",
      "profiles",
      "rss_feeds",
      "automation_rules",
      "post_drafts",
      "media_companies",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(0);
      // 42501 = permission denied (table exists, RLS blocks anonymous access) — that's fine
      // PGRST204 = table not found — that's a real failure
      if (error) {
        expect(
          error.code,
          `Table ${table} should exist (got: ${error.message})`
        ).toBe("42501");
      }
    }
  });
});
