import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

interface InviteEmailRequest {
  email: string;
  companyName: string;
  companyId?: string;
  inviterName: string;
  role: string;
  signupUrl: string;
}

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

async function getBranding(): Promise<EmailBranding> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get email branding
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
    
    // Use platform name as sender_name fallback, and platform logo as logo fallback
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

  const body: Record<string, unknown> = {
    message: {
      to: toField,
      content: {
        title: inAppTitle || subject,
        body: inAppBody || subject,
      },
      routing: {
        method: "all",
        channels: routingChannels,
      },
      channels,
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // RBAC: any authenticated user (company-level RBAC for owner/admin enforced by frontend + thin RLS on invitations table)
    await authorize(req);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const COURIER_AUTH_TOKEN = Deno.env.get("COURIER_AUTH_TOKEN");
    if (!RESEND_API_KEY && !COURIER_AUTH_TOKEN) {
      throw new Error("Neither RESEND_API_KEY nor COURIER_AUTH_TOKEN is configured");
    }

    const { email, companyName, companyId, inviterName, role, signupUrl }: InviteEmailRequest = await req.json();

    if (!email || !companyName || !signupUrl) {
      throw new Error("Missing required fields: email, companyName, and signupUrl are required");
    }

    const b = await getBranding();
    const subject = `You've been invited to join ${companyName} on ${b.sender_name}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${b.body_text_color}; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            ${b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height: 40px; margin-bottom: 12px;" />` : ""}
            <h1 style="color: ${b.header_text_color}; margin: 0; font-size: 24px;">You're Invited! 🎉</h1>
          </div>
          
          <div style="background: ${b.body_background_color}; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${inviterName ? `<strong>${inviterName}</strong> has` : "You have been"} invited you to join <strong>${companyName}</strong> on ${b.sender_name} as ${role === "admin" ? "an" : "a"} <strong>${role}</strong>.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              ${b.sender_name} is a social media management platform that helps teams schedule, publish, and analyze their content across multiple platforms.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); color: ${b.header_text_color}; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              ${b.footer_text || `This invitation was sent by ${b.sender_name}. If you have questions, contact your team administrator.`}
            </p>
          </div>
        </body>
      </html>
    `;

    const fromInfo = { name: b.sender_name, email: b.from_email };

    let emailResponse: unknown;
    if (RESEND_API_KEY) {
      emailResponse = await sendViaResend(RESEND_API_KEY, email, subject, html, fromInfo, b.reply_to_email);
      console.log("Invite email sent via Resend:", emailResponse);
    } else {
      emailResponse = await sendViaCourier(
        COURIER_AUTH_TOKEN!,
        email,
        subject,
        html,
        fromInfo,
        b.reply_to_email,
      );
      console.log("Invite email sent via Courier:", emailResponse);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error("Error in send-invite-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
