import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a bootstrap secret to authorize this sensitive operation
    const bootstrapSecret = Deno.env.get("BOOTSTRAP_SECRET");
    if (!bootstrapSecret) {
      return new Response(
        JSON.stringify({ error: "BOOTSTRAP_SECRET not configured. This function is disabled." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { secret, password } = await req.json().catch(() => ({ secret: null, password: null }));

    if (!secret || secret !== bootstrapSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized – invalid bootstrap secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "A password with at least 8 characters is required in the request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find the superadmin user
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const superadminUser = users.users.find(u => u.email === "superadmin@getlate.dev");
    
    if (!superadminUser) {
      return new Response(
        JSON.stringify({ error: "Superadmin user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset password using the caller-provided value
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      superadminUser.id,
      { password }
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Superadmin password has been reset" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
