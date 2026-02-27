/**
 * Tenant Isolation Tests
 *
 * Validates that RLS on company_memberships correctly isolates data.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env to run.
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

Deno.test({
  name: "tenant-isolation – setup",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    userA = await createTestUser(admin, "iso_a");
    userB = await createTestUser(admin, "iso_b");

    companyA = await createTestCompany(admin, userA.id, "iso_a");
    companyB = await createTestCompany(admin, userB.id, "iso_b");

    await addMembership(admin, userA.id, companyA.id, "owner");
    await addMembership(admin, userB.id, companyB.id, "owner");

    await setProfileCompany(admin, userA.id, companyA.id);
    await setProfileCompany(admin, userB.id, companyB.id);
  },
});

Deno.test({
  name: "tenant-isolation – user A can read own membership",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await userA.client
      .from("company_memberships")
      .select("*")
      .eq("user_id", userA.id);
    assertEquals(error, null);
    assertEquals(data!.length, 1);
    assertEquals(data![0].company_id, companyA.id);
  },
});

Deno.test({
  name: "tenant-isolation – user A CANNOT read user B memberships",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await userA.client
      .from("company_memberships")
      .select("*")
      .eq("user_id", userB.id);
    assertEquals(error, null);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "tenant-isolation – user A CANNOT insert membership for another user",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await userA.client
      .from("company_memberships")
      .insert({ user_id: userB.id, company_id: companyA.id, role: "member" });
    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "tenant-isolation – user A CANNOT update own role",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("company_memberships")
      .update({ role: "admin" })
      .eq("user_id", userA.id)
      .eq("company_id", companyA.id)
      .select();
    if (data) assertEquals(data.length, 0);
  },
});

Deno.test({
  name: "tenant-isolation – user A CANNOT delete own membership",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await userA.client
      .from("company_memberships")
      .delete()
      .eq("user_id", userA.id)
      .eq("company_id", companyA.id)
      .select();
    if (data) assertEquals(data.length, 0);
  },
});

Deno.test({
  name: "tenant-isolation – service_role CAN manage memberships",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error: insertErr } = await admin
      .from("company_memberships")
      .insert({ user_id: userA.id, company_id: companyB.id, role: "member" });
    assertEquals(insertErr, null);

    const { error: updateErr } = await admin
      .from("company_memberships")
      .update({ role: "admin" })
      .eq("user_id", userA.id)
      .eq("company_id", companyB.id);
    assertEquals(updateErr, null);

    const { error: deleteErr } = await admin
      .from("company_memberships")
      .delete()
      .eq("user_id", userA.id)
      .eq("company_id", companyB.id);
    assertEquals(deleteErr, null);
  },
});

Deno.test({
  name: "tenant-isolation – user can insert own membership (invitation acceptance)",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await userA.client
      .from("company_memberships")
      .insert({ user_id: userA.id, company_id: companyB.id, role: "member" });
    assertEquals(error, null);

    // Cleanup
    await admin
      .from("company_memberships")
      .delete()
      .eq("user_id", userA.id)
      .eq("company_id", companyB.id);
  },
});

Deno.test({
  name: "tenant-isolation – teardown",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await cleanupTestData(admin, [userA.id, userB.id], [companyA.id, companyB.id]);
  },
});
