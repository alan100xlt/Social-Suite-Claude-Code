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
 * RLS isolation tests for teamwork tables.
 * Verifies that User A in Company A CANNOT read Company B's teamwork data.
 * Tables: inbox_activity_log, corrections, notification_preferences, routing_rules
 */

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let companyA: string;
let companyB: string;

// Seeded row IDs for cleanup
let activityLogIdB: string | null = null;
let correctionIdB: string | null = null;
let routingRuleIdB: string | null = null;
let conversationIdB: string | null = null;

beforeAll(async () => {
  userA = await createTestUser("teamwork-rls-a");
  userB = await createTestUser("teamwork-rls-b");
  companyA = await createTestCompany("Teamwork RLS Co A", userA.id);
  companyB = await createTestCompany("Teamwork RLS Co B", userB.id);
  await addMembership(userA.id, companyA, "owner");
  await addMembership(userB.id, companyB, "owner");

  // Seed a conversation in Company B (needed for corrections + activity log FK)
  const { data: conv } = await adminClient
    .from("inbox_conversations")
    .insert({
      company_id: companyB,
      platform: "facebook",
      platform_conversation_id: `teamwork-rls-test-${Date.now()}`,
      type: "comment",
      status: "open",
      subject: "Teamwork RLS test",
    })
    .select("id")
    .single();
  conversationIdB = conv?.id ?? null;

  // Seed Company B's teamwork data
  const { data: activity } = await adminClient
    .from("inbox_activity_log")
    .insert({
      company_id: companyB,
      user_id: userB.id,
      action: "assigned",
      conversation_id: conversationIdB,
      metadata: { user_name: "Test User B" },
    })
    .select("id")
    .single();
  activityLogIdB = activity?.id ?? null;

  const { data: correction } = await adminClient
    .from("corrections")
    .insert({
      company_id: companyB,
      conversation_id: conversationIdB,
      created_by: userB.id,
      status: "open",
    })
    .select("id")
    .single();
  correctionIdB = correction?.id ?? null;

  const { data: rule } = await adminClient
    .from("routing_rules")
    .insert({
      company_id: companyB,
      category: "editorial",
      subcategory: "sports",
      enabled: true,
    })
    .select("id")
    .single();
  routingRuleIdB = rule?.id ?? null;

  // Seed notification preferences for User B in Company B
  await adminClient.from("notification_preferences").upsert({
    user_id: userB.id,
    company_id: companyB,
    event_type: "assignment",
    in_app: true,
    email: false,
  });
}, 30000);

afterAll(async () => {
  // Clean up in reverse order
  await adminClient
    .from("notification_preferences")
    .delete()
    .eq("user_id", userB.id)
    .eq("company_id", companyB);
  if (routingRuleIdB) {
    await adminClient.from("routing_rules").delete().eq("id", routingRuleIdB);
  }
  if (correctionIdB) {
    await adminClient.from("corrections").delete().eq("id", correctionIdB);
  }
  if (activityLogIdB) {
    await adminClient
      .from("inbox_activity_log")
      .delete()
      .eq("id", activityLogIdB);
  }
  if (conversationIdB) {
    await adminClient
      .from("inbox_conversations")
      .delete()
      .eq("id", conversationIdB);
  }
  await deleteTestCompany(companyA);
  await deleteTestCompany(companyB);
  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}, 30000);

describe("Cross-tenant: inbox_activity_log", () => {
  test("User A CANNOT read Company B's activity log", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("inbox_activity_log")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own company's activity log", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("inbox_activity_log")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-tenant: corrections", () => {
  test("User A CANNOT read Company B's corrections", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("corrections")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own company's corrections", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("corrections")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-tenant: routing_rules", () => {
  test("User A CANNOT read Company B's routing rules", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("routing_rules")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own company's routing rules", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("routing_rules")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-tenant: notification_preferences", () => {
  test("User A CANNOT read User B's notification preferences", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("notification_preferences")
      .select("user_id, event_type")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own notification preferences", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("notification_preferences")
      .select("user_id, event_type")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});
