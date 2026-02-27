import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: emailData }, { data: platformData }] = await Promise.all([
      supabase.from("global_email_settings").select("*").limit(1).maybeSingle(),
      supabase.from("platform_settings").select("platform_name, platform_logo_url").limit(1).maybeSingle(),
    ]);

    const base = { ...defaultBranding };
    if (emailData) {
      if (emailData.sender_name) base.sender_name = emailData.sender_name;
      if (emailData.from_email) base.from_email = emailData.from_email;
      if (emailData.reply_to_email) base.reply_to_email = emailData.reply_to_email;
      if (emailData.logo_url) base.logo_url = emailData.logo_url;
      // Only override accent colors if they're not the white placeholder
      if (emailData.accent_color && emailData.accent_color.toLowerCase() !== '#ffffff')
        base.accent_color = emailData.accent_color;
      if (emailData.accent_color_end && emailData.accent_color_end.toLowerCase() !== '#ffffff')
        base.accent_color_end = emailData.accent_color_end;
      // Keep header_text_color as white default — only override if NOT white (white is the intended default for gradient headers)
      if (emailData.header_text_color && emailData.header_text_color.toLowerCase() !== '#ffffff')
        base.header_text_color = emailData.header_text_color;
      if (emailData.body_text_color) base.body_text_color = emailData.body_text_color;
      if (emailData.body_background_color) base.body_background_color = emailData.body_background_color;
      if (emailData.footer_text) base.footer_text = emailData.footer_text;
    }

    if (platformData) {
      if (!base.sender_name || base.sender_name === defaultBranding.sender_name) {
        if (platformData.platform_name) base.sender_name = platformData.platform_name;
      }
      if (!base.logo_url && platformData.platform_logo_url) base.logo_url = platformData.platform_logo_url;
    }

    console.log("Branding resolved:", JSON.stringify({
      accent_color: base.accent_color,
      accent_color_end: base.accent_color_end,
      header_text_color: base.header_text_color,
      logo_url: base.logo_url,
      sender_name: base.sender_name,
    }));

    return base;
  } catch {
    return defaultBranding;
  }
}

