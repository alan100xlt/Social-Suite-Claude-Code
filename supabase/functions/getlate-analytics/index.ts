import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

// ── Action registry ─────────────────────────────────────────────────────────
// Each action defines its endpoint, HTTP method, which body fields become
// query params (GET) or JSON body (POST), and how to shape the success response.
// Adding a new GetLate analytics action = adding one entry here.

interface ActionConfig {
  /** API path appended to GETLATE_API_URL (e.g. "/analytics/best-time") */
  path: string;
  method: 'GET' | 'POST';
  /** Body fields forwarded as query params (GET) or JSON body (POST). */
  forwardFields: string[];
  /** Whether this action needs the company's getlate_profile_id resolved and sent as `profileId`. */
  needsProfileId: boolean;
  /** Key used to wrap the response data in the success payload (e.g. "analytics", "overview"). Omit to spread data into the root. */
  responseKey?: string;
}

const ACTIONS: Record<string, ActionConfig> = {
  'get': {
    path: '/analytics',
    method: 'GET',
    forwardFields: ['postId', 'postIds'],
    needsProfileId: false,
    responseKey: 'analytics',
  },
  'sync': {
    path: '/analytics/sync',
    method: 'POST',
    forwardFields: ['accountId', 'postUrl'],
    needsProfileId: false,
    responseKey: 'analytics',
  },
  'youtube-daily': {
    path: '/analytics/youtube/daily-views',
    method: 'GET',
    forwardFields: ['postId'],
    needsProfileId: false,
    responseKey: 'dailyViews',
  },
  'overview': {
    path: '/analytics/overview',
    method: 'GET',
    forwardFields: ['accountIds', 'startDate', 'endDate'],
    needsProfileId: false,
    responseKey: 'overview',
  },
  'best-time': {
    path: '/analytics/best-time',
    method: 'GET',
    forwardFields: ['platform', 'profileId'],
    needsProfileId: true,
  },
  'content-decay': {
    path: '/analytics/get-content-decay',
    method: 'GET',
    forwardFields: ['platform', 'accountId', 'postId'],
    needsProfileId: true,
  },
  'posting-frequency': {
    path: '/analytics/get-posting-frequency',
    method: 'GET',
    forwardFields: ['platform'],
    needsProfileId: true,
  },
  'daily-metrics': {
    path: '/analytics/daily-metrics',
    method: 'GET',
    forwardFields: ['profileId', 'startDate', 'endDate', 'platform'],
    needsProfileId: true,
    responseKey: 'dailyMetrics',
  },
  'post-timeline': {
    path: '/analytics/post-timeline',
    method: 'GET',
    forwardFields: ['postId', 'fromDate', 'toDate'],
    needsProfileId: false,
    responseKey: 'timeline',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function safeJsonParse(response: Response): Promise<{ data: unknown; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text || text.trim() === '') {
    return { data: null, error: response.ok ? null : `Empty response with status ${response.status}` };
  }
  if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
    try { return { data: JSON.parse(text), error: null }; }
    catch { return { data: null, error: 'Invalid JSON response from API' }; }
  }
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    if (text.includes('404')) return { data: null, error: 'Endpoint not found (404)' };
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
    error_message?: string; duration_ms?: number; user_id?: string;
    profile_id?: string; account_ids?: string[]; platform?: string;
  }
) {
  try {
    await supabase.from('api_call_logs').insert({
      function_name: log.function_name, action: log.action,
      request_body: log.request_body || {}, response_body: (log.response_body as Record<string, unknown>) || {},
      status_code: log.status_code, success: log.success, error_message: log.error_message,
      duration_ms: log.duration_ms, user_id: log.user_id || null,
      profile_id: log.profile_id || null, account_ids: log.account_ids || [],
      platform: log.platform || null,
    });
  } catch (e) { console.error('Failed to log API call:', e); }
}

async function resolveProfileId(
  supabase: ReturnType<typeof createClient>,
  companyId?: string,
): Promise<string | null> {
  if (!companyId) return null;
  const { data } = await supabase
    .from('companies')
    .select('getlate_profile_id')
    .eq('id', companyId)
    .single();
  return data?.getlate_profile_id || null;
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    const body = await req.json();
    const { action, companyId } = body;
    const config = ACTIONS[action];

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const startTime = Date.now();

    // Resolve profileId from companyId when the action needs it
    let profileId: string | null = null;
    if (config.needsProfileId) {
      // Prefer an explicitly-passed profileId, fall back to company lookup
      profileId = body.profileId || await resolveProfileId(supabase, companyId);
    }

    // Build the fetch request
    const apiHeaders = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    let url: string;
    let fetchInit: RequestInit;

    if (config.method === 'GET') {
      const params = new URLSearchParams();

      // Inject resolved profileId for actions that need it
      if (config.needsProfileId && profileId) {
        params.append('profileId', profileId);
      }

      for (const field of config.forwardFields) {
        // Skip profileId if we already set it from resolution
        if (field === 'profileId' && config.needsProfileId) continue;

        const value = body[field];
        if (value !== undefined && value !== null) {
          params.append(field, Array.isArray(value) ? value.join(',') : String(value));
        }
      }

      const qs = params.toString();
      url = `${GETLATE_API_URL}${config.path}${qs ? `?${qs}` : ''}`;
      fetchInit = { method: 'GET', headers: apiHeaders };
    } else {
      // POST — forward fields as JSON body
      const postBody: Record<string, unknown> = {};
      if (config.needsProfileId && profileId) {
        postBody.profileId = profileId;
      }
      for (const field of config.forwardFields) {
        if (body[field] !== undefined) postBody[field] = body[field];
      }
      url = `${GETLATE_API_URL}${config.path}`;
      fetchInit = { method: 'POST', headers: apiHeaders, body: JSON.stringify(postBody) };
    }

    // Execute
    const response = await fetch(url, fetchInit);

    // Rate limit check
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      console.warn('Rate limited. Retry-After:', retryAfter);
      return new Response(
        JSON.stringify({ success: false, error: `Rate limited. Please try again in ${retryAfter} seconds.`, errorType: 'rate_limit', retryAfter }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, error: parseError } = await safeJsonParse(response);
    const duration = Date.now() - startTime;

    // Build log context from body
    const logContext: Record<string, unknown> = {};
    for (const field of config.forwardFields) {
      if (body[field] !== undefined) logContext[field] = body[field];
    }

    if (parseError || !response.ok) {
      const errMsg = parseError || (data as { message?: string })?.message || `Failed: ${action}`;
      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action,
        request_body: logContext, response_body: data,
        status_code: response.status, success: false, error_message: errMsg,
        duration_ms: duration, user_id: userId,
        profile_id: profileId || undefined,
        account_ids: body.accountIds || (body.accountId ? [body.accountId] : []),
        platform: body.platform,
      });
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Success
    await logApiCall(supabase, {
      function_name: 'getlate-analytics', action,
      request_body: logContext,
      response_body: { hasData: !!data },
      status_code: response.status, success: true, duration_ms: duration,
      user_id: userId,
      profile_id: profileId || undefined,
      account_ids: body.accountIds || (body.accountId ? [body.accountId] : []),
      platform: body.platform,
    });

    // Shape the success response: either wrap under a key or spread
    const payload = config.responseKey
      ? { success: true, [config.responseKey]: data }
      : { success: true, ...(data as object) };

    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in getlate-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logApiCall(supabase, {
      function_name: 'getlate-analytics', action: 'unknown',
      success: false, error_message: errorMessage,
    });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
