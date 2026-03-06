import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authorize(req);

    const stats = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are a social media analytics assistant for a social media management tool. Generate a concise 2-3 sentence daily briefing based on the stats provided. Be specific with numbers. Mention the most important highlight first, then what needs attention. Use a professional but friendly tone. Do not use markdown formatting - just plain text. Keep it under 60 words.`;

    const userPrompt = `Here are the current dashboard stats:
- Total Followers: ${stats.totalFollowers ?? 0}
- Engagement Rate: ${stats.avgEngagementRate ?? 0}%
- Total Reach: ${stats.totalReach ?? 0}
- Total Views: ${stats.totalViews ?? 0}
- Posts Tracked (90d): ${stats.totalPosts ?? 0}
- Scheduled Posts: ${stats.scheduledCount ?? 0}
- Pending Drafts: ${stats.draftCount ?? 0}
- Pending Approvals: ${stats.pendingApprovals ?? 0}
- Inactive Automations: ${stats.inactiveAutomations ?? 0}
- Top Post This Week: ${stats.topPostSummary ?? "None"}

Generate the daily briefing now.`;

    // Retry up to 2 times on transient 5xx errors
    let response: Response | null = null;
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            model: "gemini-3.1-flash-lite-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );

      if (response.ok) break;

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastError = await response.text();
      console.error(`AI gateway attempt ${attempt + 1} failed:`, response.status, lastError);

      if (response.status < 500) break; // Don't retry client errors
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!response || !response.ok) {
      // Return a graceful fallback instead of crashing
      return new Response(
        JSON.stringify({ briefing: "Your daily briefing is temporarily unavailable. Check back shortly." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const briefing = data.choices?.[0]?.message?.content || "No briefing available.";

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("dashboard-briefing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
