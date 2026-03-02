import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to verify the JWT and get user info
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "Missing companyId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify company exists and is unclaimed (no created_by)
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, created_by")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (company.created_by) {
      // Already claimed — check if it's the same user
      if (company.created_by === userId) {
        return new Response(
          JSON.stringify({ success: true, alreadyClaimed: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Company already claimed by another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Claim the company
    const { error: updateError } = await adminClient
      .from("companies")
      .update({ created_by: userId })
      .eq("id", companyId);

    if (updateError) {
      console.error("Claim update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create company membership (owner)
    const { error: membershipError } = await adminClient
      .from("company_memberships")
      .insert({ user_id: userId, company_id: companyId, role: "owner" });

    if (membershipError) {
      console.error("Membership creation error:", membershipError);
      // Non-fatal — user can still proceed
    }

    // Create a default automation rule
    if (userEmail) {
      await adminClient.from("automation_rules").insert({
        company_id: companyId,
        name: "Create Social Posts",
        is_active: true,
        feed_id: null,
        objective: "auto",
        action: "send_approval",
        approval_emails: [userEmail],
        account_ids: [],
      });
    }

    // Auto-create a media company with the same name
    try {
      const { data: companyData } = await adminClient
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      if (companyData?.name) {
        const { data: mc, error: mcError } = await adminClient
          .from("media_companies")
          .insert({ name: companyData.name })
          .select("id")
          .single();

        if (!mcError && mc) {
          await adminClient.from("media_company_children").insert({
            parent_company_id: mc.id,
            child_company_id: companyId,
            relationship_type: "owned",
          });

          await adminClient.from("media_company_members").insert({
            media_company_id: mc.id,
            user_id: userId,
            role: "admin",
          });
        }
      }
    } catch (mcErr) {
      console.error("Failed to auto-create media company:", mcErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("claim-discovery-company error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
