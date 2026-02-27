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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { url, crawlData, rssFeeds, articles } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate company name and slug from crawl data or URL
    let businessName = crawlData?.businessName;
    if (!businessName) {
      try {
        businessName = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
      } catch {
        businessName = "My Publication";
      }
    }
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50) || "my-publication";

    // Ensure unique slug by appending random suffix
    const uniqueSlug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;

    // 1. Create company (anonymous — no created_by yet)
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: businessName,
        slug: uniqueSlug,
        website_url: url,
        branding: crawlData || {},
        onboarding_status: "in_progress",
        onboarding_step: 0,
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return new Response(
        JSON.stringify({ error: companyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = company.id;

    // 2. Save RSS feeds
    const savedFeeds: { id: string; url: string }[] = [];
    if (rssFeeds && Array.isArray(rssFeeds)) {
      for (const feed of rssFeeds.slice(0, 5)) {
        const { data: savedFeed, error: feedError } = await adminClient
          .from("rss_feeds")
          .insert({
            company_id: companyId,
            name: feed.title || feed.name || "RSS Feed",
            url: feed.url,
            is_active: true,
          })
          .select("id, url")
          .single();

        if (!feedError && savedFeed) {
          savedFeeds.push(savedFeed);
        }
      }
    }

    // 3. Save articles to rss_feed_items
    let articleCount = 0;
    if (articles && Array.isArray(articles) && savedFeeds.length > 0) {
      const feedId = savedFeeds[0].id;
      for (const article of articles.slice(0, 10)) {
        const { error: itemError } = await adminClient
          .from("rss_feed_items")
          .insert({
            feed_id: feedId,
            guid: article.link || article.guid || crypto.randomUUID(),
            title: article.title,
            link: article.link,
            description: article.description,
            image_url: article.imageUrl || article.image_url,
            status: "pending",
          });
        if (!itemError) articleCount++;
      }
    }

    // 4. Save lead/contact data
    const contactEmails: string[] = [];
    const contactPhones: string[] = [];
    const socialChannels: any[] = [];

    if (crawlData) {
      if (crawlData.contact?.email) contactEmails.push(crawlData.contact.email);
      if (crawlData.contact?.phone) contactPhones.push(crawlData.contact.phone);
      if (crawlData.socialChannels) {
        for (const channel of crawlData.socialChannels) {
          socialChannels.push(channel);
        }
      }
    }

    if (contactEmails.length > 0 || contactPhones.length > 0 || socialChannels.length > 0) {
      await adminClient.from("discovery_leads").insert({
        company_id: companyId,
        website_url: url,
        contact_emails: contactEmails,
        contact_phones: contactPhones,
        social_channels: socialChannels,
        crawl_data: crawlData || {},
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId,
        feedCount: savedFeeds.length,
        articleCount,
        leadsCount: contactEmails.length + contactPhones.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-discovery-company error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
