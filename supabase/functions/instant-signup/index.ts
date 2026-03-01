import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    let userId: string;

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

    userId = createData.user!.id;

    // Send "set your password" email asynchronously (non-blocking)
    try {
      await adminClient.functions.invoke('send-auth-email', {
        body: {
          email: email.toLowerCase().trim(),
          type: 'set_password',
          userId: userId
        }
      })
    } catch (emailError) {
      // Log but don't fail the signup if email fails
      console.error('Failed to send set password email:', emailError)
    }

    // Sign in with the temp password to get a session
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: tempPassword,
    });

    if (signInError) throw signInError;

    // Immediately invalidate the temp password by setting a new random one
    // This prevents the temp password from being used again, forcing proper auth flows
    await adminClient.auth.admin.updateUserById(userId, {
      password: crypto.randomUUID() + crypto.randomUUID(),
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
