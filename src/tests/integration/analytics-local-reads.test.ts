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

describe("Analytics local reads — integration tests", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let companyId: string;

  beforeAll(async () => {
    userA = await createTestUser("analytics-local-a");
    userB = await createTestUser("analytics-local-b");
    companyId = await createTestCompany("Analytics Local Test Co", userA.id);
    await addMembership(userA.id, companyId, "owner");

    // Seed some post_analytics_snapshots for the RPC tests
    const now = new Date();
    const snapshots = [];
    for (let week = 0; week < 4; week++) {
      for (let i = 0; i < 3; i++) {
        const publishedAt = new Date(now);
        publishedAt.setDate(publishedAt.getDate() - week * 7 - i);
        snapshots.push({
          company_id: companyId,
          platform: "twitter",
          post_id: `test-post-${week}-${i}`,
          published_at: publishedAt.toISOString(),
          snapshot_date: publishedAt.toISOString().split("T")[0],
          engagement_rate: 0.05 + Math.random() * 0.1,
          impressions: 100 + Math.floor(Math.random() * 500),
          likes: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 10),
          shares: Math.floor(Math.random() * 5),
        });
      }
    }

    const { error: snapshotErr } = await adminClient
      .from("post_analytics_snapshots")
      .insert(snapshots);
    if (snapshotErr)
      throw new Error(`Failed to seed snapshots: ${snapshotErr.message}`);

    // Seed content_decay_cache for the table RLS tests
    const { error: cacheErr } = await adminClient.from("content_decay_cache").insert({
      company_id: companyId,
      platform: null,
      data: [
        { timeWindow: "1 hour", engagementPercentage: 95 },
        { timeWindow: "6 hours", engagementPercentage: 75 },
        { timeWindow: "24 hours", engagementPercentage: 40 },
      ],
      synced_at: new Date().toISOString(),
    });
    if (cacheErr)
      throw new Error(`Failed to seed decay cache: ${cacheErr.message}`);
  });

  afterAll(async () => {
    // Clean up seeded data
    await adminClient
      .from("content_decay_cache")
      .delete()
      .eq("company_id", companyId);
    await adminClient
      .from("post_analytics_snapshots")
      .delete()
      .eq("company_id", companyId);
    await deleteTestCompany(companyId);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  // --- get_posting_frequency_analysis RPC ---

  test("posting frequency RPC returns data for member user", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client.rpc("get_posting_frequency_analysis", {
      _company_id: companyId,
      _platform: null,
    });
    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    expect(row).toHaveProperty("platform");
    expect(row).toHaveProperty("posts_per_week");
    expect(row).toHaveProperty("average_engagement_rate");
    expect(row.platform).toBe("twitter");
    expect(Number(row.posts_per_week)).toBeGreaterThan(0);
    expect(Number(row.average_engagement_rate)).toBeGreaterThan(0);
  });

  test("posting frequency RPC returns empty for non-member user", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client.rpc("get_posting_frequency_analysis", {
      _company_id: companyId,
      _platform: null,
    });
    // SECURITY INVOKER + RLS = non-member sees no rows
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test("posting frequency RPC filters by platform", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client.rpc("get_posting_frequency_analysis", {
      _company_id: companyId,
      _platform: "instagram", // no instagram data seeded
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // --- get_optimal_posting_windows RPC ---

  test("optimal windows RPC returns data for member user", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client.rpc("get_optimal_posting_windows", {
      _company_id: companyId,
      _platform: null,
      _timezone: "UTC",
    });
    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    expect(row).toHaveProperty("platform");
    expect(row).toHaveProperty("day_of_week");
    expect(row).toHaveProperty("hour");
    expect(row).toHaveProperty("avg_engagement");
    expect(row).toHaveProperty("post_count");
    expect(row).toHaveProperty("confidence_level");
  });

  test("optimal windows RPC returns empty for non-member user", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client.rpc("get_optimal_posting_windows", {
      _company_id: companyId,
      _platform: null,
      _timezone: "UTC",
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // --- content_decay_cache RLS ---

  test("member CAN read content_decay_cache for their company", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("content_decay_cache")
      .select("data")
      .eq("company_id", companyId)
      .is("platform", null)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.data).toBeInstanceOf(Array);
    expect(data!.data).toHaveLength(3);
    expect(data!.data[0]).toHaveProperty("timeWindow");
    expect(data!.data[0]).toHaveProperty("engagementPercentage");
  });

  test("non-member CANNOT read content_decay_cache for other company", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("content_decay_cache")
      .select("data")
      .eq("company_id", companyId)
      .is("platform", null)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull(); // RLS blocks access
  });
});
