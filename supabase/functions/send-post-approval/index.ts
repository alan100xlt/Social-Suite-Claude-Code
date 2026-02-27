import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

interface EmailBranding {
  sender_name: string;
  from_email: string;
  reply_to_email: string | null;
  logo_url: string | null;
  accent_color: string;
  accent_color_end: string;
  header_text_color: string;
  body_background_color: string;
  body_text_color: string;
  footer_text: string | null;
}

const defaultBranding: EmailBranding = {
  sender_name: "Longtale.ai",
  from_email: "noreply@longtale.ai",
  reply_to_email: null,
  logo_url: null,
  accent_color: "#667eea",
  accent_color_end: "#764ba2",
  header_text_color: "#ffffff",
  body_background_color: "#ffffff",
  body_text_color: "#333333",
  footer_text: null,
};

async function getBranding(supabaseUrl: string, serviceRoleKey: string): Promise<EmailBranding> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data } = await supabase
      .from("global_email_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    
    // Get platform settings for name/logo fallback
    const { data: platformData } = await supabase
      .from("platform_settings")
      .select("platform_name, platform_logo_url")
      .limit(1)
      .maybeSingle();
    
    const base = data ? { ...defaultBranding, ...data } : defaultBranding;
    
    if (platformData) {
      if (!data?.sender_name && platformData.platform_name) base.sender_name = platformData.platform_name;
      if (!data?.logo_url && platformData.platform_logo_url) base.logo_url = platformData.platform_logo_url;
    }
    
    return base;
  } catch {
    return defaultBranding;
  }
}

async function sendViaResend(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string,
  from: { name: string; email: string },
  replyTo?: string | null,
) {
  const body: Record<string, unknown> = {
    from: `${from.name} <${from.email}>`,
    to: [to],
    subject,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Resend API error:", response.status, errText);
    throw new Error(`Resend API error: ${response.status} - ${errText}`);
  }

  return await response.json();
}

