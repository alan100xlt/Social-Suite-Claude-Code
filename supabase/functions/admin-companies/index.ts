import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authorize(req, { superadminOnly: true });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all companies
    const { data: companies, error: compError } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug, onboarding_status, onboarding_step, created_at, website_url, getlate_profile_id, branding")
      .order("created_at", { ascending: false });

    if (compError) throw compError;

    const companyIds = companies.map((c: any) => c.id);

    // Parallel queries for aggregation
    const [
      membershipsRes,
      invitationsRes,
      discoveryRes,
      postsLast7Res,
      postsTotalRes,
      lastLoginRes,
    ] = await Promise.all([
      // Verified members per company
      supabaseAdmin
        .from("company_memberships")
        .select("company_id, user_id")
        .in("company_id", companyIds),

      // Pending invitations per company
      supabaseAdmin
        .from("company_invitations")
        .select("company_id, email, accepted_at")
        .in("company_id", companyIds),

      // Discovery leads (social channels found)
      supabaseAdmin
        .from("discovery_leads")
        .select("company_id, social_channels")
        .in("company_id", companyIds),

      // Posts published in last 7 days (from post_analytics_snapshots, distinct post_id)
      supabaseAdmin
        .from("post_analytics_snapshots")
        .select("company_id, post_id, published_at")
        .in("company_id", companyIds)
        .gte("published_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Total posts (distinct post_id per company)
      supabaseAdmin
        .from("post_analytics_snapshots")
        .select("company_id, post_id")
        .in("company_id", companyIds),

      // Last sign-in per user from auth.users (via admin API)
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    // Build lookup maps
    const membersByCompany: Record<string, Set<string>> = {};
    for (const m of membershipsRes.data || []) {
      if (!membersByCompany[m.company_id]) membersByCompany[m.company_id] = new Set();
      membersByCompany[m.company_id].add(m.user_id);
    }

    const invitationsByCompany: Record<string, { pending: number; accepted: number }> = {};
    for (const inv of invitationsRes.data || []) {
      if (!invitationsByCompany[inv.company_id]) invitationsByCompany[inv.company_id] = { pending: 0, accepted: 0 };
      if (inv.accepted_at) {
        invitationsByCompany[inv.company_id].accepted++;
      } else {
        invitationsByCompany[inv.company_id].pending++;
      }
    }

    const connectionsByCompany: Record<string, { found: number }> = {};
    for (const dl of discoveryRes.data || []) {
      const channels = Array.isArray(dl.social_channels) ? dl.social_channels.length : 0;
      if (!connectionsByCompany[dl.company_id]) connectionsByCompany[dl.company_id] = { found: 0 };
      connectionsByCompany[dl.company_id].found += channels;
    }

    // Count distinct post_ids per company for last 7 days
    const postsLast7ByCompany: Record<string, Set<string>> = {};
    for (const p of postsLast7Res.data || []) {
      if (!postsLast7ByCompany[p.company_id]) postsLast7ByCompany[p.company_id] = new Set();
      postsLast7ByCompany[p.company_id].add(p.post_id);
    }

    // Count distinct post_ids per company total
    const postsTotalByCompany: Record<string, Set<string>> = {};
    for (const p of postsTotalRes.data || []) {
      if (!postsTotalByCompany[p.company_id]) postsTotalByCompany[p.company_id] = new Set();
      postsTotalByCompany[p.company_id].add(p.post_id);
    }

    // Map user last_sign_in_at by user_id
    const lastSignInByUser: Record<string, string | null> = {};
    for (const u of lastLoginRes.data?.users || []) {
      lastSignInByUser[u.id] = u.last_sign_in_at || null;
    }

    // For each company, find the most recent login among its members
    const lastLoginByCompany: Record<string, string | null> = {};
    for (const [companyId, memberSet] of Object.entries(membersByCompany)) {
      let latest: string | null = null;
      for (const userId of memberSet) {
        const signIn = lastSignInByUser[userId];
        if (signIn && (!latest || signIn > latest)) {
          latest = signIn;
        }
      }
      lastLoginByCompany[companyId] = latest;
    }

    // Count connected accounts and active status from cached is_active field
    const { data: connectedAccounts } = await supabaseAdmin
      .from("account_analytics_snapshots")
      .select("company_id, account_id, is_active")
      .in("company_id", companyIds);

    const connectedByCompany: Record<string, { total: Set<string>; active: Set<string> }> = {};
    for (const a of connectedAccounts || []) {
      if (!connectedByCompany[a.company_id]) connectedByCompany[a.company_id] = { total: new Set(), active: new Set() };
      connectedByCompany[a.company_id].total.add(a.account_id);
      if (a.is_active) {
        connectedByCompany[a.company_id].active.add(a.account_id);
      }
    }

    // Assemble response
    const result = companies.map((c: any) => {
      const members = membersByCompany[c.id]?.size || 0;
      const invitations = invitationsByCompany[c.id] || { pending: 0, accepted: 0 };
      const connections = connectedByCompany[c.id]?.active?.size || 0;
      const connectionsTotal = connectedByCompany[c.id]?.total?.size || 0;
      const connectionsFound = connectionsByCompany[c.id]?.found || 0;
      const postsLast7 = postsLast7ByCompany[c.id]?.size || 0;
      const postsTotal = postsTotalByCompany[c.id]?.size || 0;
      const lastLogin = lastLoginByCompany[c.id] || null;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        website_url: c.website_url,
        onboarding_status: c.onboarding_status,
        onboarding_step: c.onboarding_step,
        created_at: c.created_at,
        has_getlate: !!c.getlate_profile_id,
        last_login: lastLogin,
        verified_users: members,
        pending_invitations: invitations.pending,
        connections_active: connections,
        connections_total: connectionsTotal,
        connections_found: connectionsFound,
        posts_last_7_days: postsLast7,
        posts_total: postsTotal,
      };
    });

    return new Response(JSON.stringify({ companies: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("admin-companies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
