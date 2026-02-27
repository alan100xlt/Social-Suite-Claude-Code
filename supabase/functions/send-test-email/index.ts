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

function buildGenericHtml(b: EmailBranding): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:${b.body_text_color};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    ${b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height:40px;margin-bottom:12px;" />` : ""}
    <h1 style="color:${b.header_text_color};margin:0;font-size:22px;">Sample Email Header 🎉</h1>
  </div>
  <div style="background:${b.body_background_color};padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:15px;">Hi there,</p>
    <p style="font-size:15px;">This is a <strong>test email</strong> to verify your email branding settings are working correctly.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="#" style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);color:${b.header_text_color};padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Call to Action</a>
    </div>
    ${b.footer_text ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="font-size:12px;color:#9ca3af;text-align:center;">${b.footer_text}</p>` : ""}
  </div>
</body></html>`;
}

function buildApprovalHtml(b: EmailBranding): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:${b.body_text_color};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    ${b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height:40px;margin-bottom:12px;" />` : ""}
    <h1 style="color:${b.header_text_color};margin:0;font-size:22px;">Post Approval Request 📋</h1>
  </div>
  <div style="background:${b.body_background_color};padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:15px;margin-bottom:16px;"><strong>Alan Smith</strong> has requested your approval for the following social media posts.</p>
    <p style="font-size:14px;color:#6b7280;margin-bottom:20px;">Article: <strong>How AI is Transforming Content Marketing in 2026</strong></p>
    <div style="text-align:center;margin:28px 0;">
      <a href="#" style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);color:${b.header_text_color};padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Review & Approve</a>
    </div>
    ${b.footer_text ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="font-size:12px;color:#9ca3af;text-align:center;">${b.footer_text}</p>` : ""}
  </div>
</body></html>`;
}

function buildInvitationHtml(b: EmailBranding): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:${b.body_text_color};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    ${b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height:40px;margin-bottom:12px;" />` : ""}
    <h1 style="color:${b.header_text_color};margin:0;font-size:22px;">You're Invited! 🎉</h1>
  </div>
  <div style="background:${b.body_background_color};padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:15px;margin-bottom:20px;">Hi there,</p>
    <p style="font-size:15px;margin-bottom:20px;"><strong>Sarah Johnson</strong> has invited you to join <strong>Acme Corp</strong> on ${b.sender_name} as a <strong>member</strong>.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="#" style="background:linear-gradient(135deg,${b.accent_color} 0%,${b.accent_color_end} 100%);color:${b.header_text_color};padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Accept Invitation</a>
    </div>
    ${b.footer_text ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="font-size:12px;color:#9ca3af;text-align:center;">${b.footer_text}</p>` : ""}
  </div>
</body></html>`;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // RBAC: superadmin only
    await authorize(req, { superadminOnly: true });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const COURIER_AUTH_TOKEN = Deno.env.get("COURIER_AUTH_TOKEN");
    if (!RESEND_API_KEY && !COURIER_AUTH_TOKEN) {
      throw new Error("Neither RESEND_API_KEY nor COURIER_AUTH_TOKEN is configured");
    }

    const { recipientEmail, template, branding } = await req.json();
    if (!recipientEmail || !template) {
      throw new Error("recipientEmail and template are required");
    }

    const b: EmailBranding = branding || {
      sender_name: "GetLate",
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

    let html: string;
    let subject: string;
    switch (template) {
      case "approval":
        html = buildApprovalHtml(b);
        subject = `[TEST] Review & Approve Posts: How AI is Transforming Content Marketing`;
        break;
      case "invitation":
        html = buildInvitationHtml(b);
        subject = `[TEST] You've been invited to join Acme Corp on ${b.sender_name}`;
        break;
      default:
        html = buildGenericHtml(b);
        subject = `[TEST] ${b.sender_name} Email Branding Preview`;
    }

    const fromInfo = { name: b.sender_name, email: b.from_email };

    let result: unknown;
    if (RESEND_API_KEY) {
      result = await sendViaResend(RESEND_API_KEY, recipientEmail, subject, html, fromInfo, b.reply_to_email);
      console.log("Test email sent via Resend:", result);
    } else {
      const courierBody = {
        message: {
          to: { email: recipientEmail },
          content: { title: subject, body: subject },
          routing: { method: "all", channels: ["email"] },
          channels: {
            email: {
              override: {
                body: { html },
                subject,
                from: `${b.sender_name} <${b.from_email}>`,
                ...(b.reply_to_email ? { reply_to: b.reply_to_email } : {}),
              },
            },
          },
        },
      };

      const response = await fetch("https://api.courier.com/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${COURIER_AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courierBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Courier API error: ${response.status} - ${errText}`);
      }

      result = await response.json();
      console.log("Test email sent via Courier:", result);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("send-test-email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
