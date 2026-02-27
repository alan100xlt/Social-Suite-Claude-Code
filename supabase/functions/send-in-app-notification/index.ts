import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

/**
 * Sends an in-app notification via Courier to a specific user.
 * Can be called from other edge functions (service role) or from the client (auth header).
 *
 * Body: { userId, title, body, actionUrl? }
 * - userId: the Supabase user ID to notify
 * - title: notification title
 * - body: notification body text
 * - actionUrl: optional click-through URL
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // RBAC: allow service role or any authenticated user
    await authorize(req, { allowServiceRole: true });

    const COURIER_AUTH_TOKEN = Deno.env.get("COURIER_AUTH_TOKEN");

    const { userId, title, body: notifBody, actionUrl } = await req.json();
    if (!userId || !title || !notifBody) {
      return new Response(
        JSON.stringify({ error: "userId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messagePayload: Record<string, unknown> = {
      message: {
        to: { user_id: userId },
        content: { title, body: notifBody },
        routing: { method: "single", channels: ["inbox"] },
        ...(actionUrl ? { data: { clickAction: actionUrl } } : {}),
      },
    };

    const response = await fetch("https://api.courier.com/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COURIER_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Courier send error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Courier error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, requestId: result.requestId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("send-in-app-notification error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
