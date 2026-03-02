# Admin Users Table + Superadmin Gating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provision `alan@100xlt.ai` as superadmin, gate all `/app/admin/*` routes behind a `SuperAdminRoute` guard with a countdown redirect, and build a full `/app/admin/users` page for managing all users, their permissions, company memberships, and media company access.

**Architecture:** A new `admin-users` Supabase edge function (service-role, superadmin-only) handles all user mutations. A new `SuperAdminRoute` React component wraps every admin route in `App.tsx`. The Users page mirrors the existing `SuperadminCompanies.tsx` pattern: TanStack Query for data, `Sheet` slide-over for user detail, action menus for mutations.

**Tech Stack:** React 18, TypeScript, TanStack Query v5, Shadcn/ui (Sheet, Dialog, Badge, Select, Command/Combobox), Lucide icons, Supabase Edge Functions (Deno), Resend for email

---

## Task 1: Provision Superadmin

**Files:**
- No code changes — runtime operation only

**Step 1: Check if BOOTSTRAP_SECRET is already set**

```bash
npx supabase secrets list --project-ref yeffbytlvhhzsbrabhgg 2>&1
```

Expected: list of secret names. If `BOOTSTRAP_SECRET` not present, proceed to Step 2.

**Step 2: Set BOOTSTRAP_SECRET**

```bash
# Generate a random secret
SECRET=$(openssl rand -hex 32)
echo "Your bootstrap secret: $SECRET"
npx supabase secrets set BOOTSTRAP_SECRET=$SECRET --project-ref yeffbytlvhhzsbrabhgg
```

Save the secret value somewhere safe — you'll need it in Step 3.

**Step 3: Deploy provision-superadmins if not already deployed**

```bash
npx supabase functions deploy provision-superadmins --project-ref yeffbytlvhhzsbrabhgg 2>&1
```

**Step 4: Call the function**

```bash
curl -s -X POST https://yeffbytlvhhzsbrabhgg.supabase.co/functions/v1/provision-superadmins \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"$SECRET\", \"emails\": [\"alan@100xlt.ai\"]}"
```

Expected response:
```json
{"success": true, "results": [{"email": "alan@100xlt.ai", "status": "existing_user"}]}
```

**Step 5: Verify**

Reload `/app/admin/email-branding` in the browser. Both "Show Preview" and "Save Email Settings" buttons should now be enabled.

---

## Task 2: SuperAdminRoute Guard Component

**Files:**
- Create: `src/components/auth/SuperAdminRoute.tsx`
- Modify: `src/App.tsx` (lines 104-112 — the admin routes section)

