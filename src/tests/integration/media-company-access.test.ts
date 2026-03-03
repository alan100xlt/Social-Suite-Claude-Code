import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  deleteTestCompany,
  addMembership,
} from "./setup";

describe("Media company hierarchy access", () => {
  let adminUser: { id: string; email: string };
  let otherUser: { id: string; email: string };
  let childCompanyId: string;
  let mediaCompanyId: string;

  beforeAll(async () => {
    adminUser = await createTestUser("mc-admin");
    otherUser = await createTestUser("mc-other");

    // Create child company
    childCompanyId = await createTestCompany("MC Child Co", adminUser.id);

    // Create media company
    const { data: mc } = await adminClient
      .from("media_companies")
      .insert({ name: "Test Media Group" })
      .select("id")
      .single();
    mediaCompanyId = mc!.id;

    // Add admin as media company member
    await adminClient.from("media_company_members").insert({
      media_company_id: mediaCompanyId,
      user_id: adminUser.id,
      role: "admin",
      is_active: true,
    });

    // Link child company
    await adminClient.from("media_company_children").insert({
      parent_company_id: mediaCompanyId,
      child_company_id: childCompanyId,
      relationship_type: "owned",
    });
  });

  afterAll(async () => {
    await adminClient
      .from("media_company_members")
      .delete()
      .eq("media_company_id", mediaCompanyId);
    await adminClient
      .from("media_company_children")
      .delete()
      .eq("parent_company_id", mediaCompanyId);
    await adminClient
      .from("media_companies")
      .delete()
      .eq("id", mediaCompanyId);
    await deleteTestCompany(childCompanyId);
    await deleteTestUser(adminUser.id);
    await deleteTestUser(otherUser.id);
  });

  test("media company admin can access child company via user_is_member", async () => {
    const { data, error } = await adminClient.rpc("user_is_member", {
      _user_id: adminUser.id,
      _company_id: childCompanyId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  test("non-member cannot access child company via user_is_member", async () => {
    const { data, error } = await adminClient.rpc("user_is_member", {
      _user_id: otherUser.id,
      _company_id: childCompanyId,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  test("user_belongs_to_company delegates to user_is_member", async () => {
    const { data, error } = await adminClient.rpc("user_belongs_to_company", {
      _user_id: adminUser.id,
      _company_id: childCompanyId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });
});
