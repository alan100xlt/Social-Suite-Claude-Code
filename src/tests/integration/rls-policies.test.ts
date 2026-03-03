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

describe("RLS: companies", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let companyId: string;

  beforeAll(async () => {
    userA = await createTestUser("rls-companies-a");
    userB = await createTestUser("rls-companies-b");
    companyId = await createTestCompany("RLS Test Company", userA.id);
    await addMembership(userA.id, companyId, "owner");
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  test("user WITH membership CAN read their company", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("companies")
      .select("id, name")
      .eq("id", companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(companyId);
  });

  test("user WITHOUT membership CANNOT read other company", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("companies")
      .select("id, name")
      .eq("id", companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  test("service role CAN read all companies", async () => {
    const { data, error } = await adminClient
      .from("companies")
      .select("id")
      .eq("id", companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("RLS: profiles", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let companyId: string;

  beforeAll(async () => {
    userA = await createTestUser("rls-profiles-a");
    userB = await createTestUser("rls-profiles-b");
    companyId = await createTestCompany("RLS Profiles Test", userA.id);
    await addMembership(userA.id, companyId, "owner");
    await addMembership(userB.id, companyId, "member");
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  test("user can read own profile", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("profiles")
      .select("id, email")
      .eq("id", userA.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test("team members can view each other", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("id", userB.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("RLS: rss_feeds", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let companyId: string;
  let feedId: string;

  beforeAll(async () => {
    userA = await createTestUser("rls-feeds-a");
    userB = await createTestUser("rls-feeds-b");
    companyId = await createTestCompany("RLS Feeds Test", userA.id);
    await addMembership(userA.id, companyId, "owner");

    // Create a feed via admin
    const { data } = await adminClient
      .from("rss_feeds")
      .insert({
        company_id: companyId,
        url: "https://example.com/feed.xml",
        name: "Test Feed",
        is_active: true,
      })
      .select("id")
      .single();
    feedId = data!.id;
  });

  afterAll(async () => {
    await adminClient.from("rss_feeds").delete().eq("id", feedId);
    await deleteTestCompany(companyId);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  test("member CAN read feeds in their company", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("rss_feeds")
      .select("id")
      .eq("company_id", companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test("non-member CANNOT read feeds", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("rss_feeds")
      .select("id")
      .eq("company_id", companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
