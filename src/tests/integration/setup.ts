import { createClient } from "@supabase/supabase-js";

// Integration tests connect to the real Supabase project.
// Uses service role key for admin operations (user creation, cleanup).
// Uses anon key for testing RLS policies from a user's perspective.

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_URL environment variable"
  );
}
if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}
if (!supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable"
  );
}

// Service role client — bypasses RLS, used for setup/cleanup
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon client — respects RLS, used for testing user-facing queries
export const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Test user management
const TEST_EMAIL_PREFIX = "integration-test-";
const TEST_EMAIL_DOMAIN = "@test.longtale.ai";

export function testEmail(label: string): string {
  return `${TEST_EMAIL_PREFIX}${label}-${Date.now()}${TEST_EMAIL_DOMAIN}`;
}

export async function createTestUser(
  label: string
): Promise<{ id: string; email: string }> {
  const email = testEmail(label);
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: "test-password-123!",
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return { id: data.user.id, email };
}

export async function deleteTestUser(userId: string): Promise<void> {
  // Clean up memberships and profile first (cascade may handle some)
  await adminClient
    .from("company_memberships")
    .delete()
    .eq("user_id", userId);
  await adminClient.from("profiles").delete().eq("id", userId);
  await adminClient.auth.admin.deleteUser(userId);
}

export async function deleteTestCompany(companyId: string): Promise<void> {
  // Clean up related data
  await adminClient
    .from("automation_rules")
    .delete()
    .eq("company_id", companyId);
  await adminClient.from("rss_feeds").delete().eq("company_id", companyId);
  await adminClient
    .from("company_memberships")
    .delete()
    .eq("company_id", companyId);
  await adminClient
    .from("media_company_children")
    .delete()
    .eq("child_company_id", companyId);
  await adminClient.from("companies").delete().eq("id", companyId);
}

export async function createTestCompany(
  name: string,
  userId: string
): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const { data, error } = await adminClient
    .from("companies")
    .insert({ name, slug, created_by: userId })
    .select("id")
    .single();
  if (error)
    throw new Error(`Failed to create test company: ${error.message}`);
  return data.id;
}

export async function addMembership(
  userId: string,
  companyId: string,
  role: string = "member"
): Promise<void> {
  const { error } = await adminClient
    .from("company_memberships")
    .insert({ user_id: userId, company_id: companyId, role });
  if (error) throw new Error(`Failed to add membership: ${error.message}`);
}

// Sign in as a specific user (returns a client authenticated as that user)
export async function signInAsUser(email: string) {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password: "test-password-123!",
  });
  if (error) throw new Error(`Failed to sign in: ${error.message}`);

  // Create a new client with the user's session
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  const userClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  });

  return { client: userClient, session: data.session, user: data.user };
}
