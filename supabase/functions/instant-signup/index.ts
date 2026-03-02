import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendBrandedSetPasswordEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  actionLink: string,
): Promise<void> {
  // Fetch platform branding
  const [{ data: emailData }, { data: platformData }] = await Promise.all([
    adminClient.from('global_email_settings').select('*').limit(1).maybeSingle(),
    adminClient.from('platform_settings').select('platform_name, platform_logo_url').limit(1).maybeSingle(),
  ]);

  const senderName = emailData?.sender_name || platformData?.platform_name || 'Longtale.ai';
  const fromEmail = emailData?.from_email || 'noreply@longtale.ai';
  const replyTo = emailData?.reply_to_email || null;
  const logoUrl = emailData?.logo_url || platformData?.platform_logo_url || null;
  const accentColor = emailData?.accent_color || '#667eea';
  const accentColorEnd = emailData?.accent_color_end || '#764ba2';
  const headerTextColor = emailData?.header_text_color || '#ffffff';
  const bodyBg = emailData?.body_background_color || '#ffffff';
  const bodyText = emailData?.body_text_color || '#333333';
  const footerText = emailData?.footer_text || `Sent by ${senderName}. If you didn't request this, you can safely ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${bodyText}; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
  <div style="background: linear-gradient(135deg, ${accentColor} 0%, ${accentColorEnd} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${senderName}" style="max-height: 40px; margin-bottom: 12px;" />` : ''}
    <h1 style="color: ${headerTextColor}; margin: 0; font-size: 22px;">Set Your Password</h1>
  </div>
  <div style="background: ${bodyBg}; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 15px; margin-bottom: 20px;">Welcome to <strong>${senderName}</strong>! Your account has been created.</p>
    <p style="font-size: 15px; margin-bottom: 20px;">Click the button below to set a password for your account.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${actionLink}" style="background: linear-gradient(135deg, ${accentColor} 0%, ${accentColorEnd} 100%); color: ${headerTextColor}; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Set Password</a>
    </div>
    <p style="font-size: 13px; color: #6b7280; text-align: center;">If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${actionLink}" style="color: ${accentColor}; word-break: break-all; font-size: 12px;">${actionLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">${footerText}</p>
  </div>
</body>
</html>`;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const resendBody: Record<string, unknown> = {
    from: `${senderName} <${fromEmail}>`,
    to: [email],
    subject: `Set your ${senderName} password`,
    html,
  };
  if (replyTo) resendBody.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error: ${res.status} ${errText}`);
  }

  const result = await res.json();
  console.log(`Set-password email sent to ${email}, id=${result.id}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const siteUrl = Deno.env.get('SITE_URL') || 'https://social.longtale.ai';
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate a random strong password for the auto-created account
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Try to create the user (bypasses email confirmation via admin API)
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true, // Mark email as confirmed so they can sign in immediately
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        // User already exists — we can't sign them in without their password.
        // Return a flag so the client can show them the login page instead.
        return new Response(JSON.stringify({ existing_user: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw createError;
    }

    const userId = createData.user!.id;

    // Sign in with the temp password to get a session
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: tempPassword,
    });

    if (signInError) throw signInError;

    // Get recovery link without triggering Supabase's native (unbranded) email send.
    // generateLink() returns the action URL — we then send a branded email ourselves.
    adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase().trim(),
      options: { redirectTo: `${siteUrl}/auth/reset-password` },
    }).then(({ data: linkData, error: linkError }) => {
      if (linkError) {
        console.error('Failed to generate recovery link:', linkError.message);
        return;
      }
      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) {
        console.error('generateLink returned no action_link');
        return;
      }
      return sendBrandedSetPasswordEmail(adminClient, email.toLowerCase().trim(), actionLink);
    }).catch((e) => {
      console.error('Failed to send set password email:', e);
    });

    return new Response(
      JSON.stringify({
        access_token: signInData.session!.access_token,
        refresh_token: signInData.session!.refresh_token,
        user: { id: userId, email: signInData.user!.email },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('instant-signup error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
