import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  addMembership,
  deleteTestCompany,
  signInAsUser,
} from "./setup";

/**
 * RBAC Permission Integration Tests
 *
 * Tests that:
 * 1. Role defaults are seeded correctly in role_default_permissions
 * 2. User permission overrides work
 * 3. Different roles get different default permissions
 * 4. The 5 RBAC roles exist in the enum
 */

let testUser: { id: string; email: string };
let testCompanyId: string;

beforeAll(async () => {
  testUser = await createTestUser("rbac");
  testCompanyId = await createTestCompany("RBAC Test Co", testUser.id);
});

afterAll(async () => {
  // Clean up user_permissions
  await adminClient
    .from("user_permissions")
    .delete()
    .eq("user_id", testUser.id);
  await deleteTestCompany(testCompanyId);
  await deleteTestUser(testUser.id);
});

describe("role_default_permissions table", () => {
  it("has entries for all 5 roles", async () => {
    const { data, error } = await adminClient
      .from("role_default_permissions")
      .select("role")
      .order("role");

    expect(error).toBeNull();
    const roles = [...new Set((data || []).map((d) => d.role))];
    expect(roles).toContain("owner");
    expect(roles).toContain("admin");
    expect(roles).toContain("manager");
    expect(roles).toContain("collaborator");
    expect(roles).toContain("community_manager");
  });

  it("owner has all permissions granted", async () => {
    const { data, error } = await adminClient
      .from("role_default_permissions")
      .select("permission_name, granted")
      .eq("role", "owner");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(10);
    for (const row of data!) {
      expect(row.granted).toBe(true);
    }
  });

  it("collaborator cannot publish by default", async () => {
    const { data, error } = await adminClient
      .from("role_default_permissions")
      .select("permission_name, granted")
      .eq("role", "collaborator")
      .eq("permission_name", "publish");

    expect(error).toBeNull();
    if (data && data.length > 0) {
      expect(data[0].granted).toBe(false);
    }
  });

  it("community_manager can manage inbox", async () => {
    const { data, error } = await adminClient
      .from("role_default_permissions")
      .select("permission_name, granted")
      .eq("role", "community_manager")
      .in("permission_name", ["manage_inbox", "respond_inbox"]);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    for (const row of data!) {
      expect(row.granted).toBe(true);
    }
  });
});

describe("user_permissions overrides", () => {
  beforeAll(async () => {
    // Give user a collaborator role
    await addMembership(testUser.id, testCompanyId, "collaborator");
  });

  it("can insert a per-user permission override", async () => {
    const { error } = await adminClient.from("user_permissions").insert({
      user_id: testUser.id,
      company_id: testCompanyId,
      permission_name: "publish",
      granted: true,
    });

    expect(error).toBeNull();
  });

  it("per-user override is queryable", async () => {
    const { data, error } = await adminClient
      .from("user_permissions")
      .select("*")
      .eq("user_id", testUser.id)
      .eq("company_id", testCompanyId)
      .eq("permission_name", "publish");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].granted).toBe(true);
  });

  it("can revoke a per-user permission override", async () => {
    const { error } = await adminClient
      .from("user_permissions")
      .update({ granted: false })
      .eq("user_id", testUser.id)
      .eq("company_id", testCompanyId)
      .eq("permission_name", "publish");

    expect(error).toBeNull();

    const { data } = await adminClient
      .from("user_permissions")
      .select("granted")
      .eq("user_id", testUser.id)
      .eq("company_id", testCompanyId)
      .eq("permission_name", "publish")
      .single();

    expect(data!.granted).toBe(false);
  });
});

describe("company_feature_config", () => {
  it("can insert a feature config for a company", async () => {
    const config = {
      posting_throttle: { enabled: true, max_posts: 3, per_hours: 2 },
      breaking_news: { enabled: true },
    };

    const { error } = await adminClient.from("company_feature_config").upsert({
      company_id: testCompanyId,
      config,
    });

    expect(error).toBeNull();
  });

  it("can read feature config back", async () => {
    const { data, error } = await adminClient
      .from("company_feature_config")
      .select("config")
      .eq("company_id", testCompanyId)
      .single();

    expect(error).toBeNull();
    expect((data!.config as any).posting_throttle.enabled).toBe(true);
    expect((data!.config as any).posting_throttle.max_posts).toBe(3);
  });
});

describe("campaigns CRUD", () => {
  let campaignId: string;

  it("can create a campaign", async () => {
    const { data, error } = await adminClient
      .from("campaigns")
      .insert({
        company_id: testCompanyId,
        name: "Test Campaign",
        description: "Integration test campaign",
        created_by: testUser.id,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBeDefined();
    campaignId = data!.id;
  });

  it("can read campaigns for the company", async () => {
    const { data, error } = await adminClient
      .from("campaigns")
      .select("*")
      .eq("company_id", testCompanyId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some((c) => c.name === "Test Campaign")).toBe(true);
  });

  it("can update a campaign", async () => {
    const { error } = await adminClient
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);

    expect(error).toBeNull();
  });

  it("can delete a campaign", async () => {
    const { error } = await adminClient
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    expect(error).toBeNull();
  });
});

describe("journalists table", () => {
  let journalistId: string;

  it("can upsert a journalist", async () => {
    const { data, error } = await adminClient
      .from("journalists")
      .upsert(
        { company_id: testCompanyId, name: "Test Reporter" },
        { onConflict: "company_id,name" }
      )
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBeDefined();
    journalistId = data!.id;
  });

  it("upsert deduplicates by company_id + name", async () => {
    const { data, error } = await adminClient
      .from("journalists")
      .upsert(
        { company_id: testCompanyId, name: "Test Reporter" },
        { onConflict: "company_id,name" }
      )
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBe(journalistId); // Same ID = deduped
  });

  afterAll(async () => {
    await adminClient.from("journalists").delete().eq("id", journalistId);
  });
});
