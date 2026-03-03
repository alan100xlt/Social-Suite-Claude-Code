import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  deleteTestCompany,
  signInAsUser,
} from "./setup";

describe("Company creation flow", () => {
  let user: { id: string; email: string };
  let createdCompanyId: string | null = null;

  beforeAll(async () => {
    user = await createTestUser("company-creation");
  });

  afterAll(async () => {
    // Clean up media company data
    if (createdCompanyId) {
      const { data: mcChildren } = await adminClient
        .from("media_company_children")
        .select("parent_company_id")
        .eq("child_company_id", createdCompanyId);

      if (mcChildren && mcChildren.length > 0) {
        for (const child of mcChildren) {
          await adminClient
            .from("media_company_members")
            .delete()
            .eq("media_company_id", child.parent_company_id);
          await adminClient
            .from("media_company_children")
            .delete()
            .eq("parent_company_id", child.parent_company_id);
          await adminClient
            .from("media_companies")
            .delete()
            .eq("id", child.parent_company_id);
        }
      }
      await deleteTestCompany(createdCompanyId);
    }
    await deleteTestUser(user.id);
  });

  test("creates company + membership via service role", async () => {
    // Simulate the company creation flow using admin client
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: "Integration Test Co",
        slug: `integ-test-${Date.now()}`,
        created_by: user.id,
      })
      .select()
      .single();

    expect(companyError).toBeNull();
    expect(company).toBeTruthy();
    createdCompanyId = company!.id;

    // Add membership
    const { error: membershipError } = await adminClient
      .from("company_memberships")
      .insert({
        user_id: user.id,
        company_id: company!.id,
        role: "owner",
      });
    expect(membershipError).toBeNull();

    // Update profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ company_id: company!.id })
      .eq("id", user.id);
    expect(profileError).toBeNull();

    // Verify user can now see the company
    const { client } = await signInAsUser(user.email);
    const { data: visible, error: visError } = await client
      .from("companies")
      .select("id")
      .eq("id", company!.id);
    expect(visError).toBeNull();
    expect(visible).toHaveLength(1);
  });

  test("user_is_member returns true after membership created", async () => {
    if (!createdCompanyId) return;

    const { data, error } = await adminClient.rpc("user_is_member", {
      _user_id: user.id,
      _company_id: createdCompanyId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  test("user_is_member returns false for non-member", async () => {
    if (!createdCompanyId) return;

    const { data, error } = await adminClient.rpc("user_is_member", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _company_id: createdCompanyId,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
