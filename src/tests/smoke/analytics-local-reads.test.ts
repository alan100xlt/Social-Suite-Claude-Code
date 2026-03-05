import { describe, test, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Smoke test: verifies the new analytics-local-reads migration applied correctly.
// Checks that the RPC and table exist and are callable.

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("Analytics local reads — smoke tests", () => {
  test("get_posting_frequency_analysis RPC exists", async () => {
    const { error } = await supabase.rpc("get_posting_frequency_analysis", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _platform: null,
    });
    // Should return empty result, NOT "function does not exist"
    expect(error).toBeNull();
  });

  test("get_optimal_posting_windows RPC exists", async () => {
    const { error } = await supabase.rpc("get_optimal_posting_windows", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _platform: null,
      _timezone: "UTC",
    });
    expect(error).toBeNull();
  });

  test("content_decay_cache table exists and is queryable", async () => {
    const { error } = await supabase
      .from("content_decay_cache")
      .select("id, company_id, platform, data, synced_at")
      .limit(0);
    // RLS may return empty, but the table should exist (no 42P01 error)
    expect(error).toBeNull();
  });
});
