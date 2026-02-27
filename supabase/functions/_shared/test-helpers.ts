/**
 * Shared test helpers for Deno-based security tests.
 *
 * Provides utilities to create test users, companies, memberships,
 * and authenticated Supabase clients for each test persona.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * Check that all required env vars are present (including SERVICE_ROLE_KEY).
 * Returns false if missing (tests should skip).
 */
export function envReady(): boolean {
  return !!(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

/**
 * Lighter check: only URL + ANON_KEY needed (no service role).
 * Useful for tests that only call deployed edge functions.
 */
export function envReadyLight(): boolean {
  return !!(SUPABASE_URL && ANON_KEY);
}

export function assertEnvReady(): void {
  if (!envReady()) {
    throw new Error(
      "Missing required env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). " +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env to run security tests locally."
    );
  }
}

/** Admin client with service_role – bypasses RLS */
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon client – no auth, subject to RLS */
export function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Create an authenticated client for a given user (sign-in with email/password) */
export async function getAuthenticatedClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return client;
}

export interface TestPersona {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

export interface TestCompany {
  id: string;
  name: string;
  slug: string;
}

const TEST_PASSWORD = "TestPass123!";
const testPrefix = `test_${Date.now()}_`;

/**
 * Create a test user via the admin API and return the persona.
 * The user is signed-in and an authenticated client is returned.
 */
export async function createTestUser(
  admin: SupabaseClient,
  suffix: string
): Promise<TestPersona> {
  const email = `${testPrefix}${suffix}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  const client = await getAuthenticatedClient(email, TEST_PASSWORD);
  return { id: data.user.id, email, password: TEST_PASSWORD, client };
}

/**
 * Create a test company using the service_role admin client.
 */
export async function createTestCompany(
  admin: SupabaseClient,
  ownerId: string,
  suffix: string
): Promise<TestCompany> {
  const name = `${testPrefix}company_${suffix}`;
  const slug = name.replace(/[^a-z0-9]/g, "-");
  const { data, error } = await admin
    .from("companies")
    .insert({ name, slug, created_by: ownerId })
    .select("id, name, slug")
    .single();
  if (error) throw new Error(`Failed to create company: ${error.message}`);
  return data as TestCompany;
}

/**
 * Add a membership row via service_role.
 */
export async function addMembership(
  admin: SupabaseClient,
  userId: string,
  companyId: string,
  role: "owner" | "admin" | "member"
): Promise<void> {
  const { error } = await admin
    .from("company_memberships")
    .insert({ user_id: userId, company_id: companyId, role });
  if (error) throw new Error(`Failed to add membership: ${error.message}`);
}

/**
 * Also set profiles.company_id so legacy RLS still works during transition.
 */
export async function setProfileCompany(
  admin: SupabaseClient,
  userId: string,
  companyId: string
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ company_id: companyId })
    .eq("id", userId);
  if (error) throw new Error(`Failed to set profile company: ${error.message}`);
}

/**
 * Clean up all test artifacts created during a test run.
 * Deletes memberships, companies, and users created with the test prefix.
 */
export async function cleanupTestData(
  admin: SupabaseClient,
  userIds: string[],
  companyIds: string[]
): Promise<void> {
  // Delete memberships first (FK)
  for (const cid of companyIds) {
    await admin.from("company_memberships").delete().eq("company_id", cid);
  }
  // Delete companies
  for (const cid of companyIds) {
    await admin.from("companies").delete().eq("id", cid);
  }
  // Delete users
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid);
  }
}

/** Build edge-function URL */
export function edgeFunctionUrl(functionName: string): string {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}

/** Get the bearer token from an authenticated client */
export async function getBearerToken(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? "";
}

export { SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY };
