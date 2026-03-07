import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

/**
 * Google Analytics OAuth Edge Function
 *
 * Actions:
 *   start           → Build Google OAuth consent URL
 *   callback        → Exchange auth code for tokens, fetch GA4 properties
 *   select-property → Save chosen property + tokens to DB
 *   disconnect      → Deactivate a GA connection
 *   sync-now        → Trigger an immediate sync for a connection
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta';
const FETCH_TIMEOUT_MS = 15_000;

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!googleClientId || !googleClientSecret) {
    return jsonResponse({ success: false, error: 'Google OAuth not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const auth = await authorize(req, { allowServiceRole: true });
    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      // ── Start OAuth ─────────────────────────────────────────
      case 'start': {
        const { companyId, redirectUrl } = body;
        if (!companyId || !redirectUrl) {
          return jsonResponse({ success: false, error: 'companyId and redirectUrl required' }, 400);
        }

        const state = btoa(JSON.stringify({ companyId, userId: auth.userId }));

        const params = new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: redirectUrl,
          response_type: 'code',
          scope: SCOPES,
          access_type: 'offline',
          prompt: 'consent',
          state,
        });

        return jsonResponse({
          success: true,
          authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
        });
      }

      // ── OAuth Callback ──────────────────────────────────────
      case 'callback': {
        const { code, redirectUrl, state } = body;
        if (!code || !redirectUrl) {
          return jsonResponse({ success: false, error: 'code and redirectUrl required' }, 400);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUrl,
          }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', errorText);
          return jsonResponse({ success: false, error: 'Failed to exchange authorization code' }, 400);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokenData;

        if (!refresh_token) {
          return jsonResponse({
            success: false,
            error: 'No refresh token received. Please revoke access at https://myaccount.google.com/permissions and try again.',
          }, 400);
        }

        // Get user email
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        let googleEmail = 'unknown';
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          googleEmail = userInfo.email || 'unknown';
        }

        // Fetch GA4 properties
        const summariesResponse = await fetch(`${GA_ADMIN_API}/accountSummaries`, {
          headers: { Authorization: `Bearer ${access_token}` },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        const properties: Array<{ propertyId: string; displayName: string; accountName: string }> = [];

        if (summariesResponse.ok) {
          const summaries = await summariesResponse.json();
          for (const account of summaries.accountSummaries || []) {
            for (const prop of account.propertySummaries || []) {
              properties.push({
                propertyId: prop.property,
                displayName: prop.displayName,
                accountName: account.displayName,
              });
            }
          }
        }

        return jsonResponse({
          success: true,
          properties,
          refreshToken: refresh_token,
          accessToken: access_token,
          expiresIn: expires_in,
          googleEmail,
          state,
        });
      }

      // ── Select Property ─────────────────────────────────────
      case 'select-property': {
        const { companyId, propertyId, propertyName, refreshToken, accessToken, expiresIn, googleEmail } = body;
        if (!companyId || !propertyId || !refreshToken) {
          return jsonResponse({ success: false, error: 'companyId, propertyId, and refreshToken required' }, 400);
        }

        const tokenExpiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null;

        const { data, error } = await supabase
          .from('google_analytics_connections')
          .upsert({
            company_id: companyId,
            property_id: propertyId,
            property_name: propertyName || null,
            refresh_token: refreshToken,
            access_token: accessToken || null,
            token_expires_at: tokenExpiresAt,
            google_email: googleEmail || 'unknown',
            is_active: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id,property_id' })
          .select()
          .single();

        if (error) {
          console.error('Failed to save GA connection:', error);
          return jsonResponse({ success: false, error: 'Failed to save connection' }, 500);
        }

        return jsonResponse({ success: true, connection: data });
      }

      // ── Disconnect ──────────────────────────────────────────
      case 'disconnect': {
        const { connectionId, companyId } = body;
        if (!connectionId) {
          return jsonResponse({ success: false, error: 'connectionId required' }, 400);
        }

        const query = supabase
          .from('google_analytics_connections')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', connectionId);

        if (companyId) query.eq('company_id', companyId);

        const { error } = await query;

        if (error) {
          return jsonResponse({ success: false, error: 'Failed to disconnect' }, 500);
        }

        return jsonResponse({ success: true });
      }

      // ── Sync Now (trigger immediate sync) ───────────────────
      case 'sync-now': {
        const { companyId } = body;
        if (!companyId) {
          return jsonResponse({ success: false, error: 'companyId required' }, 400);
        }

        // Trigger ga-analytics-sync for this company
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/ga-analytics-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ companyId }),
          signal: AbortSignal.timeout(55_000),
        });

        const syncResult = await syncResponse.json().catch(() => ({}));

        return jsonResponse({
          success: syncResponse.ok,
          syncResult,
        });
      }

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('google-analytics-auth error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
