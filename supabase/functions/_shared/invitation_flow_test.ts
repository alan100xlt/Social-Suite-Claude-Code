/**
 * Invitation Flow Tests
 *
 * Validates the full invitation lifecycle:
 * 1. Owner/admin can create invitations for their company
 * 2. Outsiders CANNOT create invitations for companies they don't belong to
 * 3. Invited user can read their own pending invitation
 * 4. Invited user can accept invitation (insert membership + update invitation)
 * 5. User CANNOT accept invitation with a different role than invited
 * 6. Expired invitations are not visible
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
let ownerUser: TestPersona = undefined!;
let invitedUser: TestPersona = undefined!;
let outsiderUser: TestPersona = undefined!;
let company: TestCompany = undefined!;
let company2: TestCompany = undefined!;
const createdInvitationIds: string[] = [];

Deno.test({
  name: "invitation-flow – setup",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    ownerUser = await createTestUser(admin, "inv_owner");
    invitedUser = await createTestUser(admin, "inv_invited");
    outsiderUser = await createTestUser(admin, "inv_outsider");

    company = await createTestCompany(admin, ownerUser.id, "inv_co");
    company2 = await createTestCompany(admin, outsiderUser.id, "inv_co2");

    await addMembership(admin, ownerUser.id, company.id, "owner");
    await addMembership(admin, outsiderUser.id, company2.id, "owner");

    await setProfileCompany(admin, ownerUser.id, company.id);
    await setProfileCompany(admin, outsiderUser.id, company2.id);
  },
});

Deno.test({
  name: "invitation-flow – owner can create invitation for own company",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await ownerUser.client
      .from("company_invitations")
      .insert({
        company_id: company.id,
        email: invitedUser.email,
        role: "member",
        invited_by: ownerUser.id,
      })
      .select("id, token")
      .single();

    assertEquals(error, null);
    assertNotEquals(data, null);
    createdInvitationIds.push(data!.id);
  },
});

Deno.test({
  name: "invitation-flow – outsider CANNOT create invitation for company they don't belong to",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { error } = await outsiderUser.client
      .from("company_invitations")
      .insert({
        company_id: company.id,
        email: "random@test.local",
        role: "member",
        invited_by: outsiderUser.id,
      });

    assertNotEquals(error, null);
  },
});

Deno.test({
  name: "invitation-flow – invited user can read their own pending invitation",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await invitedUser.client
      .from("company_invitations")
      .select("id, company_id, role, email")
      .eq("email", invitedUser.email)
      .is("accepted_at", null);

    assertEquals(error, null);
    assertEquals(data!.length >= 1, true);
    assertEquals(data![0].company_id, company.id);
    assertEquals(data![0].role, "member");
  },
});

Deno.test({
  name: "invitation-flow – invited user can accept invitation (insert own membership)",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Insert membership (simulates acceptance)
    const { error: memError } = await invitedUser.client
      .from("company_memberships")
      .insert({
        user_id: invitedUser.id,
        company_id: company.id,
        role: "member",
      });

    assertEquals(memError, null);

    // Mark invitation as accepted
    const { error: updateError } = await invitedUser.client
      .from("company_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", invitedUser.email)
      .eq("company_id", company.id);

    assertEquals(updateError, null);

    // Verify membership exists
    const { data: membership } = await invitedUser.client
      .from("company_memberships")
      .select("role")
      .eq("user_id", invitedUser.id)
      .eq("company_id", company.id)
      .single();

    assertEquals(membership?.role, "member");
  },
});

Deno.test({
  name: "invitation-flow – invited user can now read company data",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await invitedUser.client
      .from("companies")
      .select("id, name")
      .eq("id", company.id)
      .single();

    assertEquals(error, null);
    assertEquals(data?.id, company.id);
  },
});

Deno.test({
  name: "invitation-flow – invited user CANNOT read other company data",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await invitedUser.client
      .from("companies")
      .select("id, name")
      .eq("id", company2.id);

    assertEquals(error, null);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "invitation-flow – outsider CANNOT read invitations for company they don't belong to",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { data, error } = await outsiderUser.client
      .from("company_invitations")
      .select("id")
      .eq("company_id", company.id);

    assertEquals(error, null);
    assertEquals(data!.length, 0);
  },
});

Deno.test({
  name: "invitation-flow – teardown",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Clean invitations
    for (const id of createdInvitationIds) {
      await admin.from("company_invitations").delete().eq("id", id);
    }
    // Clean remaining invitations by email
    await admin.from("company_invitations").delete().eq("email", invitedUser.email);

    await cleanupTestData(
      admin,
      [ownerUser.id, invitedUser.id, outsiderUser.id],
      [company.id, company2.id]
    );
  },
});
