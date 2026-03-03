import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

async function logApiCall(
  supabase: ReturnType<typeof createClient>,
  log: {
    function_name: string;
    action: string;
    request_body?: Record<string, unknown>;
    response_body?: unknown;
    status_code?: number;
    success: boolean;
    error_message?: string;
    duration_ms?: number;
    company_id?: string;
    user_id?: string;
    profile_id?: string;
    account_ids?: string[];
    platform?: string;
  }
) {
  try {
    await supabase.from('api_call_logs').insert({
      function_name: log.function_name,
      action: log.action,
      request_body: log.request_body || {},
      response_body: (log.response_body as Record<string, unknown>) || {},
      status_code: log.status_code,
      success: log.success,
      error_message: log.error_message,
      duration_ms: log.duration_ms,
      company_id: log.company_id || null,
      user_id: log.user_id || null,
      profile_id: log.profile_id || null,
      account_ids: log.account_ids || [],
      platform: log.platform || null,
    });
  } catch (e) {
    console.error('Failed to log API call:', e);
  }
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
      console.error('GETLATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    const body = await req.json();
    const { action, profileId } = body;
    const startTime = Date.now();

    // Create a new post
    if (action === 'create') {
      const { accountIds, text, content, mediaItems, scheduledFor, publishNow, platformOptions, platforms, source, objective } = body;

      // SERVER-SIDE VALIDATION: Verify all accountIds belong to the company's profile
      // Also build account metadata for explicit platforms array to prevent cross-posting
      const profileAccountsMap: Map<string, Record<string, unknown>> = new Map();
      if (profileId && accountIds && accountIds.length > 0) {
        const verifyResponse = await fetch(`${GETLATE_API_URL}/accounts?profileId=${profileId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const profileAccounts = verifyData.accounts || (Array.isArray(verifyData) ? verifyData : []);
          for (const a of profileAccounts) {
            const aid = (a.id || a._id) as string;
            profileAccountsMap.set(aid, a);
          }
          const validIds = new Set(profileAccountsMap.keys());
          const invalidIds = accountIds.filter((id: string) => !validIds.has(id));

          if (invalidIds.length > 0) {
            console.error('Cross-company posting blocked! Invalid account IDs:', invalidIds, 'for profile:', profileId);
            await logApiCall(supabase, {
              function_name: 'getlate-posts', action: 'create',
              request_body: { accountIds, profileId },
              success: false,
              error_message: `Blocked: account IDs ${invalidIds.join(', ')} do not belong to profile ${profileId}`,
              duration_ms: Date.now() - startTime, user_id: userId, profile_id: profileId,
              account_ids: accountIds,
            });
            return new Response(
              JSON.stringify({ success: false, error: 'One or more selected accounts do not belong to this company profile. Post blocked for security.' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      const postContent = content || text;
      
      const postData: Record<string, unknown> = {
        accountIds,
        content: postContent,
        crosspostingEnabled: false,
      };

      // CRITICAL: Always send explicit platforms array to prevent GetLate from
      // auto-expanding to all accounts under the same user (cross-posting bug)
      if (platforms && Array.isArray(platforms) && platforms.length > 0) {
        postData.platforms = platforms;
      } else {
        // Auto-generate platforms entries from accountIds to restrict posting
        const autoPlatforms = accountIds.map((id: string) => {
          const account = profileAccountsMap.get(id);
          return {
            platform: account?.platform || 'unknown',
            accountId: id,
            content: postContent,
          };
        });
        if (autoPlatforms.length > 0) {
          postData.platforms = autoPlatforms;
        }
      }
      if (mediaItems && mediaItems.length > 0) {
        postData.mediaItems = mediaItems;
      }
      if (publishNow) {
        postData.publishNow = true;
      } else if (scheduledFor) {
        postData.scheduledFor = scheduledFor;
      }
      if (platformOptions) {
        postData.platformOptions = platformOptions;
      }
      if (source || objective) {
        postData.metadata = {
          ...(source ? { source } : {}),
          ...(objective ? { objective } : {}),
        };
      }

      console.log('Creating post with data:', JSON.stringify(postData));

      const response = await fetch(`${GETLATE_API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Handle 429 Rate Limit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.warn('Rate limited. Retry-After:', retryAfter);
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'create',
          request_body: postData as Record<string, unknown>,
          response_body: data, status_code: 429,
          success: false, error_message: `Rate limited. Retry after ${retryAfter}s`,
          duration_ms: duration, user_id: userId, profile_id: profileId,
          account_ids: accountIds,
        });
        return new Response(
          JSON.stringify({ success: false, error: `Rate limited. Please try again in ${retryAfter} seconds.`, errorType: 'rate_limit', retryAfter }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle 409 Duplicate Content
      if (response.status === 409) {
        console.warn('Duplicate content detected:', data);
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'create',
          request_body: postData as Record<string, unknown>,
          response_body: data, status_code: 409,
          success: false, error_message: 'Duplicate content detected',
          duration_ms: duration, user_id: userId, profile_id: profileId,
          account_ids: accountIds,
        });
        return new Response(
          JSON.stringify({ success: false, error: 'This content was already posted in the last 24 hours.', errorType: 'duplicate_content' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        console.error('GetLate create post error:', data);
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'create',
          request_body: postData as Record<string, unknown>,
          response_body: data, status_code: response.status,
          success: false, error_message: data.error || data.message || 'Failed to create post',
          duration_ms: duration, user_id: userId, profile_id: profileId,
          account_ids: accountIds,
        });
        return new Response(
          JSON.stringify({ success: false, error: data.error || data.message || 'Failed to create post' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle partial success (some platforms failed)
      const isPartial = data.status === 'partial';
      if (isPartial) {
        const failedPlatforms = (data.platformResults || [])
          .filter((r: { status: string }) => r.status === 'failed')
          .map((r: { platform: string; errorMessage?: string }) => r.platform + (r.errorMessage ? `: ${r.errorMessage}` : ''));
        console.warn('Partial post success. Failed platforms:', failedPlatforms);
      }

      console.log('Post created:', isPartial ? 'partial' : 'success', data);
      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'create',
        request_body: postData as Record<string, unknown>,
        response_body: data, status_code: response.status,
        success: true, duration_ms: duration, user_id: userId, profile_id: profileId,
        account_ids: accountIds,
      });

      // Send in-app notification to the user who created the post
      if (userId) {
        const platformNames = accountIds.map((id: string) => {
          const acc = profileAccountsMap.get(id);
          return acc?.platform || 'unknown';
        }).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ');
        fetch(`${supabaseUrl}/functions/v1/send-in-app-notification`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: isPartial ? '⚠️ Post Partially Published' : '📤 Post Published',
            body: isPartial
              ? `Your post was partially published to ${platformNames}. Some platforms failed.`
              : `Your post has been published to ${platformNames}.`,
          }),
        }).catch(e => console.error('In-app notification error:', e));
      }

      return new Response(
        JSON.stringify({ success: true, post: data, isPartial }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List posts
    if (action === 'list') {
      const { status, platform, limit, offset } = body;
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (platform) params.append('platform', platform);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      if (profileId) params.append('profileId', profileId);

      const response = await fetch(`${GETLATE_API_URL}/posts?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error('GetLate list posts error:', data);
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'list',
          request_body: { status, platform, limit, offset, profileId },
          response_body: data, status_code: response.status,
          success: false, error_message: data.message || 'Failed to list posts',
          duration_ms: duration, user_id: userId, profile_id: profileId, platform,
        });
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to list posts' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'list',
        request_body: { status, platform, limit, offset, profileId },
        response_body: { postCount: (data.posts || data)?.length },
        status_code: response.status, success: true, duration_ms: duration,
        user_id: userId, profile_id: profileId, platform,
      });
      return new Response(
        JSON.stringify({ success: true, posts: data.posts || data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get single post
    if (action === 'get') {
      const { postId } = body;
      const response = await fetch(`${GETLATE_API_URL}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error('GetLate get post error:', data);
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'get',
          request_body: { postId }, response_body: data,
          status_code: response.status, success: false,
          error_message: data.message || 'Failed to get post',
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to get post' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'get',
        request_body: { postId }, response_body: { postId: data.id || data._id },
        status_code: response.status, success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true, post: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update post
    if (action === 'update') {
      const { postId, text, scheduledFor } = body;
      const response = await fetch(`${GETLATE_API_URL}/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, scheduledFor }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'update',
          request_body: { postId, text, scheduledFor }, response_body: data,
          status_code: response.status, success: false,
          error_message: data.message || 'Failed to update post',
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to update post' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'update',
        request_body: { postId, text, scheduledFor }, response_body: data,
        status_code: response.status, success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true, post: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete post
    if (action === 'delete') {
      const { postId } = body;
      const response = await fetch(`${GETLATE_API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const data = await response.json();
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'delete',
          request_body: { postId }, response_body: data,
          status_code: response.status, success: false,
          error_message: data.message || 'Failed to delete post',
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to delete post' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'delete',
        request_body: { postId }, status_code: response.status,
        success: true, duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unpublish post (remove from social platforms, keep in Longtale)
    if (action === 'unpublish') {
      const { postId, platforms: targetPlatforms } = body;
      if (!postId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Post ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const requestBody: Record<string, unknown> = {};
      if (targetPlatforms && Array.isArray(targetPlatforms) && targetPlatforms.length > 0) {
        requestBody.platforms = targetPlatforms;
      }

      const response = await fetch(`${GETLATE_API_URL}/posts/${postId}/unpublish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const duration = Date.now() - startTime;

      if (response.status === 204 || response.status === 200) {
        await logApiCall(supabase, {
          function_name: 'getlate-posts', action: 'unpublish',
          request_body: { postId, platforms: targetPlatforms },
          status_code: response.status, success: true,
          duration_ms: duration, user_id: userId,
        });
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'unpublish',
        request_body: { postId, platforms: targetPlatforms },
        response_body: data, status_code: response.status,
        success: false, error_message: data.message || 'Failed to unpublish post',
        duration_ms: duration, user_id: userId,
      });
      return new Response(
        JSON.stringify({ success: false, error: data.message || 'Failed to unpublish post' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate post content length per platform
    if (action === 'validate-length') {
      const { text, platforms: targetPlatforms } = body;
      const response = await fetch(`${GETLATE_API_URL}/tools/validate/post-length`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, platforms: targetPlatforms }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'validate-length',
        request_body: { textLength: text?.length, platforms: targetPlatforms },
        response_body: data, status_code: response.status,
        success: response.ok, duration_ms: duration, user_id: userId,
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Validation failed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, validation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate full post (content + media + platform rules)
    if (action === 'validate-post') {
      const { text, mediaItems, platforms: targetPlatforms, accountIds: targetAccountIds } = body;
      const response = await fetch(`${GETLATE_API_URL}/tools/validate/post`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mediaItems, platforms: targetPlatforms, accountIds: targetAccountIds }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'validate-post',
        request_body: { textLength: text?.length, mediaCount: mediaItems?.length, platforms: targetPlatforms },
        response_body: data, status_code: response.status,
        success: response.ok, duration_ms: duration, user_id: userId,
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Validation failed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, validation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate media files
    if (action === 'validate-media') {
      const { mediaItems } = body;
      const response = await fetch(`${GETLATE_API_URL}/tools/validate/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaItems }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      await logApiCall(supabase, {
        function_name: 'getlate-posts', action: 'validate-media',
        request_body: { mediaCount: mediaItems?.length },
        response_body: data, status_code: response.status,
        success: response.ok, duration_ms: duration, user_id: userId,
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Media validation failed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, validation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in getlate-posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logApiCall(supabase, {
      function_name: 'getlate-posts', action: 'unknown',
      success: false, error_message: errorMessage,
    });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
