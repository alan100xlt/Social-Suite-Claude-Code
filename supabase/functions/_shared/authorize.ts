import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface AuthResult {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  companyId?: string;
  role?: "owner" | "admin" | "member";
}

export interface AuthorizeOptions {
  /** Roles required in the target company. If empty/undefined, any membership suffices. */
  requiredRoles?: ("owner" | "admin" | "member")[];
  /** The company ID to check membership against. */
  companyId?: string;
  /** If true, only superadmins may proceed. */
  superadminOnly?: boolean;
  /** If true, skip all auth checks (for service-role / cron endpoints). */
  allowServiceRole?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Central RBAC authorization for all edge functions.
 *
 * Returns an AuthResult on success, or throws a Response (401/403) on failure.
 * Callers should catch the thrown Response and return it directly.
 *
 * Usage:
 * ```ts
 * try {
 *   const auth = await authorize(req, { companyId, requiredRoles: ['owner', 'admin'] });
 * } catch (res) {
 *   if (res instanceof Response) return res;
 *   throw res;
 * }
 * ```
 */
export async function authorize(
  req: Request,
  options: AuthorizeOptions = {}
): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");

  // --- Service role bypass ---
  if (options.allowServiceRole) {
    // If there's a service_role key or anon key in the auth header, allow through
    // The anon key check is needed because pg_cron jobs use the anon key
    if (
      (supabaseServiceKey && authHeader?.includes(supabaseServiceKey)) ||
      (supabaseAnonKey && authHeader?.includes(supabaseAnonKey))
    ) {
      return {
        userId: "service_role",
        email: "service_role",
        isSuperAdmin: false,
      };
    }
  }

  // --- JWT validation ---
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: missing auth header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData?.user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = userData.user.id;
  const email = userData.user.email || "";

  // --- Superadmin check ---
  const { data: isSuperAdmin } = await userClient.rpc("is_superadmin");
  const superAdmin = !!isSuperAdmin;

  if (options.superadminOnly && !superAdmin) {
    throw new Response(
      JSON.stringify({ error: "Forbidden: superadmin access required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Superadmins bypass company/role checks
  if (superAdmin) {
    return { userId, email, isSuperAdmin: true, companyId: options.companyId };
  }

  // --- Company membership + role check ---
  if (options.companyId) {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: membership, error: memberError } = await adminClient
      .from("company_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", options.companyId)
      .maybeSingle();

    if (memberError || !membership) {
      throw new Response(
        JSON.stringify({ error: "Forbidden: not a member of this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = membership.role as "owner" | "admin" | "member";

    if (
      options.requiredRoles &&
      options.requiredRoles.length > 0 &&
      !options.requiredRoles.includes(role)
    ) {
      throw new Response(
        JSON.stringify({
          error: `Forbidden: requires one of [${options.requiredRoles.join(", ")}], you have [${role}]`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return { userId, email, isSuperAdmin: false, companyId: options.companyId, role };
  }

  // No company check required, just authenticated
  return { userId, email, isSuperAdmin: false };
}

/** Reusable CORS headers for edge functions */
export { corsHeaders };
