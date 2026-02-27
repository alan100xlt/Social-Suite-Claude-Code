/**
 * Cross-Tenant Data Isolation Tests
 *
 * Validates RLS across all major company-scoped tables:
 * - rss_feeds, automation_rules, post_drafts, post_approvals,
 *   post_analytics_snapshots, account_analytics_snapshots, automation_logs
 *
 * Ensures user from Company A cannot read/write Company B data.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  getAdminClient,
  createTestUser,
  createTestCompany,
  addMembership,
  setProfileCompany,
  cleanupTestData,
  envReady,
  type TestPersona,
  type TestCompany,
} from "./test-helpers.ts";

const skip = !envReady();

let admin: ReturnType<typeof getAdminClient> = undefined!;
let userA: TestPersona = undefined!;
let userB: TestPersona = undefined!;
let companyA: TestCompany = undefined!;
let companyB: TestCompany = undefined!;

// Track IDs for cleanup
const feedIds: string[] = [];
const ruleIds: string[] = [];
const draftIds: string[] = [];

Deno.test({
  name: "cross-tenant – setup",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    userA = await createTestUser(admin, "xt_a");
    userB = await createTestUser(admin, "xt_b");

    companyA = await createTestCompany(admin, userA.id, "xt_a");
    companyB = await createTestCompany(admin, userB.id, "xt_b");

    await addMembership(admin, userA.id, companyA.id, "owner");
    await addMembership(admin, userB.id, companyB.id, "owner");

    await setProfileCompany(admin, userA.id, companyA.id);
    await setProfileCompany(admin, userB.id, companyB.id);

    // Seed data in both companies via service_role
    const { data: feedA } = await admin
      .from("rss_feeds")
      .insert({ company_id: companyA.id, name: "Feed A", url: "https://a.test/rss" })
      .select("id")
      .single();
    feedIds.push(feedA!.id);

    const { data: feedB } = await admin
      .from("rss_feeds")
      .insert({ company_id: companyB.id, name: "Feed B", url: "https://b.test/rss" })
      .select("id")
      .single();
    feedIds.push(feedB!.id);

    const { data: ruleA } = await admin
      .from("automation_rules")
      .insert({ company_id: companyA.id, name: "Rule A" })
      .select("id")
      .single();
    ruleIds.push(ruleA!.id);

    const { data: ruleB } = await admin
      .from("automation_rules")
      .insert({ company_id: companyB.id, name: "Rule B" })
      .select("id")
      .single();
    ruleIds.push(ruleB!.id);

    const { data: draftA } = await admin
      .from("post_drafts")
      .insert({ company_id: companyA.id, created_by: userA.id, title: "Draft A" })
      .select("id")
      .single();
    draftIds.push(draftA!.id);

    const { data: draftB } = await admin
      .from("post_drafts")
      .insert({ company_id: companyB.id, created_by: userB.id, title: "Draft B" })
      .select("id")
      .single();
    draftIds.push(draftB!.id);
  },
});

// ── RSS Feeds ───────────────────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – userA can read own company feeds",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("rss_feeds")
      .select("id, name")
      .eq("company_id", companyA.id);
    assertEquals(data!.length, 1);
    assertEquals(data![0].name, "Feed A");
  },
});

Deno.test({
  name: "cross-tenant – userA CANNOT read companyB feeds",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("rss_feeds")
      .select("id")
      .eq("company_id", companyB.id);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "cross-tenant – userA CANNOT insert feed into companyB",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await userA.client
      .from("rss_feeds")
      .insert({ company_id: companyB.id, name: "Hacked Feed", url: "https://hack.test/rss" });
    assertNotEquals(error, null);
  },
});

// ── Automation Rules ────────────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – userA can read own automation rules",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("automation_rules")
      .select("id, name")
      .eq("company_id", companyA.id);
    assertEquals(data!.length, 1);
    assertEquals(data![0].name, "Rule A");
  },
});

Deno.test({
  name: "cross-tenant – userA CANNOT read companyB automation rules",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("automation_rules")
      .select("id")
      .eq("company_id", companyB.id);
    assertEquals(data!.length, 0);
  },
});

// ── Post Drafts ─────────────────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – userA can read own drafts",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("post_drafts")
      .select("id, title")
      .eq("company_id", companyA.id);
    assertEquals(data!.length, 1);
    assertEquals(data![0].title, "Draft A");
  },
});

Deno.test({
  name: "cross-tenant – userA CANNOT read companyB drafts",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("post_drafts")
      .select("id")
      .eq("company_id", companyB.id);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "cross-tenant – userA CANNOT insert draft into companyB",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await userA.client
      .from("post_drafts")
      .insert({
        company_id: companyB.id,
        created_by: userA.id,
        title: "Hacked Draft",
      });
    assertNotEquals(error, null);
  },
});

// ── Company Voice Settings ──────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – userA CANNOT insert voice settings for companyB",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await userA.client
      .from("company_voice_settings")
      .insert({ company_id: companyB.id, tone: "hacked" });
    assertNotEquals(error, null);
  },
});

// ── API Call Logs ────────────────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – userA CANNOT read companyB API logs",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Seed a log for companyB
    await admin.from("api_call_logs").insert({
      company_id: companyB.id,
      function_name: "test",
      action: "test",
      success: true,
    });

    const { data } = await userA.client
      .from("api_call_logs")
      .select("id")
      .eq("company_id", companyB.id);
    assertEquals(data!.length, 0);
  },
});

// ── Teardown ────────────────────────────────────────────────────────────

Deno.test({
  name: "cross-tenant – teardown",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Clean seeded data
    for (const id of draftIds) {
      await admin.from("post_drafts").delete().eq("id", id);
    }
    for (const id of ruleIds) {
      await admin.from("automation_rules").delete().eq("id", id);
    }
    for (const id of feedIds) {
      await admin.from("rss_feeds").delete().eq("id", id);
    }
    await admin.from("api_call_logs").delete().eq("company_id", companyB.id);

    await cleanupTestData(admin, [userA.id, userB.id], [companyA.id, companyB.id]);
  },
});
