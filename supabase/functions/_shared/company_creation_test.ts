/**
 * Company Creation Tests
 *
 * Validates:
 * 1. Authenticated user can create a company (created_by = self)
 * 2. User CANNOT create a company on behalf of another user
 * 3. After creating a company, user can add themselves as owner
 * 4. Company data is isolated — other users can't see it without membership
 * 5. Company slug uniqueness is enforced
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  getAdminClient,
  createTestUser,
  cleanupTestData,
  envReady,
  type TestPersona,
} from "./test-helpers.ts";

const skip = !envReady();

let admin: ReturnType<typeof getAdminClient> = undefined!;
let userA: TestPersona = undefined!;
let userB: TestPersona = undefined!;
const createdCompanyIds: string[] = [];

Deno.test({
  name: "company-creation – setup",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    userA = await createTestUser(admin, "cc_a");
    userB = await createTestUser(admin, "cc_b");
  },
});

Deno.test({
  name: "company-creation – user can create company with created_by = self",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const slug = `test-cc-${Date.now()}`;
    const { data, error } = await userA.client
      .from("companies")
      .insert({
        name: "Test Company A",
        slug,
        created_by: userA.id,
      })
      .select("id, name, slug")
      .single();

    assertEquals(error, null);
    assertNotEquals(data, null);
    createdCompanyIds.push(data!.id);
  },
});

Deno.test({
  name: "company-creation – user CANNOT create company with created_by = another user",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const slug = `test-cc-fake-${Date.now()}`;
    const { error } = await userA.client
      .from("companies")
      .insert({
        name: "Fake Company",
        slug,
        created_by: userB.id, // Trying to impersonate userB
      });

    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "company-creation – creator can add self as owner membership",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const companyId = createdCompanyIds[0];
    const { error } = await userA.client
      .from("company_memberships")
      .insert({
        user_id: userA.id,
        company_id: companyId,
        role: "owner",
      });

    assertEquals(error, null);
  },
});

Deno.test({
  name: "company-creation – creator can now read their company",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const companyId = createdCompanyIds[0];
    const { data, error } = await userA.client
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single();

    assertEquals(error, null);
    assertEquals(data?.id, companyId);
  },
});

Deno.test({
  name: "company-creation – other user CANNOT see company without membership",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const companyId = createdCompanyIds[0];
    const { data, error } = await userB.client
      .from("companies")
      .select("id, name")
      .eq("id", companyId);

    assertEquals(error, null);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "company-creation – duplicate slug is rejected",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Get the slug of the first company
    const { data: existing } = await admin
      .from("companies")
      .select("slug")
      .eq("id", createdCompanyIds[0])
      .single();

    const { error } = await userB.client
      .from("companies")
      .insert({
        name: "Duplicate Slug Co",
        slug: existing!.slug,
        created_by: userB.id,
      });

    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "company-creation – user CANNOT update company they don't belong to",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const companyId = createdCompanyIds[0];
    const { data } = await userB.client
      .from("companies")
      .update({ name: "Hacked Name" })
      .eq("id", companyId)
      .select();

    // Should return empty — RLS prevents the update
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "company-creation – teardown",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await cleanupTestData(admin, [userA.id, userB.id], createdCompanyIds);
  },
});
