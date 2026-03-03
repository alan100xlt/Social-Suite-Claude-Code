import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

async function safeJsonParse(response: Response): Promise<{ data: unknown; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
    try { return { data: JSON.parse(text), error: null }; }
    catch { return { data: null, error: 'Invalid JSON response from API' }; }
  }
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    if (text.includes('404')) return { data: null, error: 'Account not found (404)' };
    if (text.includes('401')) return { data: null, error: 'Authentication failed' };
    return { data: null, error: 'API returned an error page' };
  }
  return { data: null, error: text.substring(0, 100) || 'Unknown error' };
}

async function logApiCall(
  supabase: ReturnType<typeof createClient>,
  log: {
    function_name: string; action: string; request_body?: Record<string, unknown>;
    response_body?: unknown; status_code?: number; success: boolean;
    error_message?: string; duration_ms?: number; company_id?: string;
    user_id?: string; profile_id?: string; account_ids?: string[]; platform?: string;
  }
) {
  try {
    await supabase.from('api_call_logs').insert({
      function_name: log.function_name, action: log.action,
      request_body: log.request_body || {}, response_body: (log.response_body as Record<string, unknown>) || {},
      status_code: log.status_code, success: log.success, error_message: log.error_message,
      duration_ms: log.duration_ms, company_id: log.company_id || null,
      user_id: log.user_id || null, profile_id: log.profile_id || null,
      account_ids: log.account_ids || [], platform: log.platform || null,
    });
  } catch (e) { console.error('Failed to log API call:', e); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate: require valid JWT or service role
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    const apiKey = Deno.env.get('GETLATE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GetLate API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    const { action, accountId, profileId } = await req.json();
    const startTime = Date.now();

    // Helper: check for 429 rate limit
    const checkRateLimit = (response: Response): Response | null => {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.warn('Rate limited. Retry-After:', retryAfter);
        return new Response(
          JSON.stringify({ success: false, error: `Rate limited. Please try again in ${retryAfter} seconds.`, errorType: 'rate_limit', retryAfter }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return null;
    };

    const normalizeAccount = (account: Record<string, unknown>): Record<string, unknown> => {
      const id = account.id || account._id;
      if (!id) return account;
      return { ...account, id };
    };

    // List all connected accounts
    if (action === 'list') {
      const params = profileId ? `?profileId=${profileId}` : '';
      const response = await fetch(`${GETLATE_API_URL}/accounts${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitList = checkRateLimit(response);
      if (rateLimitList) return rateLimitList;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errorData = data as { message?: string };
        const errMsg = parseError || errorData?.message || 'Failed to list accounts';
        await logApiCall(supabase, {
          function_name: 'getlate-accounts', action: 'list',
          request_body: { profileId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, profile_id: profileId,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accountsData = data as { accounts?: Record<string, unknown>[] };
      const rawAccounts = accountsData.accounts || (Array.isArray(data) ? data as Record<string, unknown>[] : []);
      const normalizedAccounts = rawAccounts.map(normalizeAccount).filter(a => a.id);

      await logApiCall(supabase, {
        function_name: 'getlate-accounts', action: 'list',
        request_body: { profileId },
        response_body: { accountCount: normalizedAccounts.length },
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, profile_id: profileId,
      });
      return new Response(
        JSON.stringify({ success: true, accounts: normalizedAccounts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get single account details
    if (action === 'get') {
      const response = await fetch(`${GETLATE_API_URL}/accounts/${accountId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitGet = checkRateLimit(response);
      if (rateLimitGet) return rateLimitGet;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get account';
        await logApiCall(supabase, {
          function_name: 'getlate-accounts', action: 'get',
          request_body: { accountId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, account_ids: accountId ? [accountId] : [],
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawAccount = data as Record<string, unknown>;
      const normalizedAccount = { ...rawAccount, id: rawAccount.id || rawAccount._id };

      await logApiCall(supabase, {
        function_name: 'getlate-accounts', action: 'get',
        request_body: { accountId }, response_body: { platform: normalizedAccount.platform },
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, account_ids: accountId ? [accountId] : [],
        platform: normalizedAccount.platform as string,
      });
      return new Response(
        JSON.stringify({ success: true, account: normalizedAccount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Disconnect account
    if (action === 'disconnect') {
      if (!accountId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Account ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${GETLATE_API_URL}/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const duration = Date.now() - startTime;

      if (response.status === 204 || response.status === 200) {
        await logApiCall(supabase, {
          function_name: 'getlate-accounts', action: 'disconnect',
          request_body: { accountId }, status_code: response.status,
          success: true, duration_ms: duration, user_id: userId, account_ids: [accountId],
        });
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error: parseError } = await safeJsonParse(response);
      const errorData = data as { message?: string; error?: string };
      const errMsg = parseError || errorData?.message || errorData?.error || 'Failed to disconnect account';
      await logApiCall(supabase, {
        function_name: 'getlate-accounts', action: 'disconnect',
        request_body: { accountId }, response_body: data,
        status_code: response.status, success: false, error_message: errMsg,
        duration_ms: duration, user_id: userId, account_ids: [accountId],
      });
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get follower stats
    if (action === 'follower-stats') {
      const response = await fetch(`${GETLATE_API_URL}/accounts/follower-stats?accountId=${accountId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitFs = checkRateLimit(response);
      if (rateLimitFs) return rateLimitFs;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get follower stats';
        await logApiCall(supabase, {
          function_name: 'getlate-accounts', action: 'follower-stats',
          request_body: { accountId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, account_ids: accountId ? [accountId] : [],
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-accounts', action: 'follower-stats',
        request_body: { accountId }, response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, account_ids: accountId ? [accountId] : [],
      });
      return new Response(
        JSON.stringify({ success: true, stats: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in getlate-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logApiCall(supabase, {
      function_name: 'getlate-accounts', action: 'unknown',
      success: false, error_message: errorMessage,
    });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
