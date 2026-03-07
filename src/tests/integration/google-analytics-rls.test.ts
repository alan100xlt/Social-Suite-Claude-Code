import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  deleteTestCompany,
  addMembership,
  signInAsUser,
} from "./setup";

/**
 * Google Analytics RLS Isolation Tests
 *
 * Verifies:
 * 1. User A cannot read Company B's GA connections
 * 2. User A cannot read Company B's page snapshots
 * 3. User A cannot read Company B's referral snapshots
 * 4. User A cannot read Company B's post-page correlations
 * 5. RPC functions enforce company membership
 * 6. Service role can read/write all tables
 */

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let companyA: string;
let companyB: string;
let connectionIdA: string | null = null;
let connectionIdB: string | null = null;

beforeAll(async () => {
  userA = await createTestUser("ga-rls-a");
  userB = await createTestUser("ga-rls-b");
  companyA = await createTestCompany("GA RLS Co A", userA.id);
  companyB = await createTestCompany("GA RLS Co B", userB.id);
  await addMembership(userA.id, companyA, "owner");
  await addMembership(userB.id, companyB, "owner");

  // Seed Company A with GA data (for positive tests)
  const { data: connA } = await adminClient
    .from("google_analytics_connections")
    .insert({
      company_id: companyA,
      google_email: "user-a@example.com",
      property_id: "properties/111111",
      property_name: "Co A Property",
      refresh_token: "token-a",
      is_active: true,
    })
    .select("id")
    .single();
  connectionIdA = connA?.id ?? null;

  // Seed Company B with GA data that User A should never see
  const { data: connB } = await adminClient
    .from("google_analytics_connections")
    .insert({
      company_id: companyB,
      google_email: "test@example.com",
      property_id: "properties/999999",
      property_name: "Secret Property",
      refresh_token: "secret-refresh-token",
      is_active: true,
    })
    .select("id")
    .single();
  connectionIdB = connB?.id ?? null;

  if (connectionIdB) {
    await adminClient.from("ga_page_snapshots").insert({
      company_id: companyB,
      connection_id: connectionIdB,
      page_path: "/secret-article",
      pageviews: 1000,
      snapshot_hour: new Date().toISOString(),
    });

    await adminClient.from("ga_referral_snapshots").insert({
      company_id: companyB,
      connection_id: connectionIdB,
      page_path: "/secret-article",
      source: "twitter.com",
      medium: "social",
      sessions: 50,
      snapshot_hour: new Date().toISOString(),
    });

    await adminClient.from("post_page_correlations").insert({
      company_id: companyB,
      post_id: "secret-post-id",
      platform: "twitter",
      page_path: "/secret-article",
      match_type: "url",
    });
  }

  // Seed Company A with some GA data for positive tests
  if (connectionIdA) {
    await adminClient.from("ga_page_snapshots").insert({
      company_id: companyA,
      connection_id: connectionIdA,
      page_path: "/my-article",
      pageviews: 500,
      snapshot_hour: new Date().toISOString(),
    });
  }
}, 30000);

afterAll(async () => {
  // Clean up in reverse order
  await adminClient.from("post_page_correlations").delete().eq("company_id", companyB);
  await adminClient.from("ga_referral_snapshots").delete().eq("company_id", companyB);
  await adminClient.from("ga_page_snapshots").delete().eq("company_id", companyB);
  await adminClient.from("ga_page_snapshots").delete().eq("company_id", companyA);
  if (connectionIdB) {
    await adminClient.from("google_analytics_connections").delete().eq("id", connectionIdB);
  }
  if (connectionIdA) {
    await adminClient.from("google_analytics_connections").delete().eq("id", connectionIdA);
  }
  await deleteTestCompany(companyA);
  await deleteTestCompany(companyB);
  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}, 30000);

// ─── Table Existence ─────────────────────────────────────────

describe("Table existence", () => {
  test("google_analytics_connections table exists", async () => {
    const { error } = await adminClient
      .from("google_analytics_connections")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("ga_page_snapshots table exists", async () => {
    const { error } = await adminClient
      .from("ga_page_snapshots")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("ga_referral_snapshots table exists", async () => {
    const { error } = await adminClient
      .from("ga_referral_snapshots")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("post_page_correlations table exists", async () => {
    const { error } = await adminClient
      .from("post_page_correlations")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });
});

// ─── Cross-Tenant Isolation ──────────────────────────────────

describe("GA connections — cross-tenant isolation", () => {
  test("User A cannot read Company B connections", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("google_analytics_connections")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });

  test("User A can read own company connections", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("google_analytics_connections")
      .select("*")
      .eq("company_id", companyA);
    expect(data?.length).toBeGreaterThan(0);
  });

  test("Service role can read all connections", async () => {
    const { data } = await adminClient
      .from("google_analytics_connections")
      .select("*")
      .eq("company_id", companyB);
    expect(data?.length).toBeGreaterThan(0);
  });
});

describe("GA page snapshots — cross-tenant isolation", () => {
  test("User A cannot read Company B page snapshots", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("ga_page_snapshots")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });

  test("User A can read own company page snapshots", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("ga_page_snapshots")
      .select("*")
      .eq("company_id", companyA);
    expect(data?.length).toBeGreaterThan(0);
  });
});

describe("GA referral snapshots — cross-tenant isolation", () => {
  test("User A cannot read Company B referral snapshots", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("ga_referral_snapshots")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });
});

describe("Post-page correlations — cross-tenant isolation", () => {
  test("User A cannot read Company B correlations", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data } = await client
      .from("post_page_correlations")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });
});

// ─── RPC Functions ───────────────────────────────────────────

describe("RPC functions — access control", () => {
  test("get_ga_page_metrics returns data for own company member", async () => {
    const { client } = await signInAsUser(userA.email);
    const { error } = await client.rpc("get_ga_page_metrics", {
      _company_id: companyA,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    // Should succeed (no error) for own company
    expect(error).toBeNull();
  });

  test("get_ga_page_metrics denies access for non-member", async () => {
    const { client } = await signInAsUser(userA.email);
    const { error } = await client.rpc("get_ga_page_metrics", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
  });

  test("get_ga_traffic_sources denies access for non-member", async () => {
    const { client } = await signInAsUser(userA.email);
    const { error } = await client.rpc("get_ga_traffic_sources", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
  });

  test("get_content_journey denies access for non-member", async () => {
    const { client } = await signInAsUser(userA.email);
    const { error } = await client.rpc("get_content_journey", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
  });
});

// ─── RPC Function Existence ──────────────────────────────────

describe("RPC function existence", () => {
  test("get_ga_page_metrics function exists", async () => {
    const { error } = await adminClient.rpc("get_ga_page_metrics", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    // Function exists — error (if any) should NOT be about missing function
    if (error) {
      expect(error.message).not.toContain("Could not find the function");
    }
  });

  test("get_ga_traffic_sources function exists", async () => {
    const { error } = await adminClient.rpc("get_ga_traffic_sources", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    if (error) {
      expect(error.message).not.toContain("Could not find the function");
    }
  });

  test("get_content_journey function exists", async () => {
    const { error } = await adminClient.rpc("get_content_journey", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    if (error) {
      expect(error.message).not.toContain("Could not find the function");
    }
  });
});
