import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const SITE_URL = Deno.env.get('SITE_URL') || 'https://social.longtale.ai';

async function sendBrandedSetPasswordEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  actionLink: string,
): Promise<void> {
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
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:${bodyText};max-width:600px;margin:0 auto;padding:20px;background-color:#f3f4f6;">
  <div style="background:linear-gradient(135deg,${accentColor} 0%,${accentColorEnd} 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${senderName}" style="max-height:40px;margin-bottom:12px;" />` : ''}
    <h1 style="color:${headerTextColor};margin:0;font-size:22px;">Set Your Password</h1>
  </div>
  <div style="background:${bodyBg};padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:15px;margin-bottom:20px;">Welcome to <strong>${senderName}</strong>! Your account has been created.</p>
    <p style="font-size:15px;margin-bottom:20px;">Click the button below to set a password for your account.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${actionLink}" style="background:linear-gradient(135deg,${accentColor} 0%,${accentColorEnd} 100%);color:${headerTextColor};padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Set Password</a>
    </div>
    <p style="font-size:13px;color:#6b7280;text-align:center;">If the button doesn't work, copy this link:<br/>
      <a href="${actionLink}" style="color:${accentColor};word-break:break-all;font-size:12px;">${actionLink}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;" />
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">${footerText}</p>
  </div>
</body></html>`;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const body: Record<string, unknown> = {
    from: `${senderName} <${fromEmail}>`,
    to: [email],
    subject: `Set your ${senderName} password`,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  console.log('Set-password email sent to', email);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    await authorize(req, { superadminOnly: true });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // -- list ----------------------------------------------------------------
    if (action === 'list') {
      const { data: authUsers, error: authErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (authErr) throw authErr;

      const userIds = authUsers.users.map((u) => u.id);

      const [
        { data: profiles },
        { data: memberships },
        { data: mediaMembers },
        { data: superadmins },
        { data: companies },
        { data: mediaCompanies },
      ] = await Promise.all([
          adminClient.from('profiles').select('id, full_name, email, created_at').in('id', userIds),
          adminClient.from('company_memberships').select('user_id, company_id, role').in('user_id', userIds),
          adminClient.from('media_company_members').select('user_id, media_company_id, role, is_active').in('user_id', userIds),
          adminClient.from('superadmins').select('user_id'),
          adminClient.from('companies').select('id, name'),
          adminClient.from('media_companies').select('id, name'),
        ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const superadminSet = new Set((superadmins || []).map((s: any) => s.user_id));
      const companyMap = new Map((companies || []).map((c: any) => [c.id, c.name]));
      const mediaMap = new Map((mediaCompanies || []).map((m: any) => [m.id, m.name]));

      const membershipsByUser = new Map<string, any[]>();
      for (const m of memberships || []) {
        if (!membershipsByUser.has(m.user_id)) membershipsByUser.set(m.user_id, []);
        membershipsByUser.get(m.user_id)!.push({
          ...m,
          company_name: companyMap.get(m.company_id) || m.company_id,
        });
      }

      const mediaMembersByUser = new Map<string, any[]>();
      for (const m of mediaMembers || []) {
        if (!mediaMembersByUser.has(m.user_id)) mediaMembersByUser.set(m.user_id, []);
        mediaMembersByUser.get(m.user_id)!.push({
          ...m,
          media_company_name: mediaMap.get(m.media_company_id) || m.media_company_id,
        });
      }

      const users = authUsers.users.map((u) => {
        const profile = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || null,
          created_at: profile?.created_at || u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          is_superadmin: superadminSet.has(u.id),
          company_memberships: membershipsByUser.get(u.id) || [],
          media_memberships: mediaMembersByUser.get(u.id) || [],
        };
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- create --------------------------------------------------------------
    if (action === 'create') {
      const { email, full_name, make_superadmin } = body;
      if (!email) throw new Error('email is required');

      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split('@')[0] },
      });
      if (createErr) throw createErr;
      const userId = createData.user!.id;

      if (make_superadmin) {
        await adminClient.from('superadmins').upsert({ user_id: userId }, { onConflict: 'user_id' });
      }

      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase().trim(),
        options: { redirectTo: `${SITE_URL}/auth/reset-password` },
      });
      if (!linkErr && linkData?.properties?.action_link) {
        await sendBrandedSetPasswordEmail(adminClient, email.toLowerCase().trim(), linkData.properties.action_link);
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- reset_password ------------------------------------------------------
    if (action === 'reset_password') {
      const { email } = body;
      if (!email) throw new Error('email is required');

      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase().trim(),
        options: { redirectTo: `${SITE_URL}/auth/reset-password` },
      });
      if (linkErr) throw linkErr;
      if (!linkData?.properties?.action_link) throw new Error('Failed to generate reset link');

      await sendBrandedSetPasswordEmail(adminClient, email.toLowerCase().trim(), linkData.properties.action_link);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- toggle_superadmin ---------------------------------------------------
    if (action === 'toggle_superadmin') {
      const { user_id, is_superadmin } = body;
      if (!user_id) throw new Error('user_id is required');

      if (is_superadmin) {
        const { error } = await adminClient.from('superadmins').upsert({ user_id }, { onConflict: 'user_id' });
        if (error) throw error;
      } else {
        const { error } = await adminClient.from('superadmins').delete().eq('user_id', user_id);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- update_company_membership -------------------------------------------
    if (action === 'update_company_membership') {
      const { user_id, company_id, role, remove } = body;
      if (!user_id || !company_id) throw new Error('user_id and company_id are required');

      if (remove) {
        const { error } = await adminClient
          .from('company_memberships')
          .delete()
          .eq('user_id', user_id)
          .eq('company_id', company_id);
        if (error) throw error;
      } else {
        const { error } = await adminClient
          .from('company_memberships')
          .upsert({ user_id, company_id, role: role || 'member' }, { onConflict: 'user_id,company_id' });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- update_media_membership ---------------------------------------------
    if (action === 'update_media_membership') {
      const { user_id, media_company_id, role, remove } = body;
      if (!user_id || !media_company_id) throw new Error('user_id and media_company_id are required');

      if (remove) {
        const { error } = await adminClient
          .from('media_company_members')
          .delete()
          .eq('user_id', user_id)
          .eq('media_company_id', media_company_id);
        if (error) throw error;
      } else {
        const { error } = await adminClient
          .from('media_company_members')
          .upsert(
            { user_id, media_company_id, role: role || 'member', is_active: true },
            { onConflict: 'media_company_id,user_id' },
          );
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- delete_user ---------------------------------------------------------
    if (action === 'delete_user') {
      const { user_id } = body;
      if (!user_id) throw new Error('user_id is required');

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('admin-users error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
