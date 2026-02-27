/**
 * Role Escalation & Privilege Tests
 *
 * Validates that:
 * 1. A member CANNOT escalate their own role
 * 2. A member CANNOT grant roles to others
 * 3. Users cannot insert memberships for other users
 * 4. Only service_role can modify memberships (update/delete)
 * 5. Global settings are protected (only superadmin/service_role)
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
let memberUser: TestPersona = undefined!;
let adminUser: TestPersona = undefined!;
let outsiderUser: TestPersona = undefined!;
let company: TestCompany = undefined!;

Deno.test({
  name: "role-escalation – setup",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    memberUser = await createTestUser(admin, "re_member");
    adminUser = await createTestUser(admin, "re_admin");
    outsiderUser = await createTestUser(admin, "re_outsider");

    company = await createTestCompany(admin, adminUser.id, "re_co");

    await addMembership(admin, adminUser.id, company.id, "admin");
    await addMembership(admin, memberUser.id, company.id, "member");

    await setProfileCompany(admin, adminUser.id, company.id);
    await setProfileCompany(admin, memberUser.id, company.id);
  },
});

Deno.test({
  name: "role-escalation – member CANNOT update own role to owner",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await memberUser.client
      .from("company_memberships")
      .update({ role: "owner" })
      .eq("user_id", memberUser.id)
      .eq("company_id", company.id)
      .select();

    // Should be empty — no UPDATE policy for regular users
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – member CANNOT update own role to admin",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await memberUser.client
      .from("company_memberships")
      .update({ role: "admin" })
      .eq("user_id", memberUser.id)
      .eq("company_id", company.id)
      .select();

    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – member CANNOT insert membership for another user",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await memberUser.client
      .from("company_memberships")
      .insert({
        user_id: outsiderUser.id,
        company_id: company.id,
        role: "member",
      });

    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "role-escalation – admin CANNOT update memberships (no UPDATE policy for users)",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await adminUser.client
      .from("company_memberships")
      .update({ role: "owner" })
      .eq("user_id", memberUser.id)
      .eq("company_id", company.id)
      .select();

    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – admin CANNOT delete memberships",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await adminUser.client
      .from("company_memberships")
      .delete()
      .eq("user_id", memberUser.id)
      .eq("company_id", company.id)
      .select();

    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – regular user CANNOT read global_email_settings",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await memberUser.client
      .from("global_email_settings")
      .select("id");

    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – regular user CANNOT read global_voice_defaults",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data } = await memberUser.client
      .from("global_voice_defaults")
      .select("id");

    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "role-escalation – regular user CANNOT write global_email_settings",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await memberUser.client
      .from("global_email_settings")
      .insert({ sender_name: "Hacked" });

    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "role-escalation – teardown",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await cleanupTestData(
      admin,
      [memberUser.id, adminUser.id, outsiderUser.id],
      [company.id]
    );
  },
});
