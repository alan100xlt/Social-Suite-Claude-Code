import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the approval
    const { data: approval, error: fetchError } = await supabase
      .from("post_approvals")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !approval) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (approval.status !== "pending") {
      return new Response(JSON.stringify({ error: "Already processed", status: approval.status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(approval.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This approval link has expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as approved
    const { error: updateError } = await supabase
      .from("post_approvals")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", approval.id);

    if (updateError) throw updateError;

    // Auto-publish: call getlate-posts for each account
    const GETLATE_API_KEY = Deno.env.get("GETLATE_API_KEY");
    const platformContents = approval.platform_contents as Record<string, string>;
    const accountIds = approval.selected_account_ids as string[];
    const mediaItems = approval.image_url ? [{ url: approval.image_url, type: "image" }] : undefined;

    // Get accounts to map account ID -> platform
    const publishResults: Array<{ accountId: string; success: boolean; error?: string }> = [];

    if (GETLATE_API_KEY && accountIds.length > 0) {
      // We need to know each account's platform to pick the right content
      // Call getlate-accounts to get account details
      const accountsRes = await fetch(`${supabaseUrl}/functions/v1/getlate-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ action: "list" }),
      });

      let accountsData: Array<{ id: string; platform: string }> = [];
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        accountsData = data.accounts || [];
      }

      const linkAsCommentPrefs = (approval.link_as_comment as Record<string, boolean>) || {};

      for (const accountId of accountIds) {
        const account = accountsData.find((a: { id: string }) => a.id === accountId);
        const platform = account?.platform || "";
        const text = platformContents[platform] || Object.values(platformContents)[0] || "";

        // For Instagram/Facebook accounts, check link_as_comment preference
        const articleLink = approval.article_link;
        const shouldFirstComment = articleLink && (
          linkAsCommentPrefs[platform] ?? (platform === "instagram")
        );
        const platforms = shouldFirstComment
          ? [{
              platform,
              accountId,
              content: text,
              platformSpecificData: {
                firstComment: `Read the full article here: ${articleLink}`,
              },
            }]
          : undefined;

        try {
          const postRes = await fetch(`${supabaseUrl}/functions/v1/getlate-posts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              action: "create",
              accountIds: [accountId],
              text,
              mediaItems,
              publishNow: true,
              source: "getlate",
              objective: approval.objective,
              platforms,
            }),
          });

          if (postRes.ok) {
            publishResults.push({ accountId, success: true });
          } else {
            const err = await postRes.text();
            publishResults.push({ accountId, success: false, error: err });
          }
        } catch (e) {
          publishResults.push({ accountId, success: false, error: String(e) });
        }
      }
    }

    // Notify the creator that their post was approved and published
    const COURIER_AUTH_TOKEN = Deno.env.get("COURIER_AUTH_TOKEN");
    if (COURIER_AUTH_TOKEN && approval.created_by) {
      fetch(`${supabaseUrl}/functions/v1/send-in-app-notification`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: approval.created_by,
          title: "✅ Post Approved & Published",
          body: `Your post${approval.article_title ? ` for "${approval.article_title}"` : ""} has been approved and published.`,
          actionUrl: "/posts",
        }),
      }).catch(e => console.error("In-app notification error:", e));
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Posts approved and published",
      publishResults,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("approve-posts error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
