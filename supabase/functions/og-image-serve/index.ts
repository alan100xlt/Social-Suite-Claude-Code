import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // Allow any origin — this serves crawlers, email clients, social platforms
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400, headers });
  }

  // Validate UUID format to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Invalid id format", { status: 400, headers });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await admin
    .from("rss_feed_items")
    .select("og_image_url")
    .eq("id", id)
    .single();

  if (error || !data?.og_image_url) {
    return new Response("Not found", { status: 404, headers });
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      "Location": data.og_image_url,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
});
