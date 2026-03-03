import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

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

    const body = await req.json();
    const { action } = body;
    const startTime = Date.now();

    // Helper: check for 429 rate limit before generic error handling
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

    // Get analytics for post(s)
    if (action === 'get') {
      const { postId, postIds } = body;
      let url = `${GETLATE_API_URL}/analytics`;
      if (postId) url += `?postId=${postId}`;
      else if (postIds && postIds.length > 0) url += `?postIds=${postIds.join(',')}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitResponse = checkRateLimit(response);
      if (rateLimitResponse) return rateLimitResponse;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get analytics';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'get',
          request_body: { postId, postIds }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'get',
        request_body: { postId, postIds },
        response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true, analytics: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync analytics from external posts
    if (action === 'sync') {
      const { accountId, postUrl } = body;
      const response = await fetch(`${GETLATE_API_URL}/analytics/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, postUrl }),
      });

      const rateLimitSync = checkRateLimit(response);
      if (rateLimitSync) return rateLimitSync;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to sync analytics';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'sync',
          request_body: { accountId, postUrl }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, account_ids: accountId ? [accountId] : [],
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'sync',
        request_body: { accountId, postUrl }, response_body: data,
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, account_ids: accountId ? [accountId] : [],
      });
      return new Response(
        JSON.stringify({ success: true, analytics: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get YouTube daily views breakdown
    if (action === 'youtube-daily') {
      const { postId } = body;
      const response = await fetch(`${GETLATE_API_URL}/analytics/youtube/daily-views?postId=${postId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitYt = checkRateLimit(response);
      if (rateLimitYt) return rateLimitYt;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get YouTube daily views';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'youtube-daily',
          request_body: { postId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'youtube-daily',
        request_body: { postId }, response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true, dailyViews: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get account overview analytics
    if (action === 'overview') {
      const { accountIds, startDate, endDate } = body;
      const params = new URLSearchParams();
      if (accountIds) params.append('accountIds', accountIds.join(','));
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${GETLATE_API_URL}/analytics/overview?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitOv = checkRateLimit(response);
      if (rateLimitOv) return rateLimitOv;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get analytics overview';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'overview',
          request_body: { accountIds, startDate, endDate }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, account_ids: accountIds,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'overview',
        request_body: { accountIds, startDate, endDate },
        response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, account_ids: accountIds,
      });
      return new Response(
        JSON.stringify({ success: true, overview: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get best times to post (by day/hour)
    if (action === 'best-time') {
      const { platform, profileId } = body;
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);
      if (profileId) params.append('profileId', profileId);

      const response = await fetch(`${GETLATE_API_URL}/analytics/best-time?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitBt = checkRateLimit(response);
      if (rateLimitBt) return rateLimitBt;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get best times';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'best-time',
          request_body: { platform, profileId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, platform,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'best-time',
        request_body: { platform, profileId }, response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId, platform,
      });
      return new Response(
        JSON.stringify({ success: true, ...(data as object) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content decay (engagement accumulation over time after publish)
    if (action === 'content-decay') {
      const { platform, accountId, postId } = body;
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);
      if (accountId) params.append('accountId', accountId);
      if (postId) params.append('postId', postId);

      const response = await fetch(`${GETLATE_API_URL}/analytics/get-content-decay?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitCd = checkRateLimit(response);
      if (rateLimitCd) return rateLimitCd;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get content decay';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'content-decay',
          request_body: { platform, accountId, postId }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, platform,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'content-decay',
        request_body: { platform, accountId, postId }, response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId, platform,
      });
      return new Response(
        JSON.stringify({ success: true, ...(data as object) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get posting frequency vs engagement correlation
    if (action === 'posting-frequency') {
      const { platform } = body;
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);

      const response = await fetch(`${GETLATE_API_URL}/analytics/get-posting-frequency?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitPf = checkRateLimit(response);
      if (rateLimitPf) return rateLimitPf;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get posting frequency';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'posting-frequency',
          request_body: { platform }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, platform,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'posting-frequency',
        request_body: { platform }, response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId, platform,
      });
      return new Response(
        JSON.stringify({ success: true, ...(data as object) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get daily metrics (aggregated per day)
    if (action === 'daily-metrics') {
      const { profileId, startDate, endDate, platform } = body;
      const params = new URLSearchParams();
      if (profileId) params.append('profileId', profileId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (platform) params.append('platform', platform);

      const response = await fetch(`${GETLATE_API_URL}/analytics/daily-metrics?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitDm = checkRateLimit(response);
      if (rateLimitDm) return rateLimitDm;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get daily metrics';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'daily-metrics',
          request_body: { profileId, startDate, endDate, platform }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId, platform,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'daily-metrics',
        request_body: { profileId, startDate, endDate, platform },
        response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId, platform,
      });
      return new Response(
        JSON.stringify({ success: true, dailyMetrics: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get post timeline (engagement over time for a specific post)
    if (action === 'post-timeline') {
      const { postId, fromDate, toDate } = body;
      const params = new URLSearchParams();
      if (postId) params.append('postId', postId);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`${GETLATE_API_URL}/analytics/post-timeline?${params}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });

      const rateLimitPt = checkRateLimit(response);
      if (rateLimitPt) return rateLimitPt;

      const { data, error: parseError } = await safeJsonParse(response);
      const duration = Date.now() - startTime;

      if (parseError || !response.ok) {
        const errMsg = parseError || (data as { message?: string })?.message || 'Failed to get post timeline';
        await logApiCall(supabase, {
          function_name: 'getlate-analytics', action: 'post-timeline',
          request_body: { postId, fromDate, toDate }, response_body: data,
          status_code: response.status, success: false, error_message: errMsg,
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-analytics', action: 'post-timeline',
        request_body: { postId, fromDate, toDate },
        response_body: { hasData: !!data },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true, timeline: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