**Step 1: Create SuperAdminRoute.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isSuperAdmin, superAdminLoading } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (superAdminLoading || isSuperAdmin) return;
    if (countdown <= 0) {
      navigate('/app', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuperAdmin, superAdminLoading, countdown, navigate]);

  if (superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground text-sm">
            This page is restricted to platform administrators.
          </p>
          <p className="text-muted-foreground text-sm">
            Redirecting you to the dashboard in{' '}
            <span className="font-semibold text-foreground">{countdown}</span>{' '}
            {countdown === 1 ? 'second' : 'seconds'}...
          </p>
          <Button onClick={() => navigate('/app', { replace: true })} variant="outline" size="sm">
            Go to Dashboard now
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

**Step 2: Update App.tsx — import SuperAdminRoute**

After the existing `import { ProtectedRoute }` line (line 12), add:

```tsx
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
```

**Step 3: Wrap all admin routes in App.tsx**

Replace lines 104-112 (the admin routes block):

```tsx
{/* Protected: Admin / Superadmin */}
<Route path="/app/admin/api-logs" element={<ProtectedRoute><SuperAdminRoute><ApiLogs /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/mapping" element={<ProtectedRoute><SuperAdminRoute><GetLateMapping /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/email-branding" element={<ProtectedRoute><SuperAdminRoute><EmailBranding /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/platform" element={<ProtectedRoute><SuperAdminRoute><PlatformSettings /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/companies" element={<ProtectedRoute><SuperAdminRoute><SuperadminCompanies /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/cron-health" element={<ProtectedRoute><SuperAdminRoute><CronHealth /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/wizard" element={<ProtectedRoute><SuperAdminRoute><WizardVariations /></SuperAdminRoute></ProtectedRoute>} />
<Route path="/app/admin/progress" element={<ProtectedRoute><SuperAdminRoute><Progress /></SuperAdminRoute></ProtectedRoute>} />
```

**Step 4: Verify in browser**

Open a private/incognito window, log in as a non-superadmin user, navigate directly to `/app/admin/companies`. You should see the "Access Restricted" screen with a 3-second countdown, then be redirected to `/app`.

**Step 5: Commit**

```bash
git add src/components/auth/SuperAdminRoute.tsx src/App.tsx
git commit -m "feat(admin): add SuperAdminRoute guard with countdown redirect for all admin pages"
```

---

## Task 3: Fix EmailBrandingTab — Error State + Show Preview

**Files:**
- Modify: `src/components/settings/EmailBrandingTab.tsx` (lines 115-127, 191-197)

**Step 1: Add isError to useQuery destructure**

Find line 115:
```tsx
const { data: settings, isLoading } = useQuery({
```

Replace with:
```tsx
const { data: settings, isLoading, isError } = useQuery({
```

**Step 2: Add error state rendering after the isLoading guard**

Find lines 191-197:
```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

Replace with:
```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

if (isError) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-xs text-muted-foreground">You don't have permission to manage email branding.</p>
      </div>
    </div>
  );
}
```

`ShieldAlert` is already imported on line 9.

**Step 3: Commit**

```bash
git add src/components/settings/EmailBrandingTab.tsx
git commit -m "fix(email-branding): show access denied instead of infinite spinner for non-superadmins"
```

---

## Task 4: admin-users Edge Function

**Files:**
- Create: `supabase/functions/admin-users/index.ts`
- Modify: `supabase/config.toml` (add `[functions.admin-users]`)

**Step 1: Add to config.toml**

Append to the end of `supabase/config.toml`:

```toml
[functions.admin-users]
verify_jwt = false
```

**Step 2: Create the edge function**

Create `supabase/functions/admin-users/index.ts`:

```typescript
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

    // ── list ──────────────────────────────────────────────────────────────
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
        membershipsByUser.get(m.user_id)!.push({ ...m, company_name: companyMap.get(m.company_id) || m.company_id });
      }

      const mediaMembersByUser = new Map<string, any[]>();
      for (const m of mediaMembers || []) {
        if (!mediaMembersByUser.has(m.user_id)) mediaMembersByUser.set(m.user_id, []);
        mediaMembersByUser.get(m.user_id)!.push({ ...m, media_company_name: mediaMap.get(m.media_company_id) || m.media_company_id });
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

    // ── create ────────────────────────────────────────────────────────────
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

    // ── reset_password ────────────────────────────────────────────────────
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

    // ── toggle_superadmin ─────────────────────────────────────────────────
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

    // ── update_company_membership ─────────────────────────────────────────
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

    // ── update_media_membership ───────────────────────────────────────────
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

    // ── delete_user ───────────────────────────────────────────────────────
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
```

**Step 3: Deploy the function**

```bash
npx supabase functions deploy admin-users --project-ref yeffbytlvhhzsbrabhgg 2>&1
```

Expected: `Deployed Functions on project yeffbytlvhhzsbrabhgg: admin-users`

**Step 4: Commit**

```bash
git add supabase/functions/admin-users/index.ts supabase/config.toml
git commit -m "feat(admin): add admin-users edge function for full user management"
```

---

## Task 5: AdminUsers Page

**Files:**
- Create: `src/pages/AdminUsers.tsx`
- Modify: `src/App.tsx` (add import + route)
- Modify: `src/components/layout/Sidebar.tsx` (add Users nav link)

**Step 1: Create AdminUsers.tsx**

```tsx
import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, MoreHorizontal, Star, Plus, Loader2, Trash2, KeyRound, UserPlus, Building2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyMembership {
  company_id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'member';
}

interface MediaMembership {
  media_company_id: string;
  media_company_name: string;
  role: 'admin' | 'member' | 'viewer';
  is_active: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_superadmin: boolean;
  company_memberships: CompanyMembership[];
  media_memberships: MediaMembership[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.users as AdminUser[];
    },
  });
}

function useAdminUserMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess?.();
    },
  });
}

