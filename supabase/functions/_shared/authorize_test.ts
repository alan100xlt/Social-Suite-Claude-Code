/**
 * Tests for the shared authorize() RBAC module.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env to run.
 * Tests are skipped if the env var is missing.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  getAdminClient,
  createTestUser,
  createTestCompany,
  addMembership,
  setProfileCompany,
  cleanupTestData,
  getBearerToken,
  envReady,
  SERVICE_ROLE_KEY,
  type TestPersona,
  type TestCompany,
} from "./test-helpers.ts";

import { authorize } from "./authorize.ts";

const skip = !envReady();

// ── helpers ─────────────────────────────────────────────────────────────
function fakeReq(token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("https://fake.local", { headers });
}

function serviceRoleReq(): Request {
  return new Request("https://fake.local", {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}

// ── test fixtures ───────────────────────────────────────────────────────
let admin: ReturnType<typeof getAdminClient> = undefined!;
let ownerUser: TestPersona = undefined!;
let memberUser: TestPersona = undefined!;
let outsiderUser: TestPersona = undefined!;
let company1: TestCompany = undefined!;
let company2: TestCompany = undefined!;

Deno.test({
  name: "authorize – setup fixtures",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    admin = getAdminClient();
    ownerUser = await createTestUser(admin, "auth_owner");
    memberUser = await createTestUser(admin, "auth_member");
    outsiderUser = await createTestUser(admin, "auth_outsider");

    company1 = await createTestCompany(admin, ownerUser.id, "auth1");
    company2 = await createTestCompany(admin, outsiderUser.id, "auth2");

    await addMembership(admin, ownerUser.id, company1.id, "owner");
    await addMembership(admin, memberUser.id, company1.id, "member");
    await addMembership(admin, outsiderUser.id, company2.id, "owner");

    await setProfileCompany(admin, ownerUser.id, company1.id);
    await setProfileCompany(admin, memberUser.id, company1.id);
    await setProfileCompany(admin, outsiderUser.id, company2.id);
  },
});

Deno.test({
  name: "authorize – rejects missing auth header with 401",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    try {
      await authorize(fakeReq(), {});
      throw new Error("should have thrown");
    } catch (e) {
      if (e instanceof Response) {
        assertEquals(e.status, 401);
        await e.text();
      } else throw e;
    }
  },
});

Deno.test({
  name: "authorize – rejects invalid token with 401",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    try {
      await authorize(fakeReq("invalid.jwt.token"), {});
      throw new Error("should have thrown");
    } catch (e) {
      if (e instanceof Response) {
        assertEquals(e.status, 401);
        await e.text();
      } else throw e;
    }
  },
});

Deno.test({
  name: "authorize – allows authenticated user with no company requirement",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const token = await getBearerToken(memberUser.client);
    const result = await authorize(fakeReq(token), {});
    assertEquals(result.userId, memberUser.id);
    assertEquals(result.isSuperAdmin, false);
  },
});

Deno.test({
  name: "authorize – allows owner with requiredRoles=[owner]",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const token = await getBearerToken(ownerUser.client);
    const result = await authorize(fakeReq(token), {
      companyId: company1.id,
      requiredRoles: ["owner"],
    });
    assertEquals(result.role, "owner");
    assertEquals(result.companyId, company1.id);
  },
});

Deno.test({
  name: "authorize – rejects member when requiredRoles=[owner, admin]",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const token = await getBearerToken(memberUser.client);
    try {
      await authorize(fakeReq(token), {
        companyId: company1.id,
        requiredRoles: ["owner", "admin"],
      });
      throw new Error("should have thrown");
    } catch (e) {
      if (e instanceof Response) {
        assertEquals(e.status, 403);
        await e.text();
      } else throw e;
    }
  },
});

Deno.test({
  name: "authorize – rejects outsider accessing company1",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const token = await getBearerToken(outsiderUser.client);
    try {
      await authorize(fakeReq(token), { companyId: company1.id });
      throw new Error("should have thrown");
    } catch (e) {
      if (e instanceof Response) {
        assertEquals(e.status, 403);
        await e.text();
      } else throw e;
    }
  },
});

Deno.test({
  name: "authorize – service role bypass works",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const result = await authorize(serviceRoleReq(), { allowServiceRole: true });
    assertEquals(result.userId, "service_role");
  },
});

Deno.test({
  name: "authorize – superadminOnly rejects non-superadmin",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const token = await getBearerToken(ownerUser.client);
    try {
      await authorize(fakeReq(token), { superadminOnly: true });
      throw new Error("should have thrown");
    } catch (e) {
      if (e instanceof Response) {
        assertEquals(e.status, 403);
        await e.text();
      } else throw e;
    }
  },
});

Deno.test({
  name: "authorize – teardown fixtures",
  ignore: skip,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await cleanupTestData(
      admin,
      [ownerUser.id, memberUser.id, outsiderUser.id],
      [company1.id, company2.id]
    );
  },
});
