import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/authorize.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bootstrapSecret = Deno.env.get("BOOTSTRAP_SECRET");
    if (!bootstrapSecret) {
      return new Response(
        JSON.stringify({ error: "BOOTSTRAP_SECRET not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { secret, emails } = await req.json().catch(() => ({ secret: null, emails: null }));

    if (!secret || secret !== bootstrapSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "emails array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const email of emails) {
      try {
        // Check if user already exists
        const { data: users } = await adminClient.auth.admin.listUsers();
        const existing = users?.users?.find((u) => u.email === email);

        let userId: string;

        if (existing) {
          userId = existing.id;
          results.push({ email, status: "existing_user" });
        } else {
          // Create user with a temporary password; they'll reset via email
          const tempPassword = crypto.randomUUID() + "Aa1!";
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: email.split("@")[0] },
          });

          if (createErr || !newUser.user) {
            results.push({ email, status: "error", error: createErr?.message || "Failed to create" });
            continue;
          }
          userId = newUser.user.id;
          results.push({ email, status: "created" });
        }

        // Add to superadmins table (upsert to avoid duplicates)
        const { error: saError } = await adminClient
          .from("superadmins")
          .upsert({ user_id: userId }, { onConflict: "user_id" });

        if (saError) {
          results.push({ email, status: "superadmin_insert_error", error: saError.message });
          continue;
        }

        // Send password reset email so they can set their own password
        // Use the published domain so the link lands on our /reset-password page
        const siteUrl = Deno.env.get("SITE_URL") || "https://social.longtale.ai";
        const { error: resetErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${siteUrl}/reset-password` },
        });

        if (resetErr) {
          // Non-fatal: user exists and is superadmin, just can't send reset
          console.warn(`Could not generate recovery for ${email}:`, resetErr.message);
        }
      } catch (err: any) {
        results.push({ email, status: "error", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
