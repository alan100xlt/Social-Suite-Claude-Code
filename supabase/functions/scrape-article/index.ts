import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

async function crawlAndClean(url: string, articleTitle: string): Promise<string | null> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!firecrawlKey || !url) return null;

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });

  if (!response.ok) throw new Error(`Firecrawl failed (${response.status})`);

  const data = await response.json();
  const rawMarkdown = data?.data?.markdown || data?.markdown || null;
  if (!rawMarkdown) throw new Error("No content returned from scraper");

  if (geminiKey && rawMarkdown.length > 200) {
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${geminiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite-preview",
        messages: [
          {
            role: "system",
            content: `You are a content extractor. Given raw scraped markdown from a web page, extract ONLY the article content. Return a clean version with:
- Article title (as heading)
- Subtitle/byline if present
- Author and date if present
- The full article body text

EXCLUDE: navigation menus, sidebars, ads, footer links, related articles, comments, social share buttons, cookie notices, subscription prompts, and any other non-article content.

Return clean, readable plain text (not markdown). Preserve paragraph breaks.`,
          },
          {
            role: "user",
            content: `Extract the article content from this scraped page. The article title should be "${articleTitle}".\n\n---\n\n${rawMarkdown.substring(0, 15000)}`,
          },
        ],
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const cleaned = aiData.choices?.[0]?.message?.content?.trim();
      if (cleaned && cleaned.length > 50) return cleaned;
    }
  }

  return rawMarkdown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // RBAC: any authenticated user
    await authorize(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { articleId } = await req.json();
    if (!articleId) throw new Error("articleId is required");

    // Use service role to read and update the article
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: item, error: fetchError } = await adminClient
      .from("rss_feed_items")
      .select("id, link, title, full_content")
      .eq("id", articleId)
      .single();

    if (fetchError || !item) throw new Error("Article not found");
    if (!item.link) throw new Error("Article has no URL to scrape");

    console.log(`Scraping article: ${item.link}`);
    const content = await crawlAndClean(item.link, item.title || "Untitled");

    if (!content) throw new Error("Failed to extract content");

    const { error: updateError } = await adminClient
      .from("rss_feed_items")
      .update({ full_content: content })
      .eq("id", articleId);

    if (updateError) throw new Error("Failed to save scraped content");

    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("scrape-article error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