// ─── Create User Dialog ───────────────────────────────────────────────────────

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [makeSuperadmin, setMakeSuperadmin] = useState(false);
  const mutation = useAdminUserMutation(() => {
    toast({ title: 'User created', description: `${email} has been created and sent a set-password email.` });
    setEmail(''); setFullName(''); setMakeSuperadmin(false);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Full Name (optional)</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="superadmin" checked={makeSuperadmin} onCheckedChange={setMakeSuperadmin} />
            <Label htmlFor="superadmin">Make superadmin</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ action: 'create', email, full_name: fullName, make_superadmin: makeSuperadmin })}
            disabled={!email || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create & Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Slide-over ──────────────────────────────────────────────────────────

function UserSheet({ user, open, onClose }: { user: AdminUser | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const mutation = useAdminUserMutation();

  // Fetch all companies + media companies for the add-membership comboboxes
  const { data: allCompanies } = useQuery({
    queryKey: ['all-companies-for-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
    enabled: open,
  });

  const { data: allMediaCompanies } = useQuery({
    queryKey: ['all-media-companies-for-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('media_companies').select('id, name').order('name');
      return data || [];
    },
    enabled: open,
  });

  const [addCompanyId, setAddCompanyId] = useState('');
  const [addCompanyRole, setAddCompanyRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [addMediaId, setAddMediaId] = useState('');
  const [addMediaRole, setAddMediaRole] = useState<'admin' | 'member' | 'viewer'>('member');

  if (!user) return null;

  const displayName = user.full_name || user.email;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{displayName}</SheetTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Account section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Account</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last sign in</p>
                <p>{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="superadmin-toggle"
                checked={user.is_superadmin}
                onCheckedChange={(checked) =>
                  mutation.mutate(
                    { action: 'toggle_superadmin', user_id: user.id, is_superadmin: checked },
                    { onSuccess: () => toast({ title: checked ? 'Superadmin granted' : 'Superadmin removed' }) }
                  )
                }
              />
              <Label htmlFor="superadmin-toggle" className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                Superadmin
              </Label>
            </div>
          </div>

          <Separator />

          {/* Company Memberships */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Company Memberships</h3>
            {user.company_memberships.length === 0 && (
              <p className="text-xs text-muted-foreground">No company memberships</p>
            )}
            {user.company_memberships.map((m) => (
              <div key={m.company_id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{m.company_name}</span>
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    mutation.mutate({ action: 'update_company_membership', user_id: user.id, company_id: m.company_id, role })
                  }
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => mutation.mutate({ action: 'update_company_membership', user_id: user.id, company_id: m.company_id, remove: true })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Select value={addCompanyId} onValueChange={setAddCompanyId}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Add to company..." />
                </SelectTrigger>
                <SelectContent>
                  {(allCompanies || [])
                    .filter((c: any) => !user.company_memberships.find((m) => m.company_id === c.id))
                    .map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addCompanyRole} onValueChange={(v) => setAddCompanyRole(v as any)}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline" className="h-8"
                disabled={!addCompanyId || mutation.isPending}
                onClick={() => {
                  mutation.mutate(
                    { action: 'update_company_membership', user_id: user.id, company_id: addCompanyId, role: addCompanyRole },
                    { onSuccess: () => setAddCompanyId('') }
                  );
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Media Company Access */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Media Company Access</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Grants access to all child companies within the media company</p>
            </div>
            {user.media_memberships.filter((m) => m.is_active).length === 0 && (
              <p className="text-xs text-muted-foreground">No media company access</p>
            )}
            {user.media_memberships.filter((m) => m.is_active).map((m) => (
              <div key={m.media_company_id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{m.media_company_name}</span>
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    mutation.mutate({ action: 'update_media_membership', user_id: user.id, media_company_id: m.media_company_id, role })
                  }
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => mutation.mutate({ action: 'update_media_membership', user_id: user.id, media_company_id: m.media_company_id, remove: true })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Select value={addMediaId} onValueChange={setAddMediaId}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Add to media company..." />
                </SelectTrigger>
                <SelectContent>
                  {(allMediaCompanies || [])
                    .filter((m: any) => !user.media_memberships.find((em) => em.media_company_id === m.id && em.is_active))
                    .map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addMediaRole} onValueChange={(v) => setAddMediaRole(v as any)}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline" className="h-8"
                disabled={!addMediaId || mutation.isPending}
                onClick={() => {
                  mutation.mutate(
                    { action: 'update_media_membership', user_id: user.id, media_company_id: addMediaId, role: addMediaRole },
                    { onSuccess: () => setAddMediaId('') }
                  );
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const mutation = useAdminUserMutation();

  const [search, setSearch] = useState('');
  const [superadminOnly, setSuperadminOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase());
      const matchSuperadmin = !superadminOnly || u.is_superadmin;
      return matchSearch && matchSuperadmin;
    });
  }, [users, search, superadminOnly]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">
              {users ? `${users.length} total users` : 'Manage all platform users'}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            New User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={superadminOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSuperadminOnly((v) => !v)}
            className="gap-2"
          >
            <Star className="h-3.5 w-3.5" />
            Superadmins only
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Access</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Companies</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Sign In</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{user.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_superadmin && (
                        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Star className="h-3 w-3" />
                          Superadmin
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.company_memberships.slice(0, 2).map((m) => (
                          <Badge key={m.company_id} variant="outline" className="text-xs">{m.company_name}</Badge>
                        ))}
                        {user.company_memberships.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{user.company_memberships.length - 2}</Badge>
                        )}
                        {user.media_memberships.filter((m) => m.is_active).map((m) => (
                          <Badge key={m.media_company_id} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {m.media_company_name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {user.last_sign_in_at
                        ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              mutation.mutate(
                                { action: 'reset_password', email: user.email },
                                { onSuccess: () => toast({ title: 'Password reset email sent', description: user.email }) }
                              )
                            }
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              mutation.mutate(
                                { action: 'toggle_superadmin', user_id: user.id, is_superadmin: !user.is_superadmin },
                                {
                                  onSuccess: () =>
                                    toast({ title: user.is_superadmin ? 'Superadmin removed' : 'Superadmin granted' }),
                                }
                              )
                            }
                          >
                            <Star className="h-4 w-4 mr-2" />
                            {user.is_superadmin ? 'Remove Superadmin' : 'Make Superadmin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
                              mutation.mutate(
                                { action: 'delete_user', user_id: user.id },
                                { onSuccess: () => toast({ title: 'User deleted', description: user.email }) }
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserSheet user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </DashboardLayout>
  );
}
```

**Step 2: Add import + route to App.tsx**

After line 43 (`import SuperadminCompanies`), add:
```tsx
import AdminUsers from "./pages/AdminUsers";
```

After the last admin route (the `progress` route), add:
```tsx
<Route path="/app/admin/users" element={<ProtectedRoute><SuperAdminRoute><AdminUsers /></SuperAdminRoute></ProtectedRoute>} />
```

**Step 3: Add Users link to Sidebar.tsx**

Add `Users` to the lucide-react import at the top of `src/components/layout/Sidebar.tsx`:
```tsx
import {
  // ... existing imports
  Users,
} from "lucide-react";
```

After the Companies `<Link>` block (after line ~436), inside the `{isSuperAdmin && ...}` block, add:
```tsx
<Link
  to="/app/admin/users"
  className={cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
    location.pathname === "/app/admin/users"
      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
      : "text-sidebar-foreground hover:bg-sidebar-accent"
  )}
>
  <Users
    size={20}
    className="flex-shrink-0 transition-transform group-hover:scale-110"
  />
  {!collapsed && (
    <span className="font-medium text-sm">Users</span>
  )}
</Link>
```

**Step 4: Check if date-fns is installed**

```bash
cd /c/Users/alana/OneDrive/Documents/GitHub/Social-Suite-Claude-Code && grep "date-fns" package.json
```

If not present: `npm install date-fns`

**Step 5: Build check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors before continuing.

**Step 6: Commit**

```bash
git add src/pages/AdminUsers.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(admin): add Users management page with slide-over panel and full CRUD"
```

---

## Task 6: Final Verification

**Step 1: Start dev server**

```bash
npm run dev 2>&1 &
```

**Step 2: Verify superadmin access**

- Log in as `alan@100xlt.ai`
- Confirm "Superadmin" section appears in sidebar
- Navigate to `/app/admin/users` — table loads with all users
- Confirm your user shows a gold "Superadmin" badge

**Step 3: Verify Email Branding page**

- Navigate to `/app/admin/email-branding`
- Both "Show Preview" and "Save Email Settings" buttons are enabled
- Click "Show Preview" — preview panel renders
- Fill in test email, click "Send Test" — email arrives with branding

**Step 4: Verify route gating (non-superadmin)**

- Create or use a non-superadmin account
- Navigate directly to `/app/admin/companies`
- Should see "Access Restricted" screen with 3-second countdown, then auto-redirect to `/app`

**Step 5: Verify user actions**

- Click any user row → slide-over opens with Account / Memberships / Media Access sections
- Toggle superadmin on a test user → badge appears/disappears
- Add a test user to a company → appears in company_memberships
- Reset password for a user → branded email arrives at that user's inbox

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete admin users system - superadmin gating, users table, email branding fix"
```
