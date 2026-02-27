import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorize(req, { superadminOnly: true });

    const { companyIds } = await req.json();
    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "companyIds must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete related data in order (respecting foreign keys)
    const tables = [
      "post_analytics_snapshots",
      "account_analytics_snapshots",
      "automation_logs",
      "automation_rules",
      "rss_feed_items",  // depends on rss_feeds, handled via cascade or manual
      "rss_feeds",
      "post_approvals",
      "post_drafts",
      "api_call_logs",
      "company_voice_settings",
      "company_email_settings",
      "company_invitations",
      "company_memberships",
      "discovery_leads",
      "companies",
    ];

    // rss_feed_items don't have company_id directly, delete via feed_id
    const { data: feedIds } = await supabaseAdmin
      .from("rss_feeds")
      .select("id")
      .in("company_id", companyIds);

    if (feedIds && feedIds.length > 0) {
      const ids = feedIds.map((f: any) => f.id);
      await supabaseAdmin.from("rss_feed_items").delete().in("feed_id", ids);
    }

    const errors: string[] = [];
    for (const table of tables) {
      if (table === "rss_feed_items") continue; // already handled
      const col = table === "companies" ? "id" : "company_id";
      const { error } = await supabaseAdmin.from(table).delete().in(col, companyIds);
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message);
        errors.push(`${table}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ warning: "Some deletions had errors", errors }),
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deleted: companyIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("admin-delete-companies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
