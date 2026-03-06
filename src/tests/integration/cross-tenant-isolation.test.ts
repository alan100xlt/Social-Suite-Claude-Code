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
 * Cross-tenant isolation tests.
 * Verifies that a user in Company A CANNOT read Company B's data.
 * These test the most dangerous bug class in a multi-tenant SaaS.
 */

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let companyA: string;
let companyB: string;
let postIdB: string | null = null;
let snapshotIdB: string | null = null;
let conversationIdB: string | null = null;

beforeAll(async () => {
  // Create two users, each in their own company
  userA = await createTestUser("tenant-iso-a");
  userB = await createTestUser("tenant-iso-b");
  companyA = await createTestCompany("Tenant Isolation Co A", userA.id);
  companyB = await createTestCompany("Tenant Isolation Co B", userB.id);
  await addMembership(userA.id, companyA, "owner");
  await addMembership(userB.id, companyB, "owner");

  // Seed Company B with data that User A should never see
  const { data: post } = await adminClient
    .from("post_drafts")
    .insert({
      company_id: companyB,
      title: "Secret draft from Company B",
      status: "draft",
      created_by: userB.id,
    })
    .select("id")
    .single();
  postIdB = post?.id ?? null;

  const { data: snapshot } = await adminClient
    .from("post_analytics_snapshots")
    .insert({
      company_id: companyB,
      platform: "facebook",
      post_id: "test-tenant-iso-post",
      engagement_rate: 5.5,
      snapshot_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();
  snapshotIdB = snapshot?.id ?? null;

  const { data: conversation } = await adminClient
    .from("inbox_conversations")
    .insert({
      company_id: companyB,
      platform: "facebook",
      platform_conversation_id: "test-tenant-iso",
      type: "dm",
      status: "open",
      subject: "Secret DM",
    })
    .select("id")
    .single();
  conversationIdB = conversation?.id ?? null;
}, 30000);

afterAll(async () => {
  // Clean up in reverse order
  if (conversationIdB) {
    await adminClient.from("inbox_conversations").delete().eq("id", conversationIdB);
  }
  if (snapshotIdB) {
    await adminClient.from("post_analytics_snapshots").delete().eq("id", snapshotIdB);
  }
  if (postIdB) {
    await adminClient.from("post_drafts").delete().eq("id", postIdB);
  }
  await deleteTestCompany(companyA);
  await deleteTestCompany(companyB);
  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}, 30000);

describe("Cross-tenant: post_drafts", () => {
  test("User A CANNOT read Company B's drafts", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("post_drafts")
      .select("id, title")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own company's drafts", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("post_drafts")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-tenant: analytics_snapshots", () => {
  test("User A CANNOT read Company B's analytics", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("post_analytics_snapshots")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own analytics", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("post_analytics_snapshots")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-tenant: inbox_conversations", () => {
  test("User A CANNOT read Company B's inbox", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("inbox_conversations")
      .select("id, subject")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("User B CAN read their own inbox", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("inbox_conversations")
      .select("id")
      .eq("company_id", companyB);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});