function buildConfirmationUrl(
  supabaseUrl: string,
  tokenHash: string,
  type: string,
  redirectTo?: string,
): string {
  const url = new URL(`${supabaseUrl}/auth/v1/verify`);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function wrapEmail(b: EmailBranding, headerTitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${b.body_text_color}; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
  <div style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    ${b.logo_url ? `<img src="${b.logo_url}" alt="${b.sender_name}" style="max-height: 40px; margin-bottom: 12px;" />` : ""}
    <h1 style="color: ${b.header_text_color}; margin: 0; font-size: 22px;">${headerTitle}</h1>
  </div>
  <div style="background: ${b.body_background_color}; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      ${b.footer_text || `Sent by ${b.sender_name}. If you didn't request this, you can safely ignore this email.`}
    </p>
  </div>
</body>
</html>`;
}

function ctaButton(b: EmailBranding, href: string, label: string): string {
  return `<div style="text-align: center; margin: 28px 0;">
    <a href="${href}" style="background: linear-gradient(135deg, ${b.accent_color} 0%, ${b.accent_color_end} 100%); color: ${b.header_text_color}; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${label}</a>
  </div>`;
}

function buildSignupEmail(b: EmailBranding, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `Confirm your ${b.sender_name} account`,
    html: wrapEmail(b, "Welcome! 🎉", `
      <p style="font-size: 15px; margin-bottom: 20px;">Thanks for signing up for <strong>${b.sender_name}</strong>.</p>
      <p style="font-size: 15px; margin-bottom: 20px;">Please confirm your email address to get started.</p>
      ${ctaButton(b, confirmUrl, "Confirm Email")}
      <p style="font-size: 13px; color: #6b7280; text-align: center;">If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${confirmUrl}" style="color: ${b.accent_color}; word-break: break-all; font-size: 12px;">${confirmUrl}</a>
      </p>
    `),
  };
}

function buildRecoveryEmail(b: EmailBranding, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `Reset your ${b.sender_name} password`,
    html: wrapEmail(b, "Password Reset 🔑", `
      <p style="font-size: 15px; margin-bottom: 20px;">We received a request to reset your password for your <strong>${b.sender_name}</strong> account.</p>
      <p style="font-size: 15px; margin-bottom: 20px;">Click the button below to choose a new password. This link expires in 24 hours.</p>
      ${ctaButton(b, confirmUrl, "Reset Password")}
      <p style="font-size: 13px; color: #6b7280; text-align: center;">If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${confirmUrl}" style="color: ${b.accent_color}; word-break: break-all; font-size: 12px;">${confirmUrl}</a>
      </p>
    `),
  };
}

function buildMagicLinkEmail(b: EmailBranding, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `Your ${b.sender_name} login link`,
    html: wrapEmail(b, "Magic Link ✨", `
      <p style="font-size: 15px; margin-bottom: 20px;">Click the button below to log in to your <strong>${b.sender_name}</strong> account.</p>
      ${ctaButton(b, confirmUrl, "Log In")}
      <p style="font-size: 13px; color: #6b7280; text-align: center;">This link expires in 10 minutes.</p>
    `),
  };
}

function buildEmailChangeEmail(b: EmailBranding, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `Confirm your email change on ${b.sender_name}`,
    html: wrapEmail(b, "Email Change ✉️", `
      <p style="font-size: 15px; margin-bottom: 20px;">Please confirm your new email address for your <strong>${b.sender_name}</strong> account.</p>
      ${ctaButton(b, confirmUrl, "Confirm Email Change")}
    `),
  };
}

function buildInviteEmail(b: EmailBranding, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `You've been invited to ${b.sender_name}`,
    html: wrapEmail(b, "You're Invited! 🎉", `
      <p style="font-size: 15px; margin-bottom: 20px;">You've been invited to join <strong>${b.sender_name}</strong>.</p>
      <p style="font-size: 15px; margin-bottom: 20px;">Click below to accept the invitation and set up your account.</p>
      ${ctaButton(b, confirmUrl, "Accept Invitation")}
    `),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!hookSecret) throw new Error("SEND_EMAIL_HOOK_SECRET not set");

    // Verify the webhook signature
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));
    const event = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to?: string;
        email_action_type: string;
        token_new?: string;
        token_hash_new?: string;
      };
    };

    const { user, email_data } = event;
    const { token_hash, redirect_to, email_action_type } = email_data;

    console.log(`Auth email hook: type=${email_action_type}, to=${user.email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://social.longtale.ai";

    // Build the verification URL
    // For recovery, redirect to our custom reset-password page
    let finalRedirect = redirect_to;
    if (email_action_type === "recovery") {
      finalRedirect = `${siteUrl}/reset-password`;
    } else if (email_action_type === "magiclink" && finalRedirect) {
      // Normalize magic link redirects to use the production SITE_URL origin
      // This prevents Supabase from rejecting cross-origin redirects
      try {
        const parsed = new URL(finalRedirect);
        finalRedirect = `${siteUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        finalRedirect = `${siteUrl}/app`;
      }
    } else if (!finalRedirect) {
      finalRedirect = siteUrl;
    }

    const confirmUrl = buildConfirmationUrl(supabaseUrl, token_hash, email_action_type, finalRedirect);
    console.log(`Confirm URL redirect_to=${finalRedirect}, full=${confirmUrl.substring(0, 120)}...`);

    // Get branding
    const b = await getBranding();

    // Build email based on type
    let email: { subject: string; html: string };
    switch (email_action_type) {
      case "signup":
        email = buildSignupEmail(b, confirmUrl);
        break;
      case "recovery":
        email = buildRecoveryEmail(b, confirmUrl);
        break;
      case "magiclink":
        email = buildMagicLinkEmail(b, confirmUrl);
        break;
      case "email_change":
        email = buildEmailChangeEmail(b, confirmUrl);
        break;
      case "invite":
        email = buildInviteEmail(b, confirmUrl);
        break;
      default:
        email = buildSignupEmail(b, confirmUrl);
        break;
    }

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const resendBody: Record<string, unknown> = {
      from: `${b.sender_name} <${b.from_email}>`,
      to: [user.email],
      subject: email.subject,
      html: email.html,
    };
    if (b.reply_to_email) resendBody.reply_to = b.reply_to_email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", res.status, errText);
      throw new Error(`Resend error: ${res.status}`);
    }

    const result = await res.json();
    console.log(`Auth email sent: type=${email_action_type}, to=${user.email}, id=${result.id}`);

    // Return 200 with empty body — signals to Auth that we handled the email
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-auth-email error:", error);
    // Return error so Auth falls back to default behavior
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