async function sendViaCourier(
  courierToken: string,
  to: string,
  subject: string,
  html: string,
  from: { name: string; email: string },
  replyTo?: string | null,
  inAppUserId?: string | null,
  inAppTitle?: string | null,
  inAppBody?: string | null,
  inAppActionUrl?: string | null,
) {
  const toField: Record<string, string> = { email: to };
  if (inAppUserId) toField.user_id = inAppUserId;

  const channels: Record<string, unknown> = {
    email: {
      override: {
        body: { html },
        subject,
        from: `${from.name} <${from.email}>`,
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
    },
  };

  const routingChannels = ["email"];
  if (inAppUserId) {
    routingChannels.push("inbox");
  }

  const messageContent: Record<string, unknown> = {
    title: inAppTitle || subject,
    body: inAppBody || subject,
  };

  const body: Record<string, unknown> = {
    message: {
      to: toField,
      content: messageContent,
      routing: {
        method: "all",
        channels: routingChannels,
      },
      channels,
      ...(inAppActionUrl ? { data: { clickAction: inAppActionUrl } } : {}),
    },
  };

  const response = await fetch("https://api.courier.com/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${courierToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Courier API error:", response.status, errText);
    throw new Error(`Courier API error: ${response.status} - ${errText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const COURIER_AUTH_TOKEN = Deno.env.get("COURIER_AUTH_TOKEN");
    if (!RESEND_API_KEY && !COURIER_AUTH_TOKEN) {
      throw new Error("Neither RESEND_API_KEY nor COURIER_AUTH_TOKEN is configured");
    }

    // RBAC: any authenticated member
    const auth = await authorize(req);
    const userId = auth.userId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const body = await req.json();
    const {
      recipientEmail, platformContents, articleTitle, articleLink,
      articleImageUrl, objective, imageUrl, selectedAccountIds,
      linkAsComment,
    } = body;

    if (!recipientEmail || !platformContents) {
      throw new Error("recipientEmail and platformContents are required");
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.company_id) throw new Error("User has no company");

    // Get branding
    const b = await getBranding(supabaseUrl, serviceRoleKey);

    // Insert approval record
    const { data: approval, error: insertError } = await supabase
      .from("post_approvals")
      .insert({
        company_id: profile.company_id,
        created_by: userId,
        recipient_email: recipientEmail,
        platform_contents: platformContents,
        article_title: articleTitle || null,
        article_link: articleLink || null,
        article_image_url: articleImageUrl || null,
        objective: objective || null,
        image_url: imageUrl || null,
        selected_account_ids: selectedAccountIds || [],
        link_as_comment: linkAsComment || {},
      } as any)
      .select("id, token")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create approval request");
    }

    // Build approval URL
    const appUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://social.longtale.ai";
    const approvalUrl = `${appUrl}/approve/${approval.token}`;

    // Build post preview HTML
    const platforms = Object.keys(platformContents);
    const postsHtml = platforms.map((platform) => {
      const content = platformContents[platform] as string;
      return `
        <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa;">
          <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600; text-transform: capitalize; color: #374151;">${platform}</h3>
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #1f2937; line-height: 1.5;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      `;
    }).join("");

    const subject = `Review & Approve Posts${articleTitle ? `: ${articleTitle}` : ""}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${b.body_text_color}; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            ${b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height: 40px; margin-bottom: 12px;" />` : ""}
            <h1 style="color: ${b.header_text_color}; margin: 0; font-size: 22px;">Post Approval Request 📋</h1>
          </div>
          <div style="background: ${b.body_background_color}; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 15px; margin-bottom: 16px;">
              ${profile.full_name ? `<strong>${profile.full_name}</strong> has requested` : "A team member has requested"} your approval for the following social media posts.
            </p>
            ${articleTitle ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Article: <strong>${articleTitle}</strong></p>` : ""}
            ${postsHtml}
            <div style="text-align: center; margin: 28px 0;">
              <a href="${approvalUrl}" style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); color: ${b.header_text_color}; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Review & Approve
              </a>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center;">This link expires in 7 days.</p>
            ${b.footer_text ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" /><p style="font-size: 12px; color: #9ca3af; text-align: center;">${b.footer_text}</p>` : ""}
          </div>
        </body>
      </html>
    `;

    const fromInfo = { name: b.sender_name, email: b.from_email };

    // Send email via Resend (primary) or Courier (fallback)
    let emailResponse: unknown;
    if (RESEND_API_KEY) {
      emailResponse = await sendViaResend(RESEND_API_KEY, recipientEmail, subject, html, fromInfo, b.reply_to_email);
      console.log("Approval email sent via Resend:", emailResponse);
    } else {
      // Look up recipient's user_id for in-app notification (Courier only)
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data: recipientProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail)
        .maybeSingle();

      emailResponse = await sendViaCourier(
        COURIER_AUTH_TOKEN!,
        recipientEmail,
        subject,
        html,
        fromInfo,
        b.reply_to_email,
        recipientProfile?.id || null,
        "📋 Post Approval Request",
        `${profile.full_name || "A team member"} is requesting your approval for ${articleTitle ? `"${articleTitle}"` : "new social media posts"}.`,
        approvalUrl,
      );
      console.log("Approval email sent via Courier:", emailResponse);
    }

    // Send in-app notification separately if Courier is available and we used Resend for email
    if (RESEND_API_KEY && COURIER_AUTH_TOKEN) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: recipientProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", recipientEmail)
          .maybeSingle();

        if (recipientProfile?.id) {
          await sendViaCourier(
            COURIER_AUTH_TOKEN,
            recipientEmail,
            subject,
            html,
            fromInfo,
            b.reply_to_email,
            recipientProfile.id,
            "📋 Post Approval Request",
            `${profile.full_name || "A team member"} is requesting your approval for ${articleTitle ? `"${articleTitle}"` : "new social media posts"}.`,
            approvalUrl,
          );
        }
      } catch (e) {
        console.error("In-app notification via Courier failed (non-blocking):", e);
      }
    }

    return new Response(JSON.stringify({ success: true, approvalId: approval.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("send-post-approval error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});