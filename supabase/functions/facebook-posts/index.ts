import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v19.0';

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  type?: string;
}

interface FacebookPostsResponse {
  data: FacebookPost[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require valid JWT or service role
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    const apiKey = Deno.env.get('GETLATE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, accountId, limit = 50 } = body;

    console.log('facebook-posts called with:', { action, accountId, limit });

    if (!accountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'accountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch account details directly from GetLate API
    const accountResponse = await fetch(`${GETLATE_API_URL}/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('GetLate account fetch status:', accountResponse.status);

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('Failed to fetch account from GetLate:', accountResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch account details: ${accountResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountData = await accountResponse.json();
    const account = accountData.account || accountData;
    
    console.log('Account data:', JSON.stringify({
      platform: account.platform,
      hasMetadata: !!account.metadata,
      hasPageToken: !!account.metadata?.pageAccessToken,
      selectedPageId: account.metadata?.selectedPageId,
    }));

    if (account.platform !== 'facebook') {
      return new Response(
        JSON.stringify({ success: false, error: 'This endpoint only supports Facebook accounts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pageAccessToken = account.metadata?.pageAccessToken;
    const pageId = account.metadata?.selectedPageId;

    if (!pageAccessToken || !pageId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Facebook page access token not found. Please reconnect your Facebook account.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'discover') {
      // Fetch posts from Facebook Graph API
      console.log(`Fetching posts for page ${pageId}`);
      
      const fields = 'id,message,created_time,permalink_url,full_picture,type,shares,likes.summary(true),comments.summary(true)';
      const fbResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${pageId}/posts?fields=${fields}&limit=${Math.min(limit, 100)}&access_token=${pageAccessToken}`
      );

      if (!fbResponse.ok) {
        const errorData = await fbResponse.json();
        console.error('Facebook API error:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorData.error?.message || 'Failed to fetch posts from Facebook' 
          }),
          { status: fbResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fbData: FacebookPostsResponse = await fbResponse.json();
      console.log(`Found ${fbData.data.length} posts from Facebook`);

      // Transform posts to include URLs
      const posts = fbData.data.map(post => ({
        id: post.id,
        url: post.permalink_url || `https://facebook.com/${post.id}`,
        message: post.message?.substring(0, 100) || '(no text)',
        createdAt: post.created_time,
        type: post.type,
        thumbnail: post.full_picture,
      }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          posts,
          total: posts.length,
          hasMore: !!fbData.paging?.next,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync-all') {
      // Fetch posts from Facebook and sync each one
      console.log(`Syncing all posts for page ${pageId}`);
      
      const fields = 'id,message,created_time,permalink_url';
      let allPosts: FacebookPost[] = [];
      let nextUrl: string | null = `${FACEBOOK_GRAPH_URL}/${pageId}/posts?fields=${fields}&limit=100&access_token=${pageAccessToken}`;
      
      // Fetch all pages of posts (up to limit)
      while (nextUrl && allPosts.length < limit) {
        const fbResponse = await fetch(nextUrl);
        
        if (!fbResponse.ok) {
          const errorData = await fbResponse.json();
          console.error('Facebook API error:', errorData);
          break;
        }

        const fbData: FacebookPostsResponse = await fbResponse.json();
        allPosts = [...allPosts, ...fbData.data];
        nextUrl = fbData.paging?.next || null;
        
        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Found ${allPosts.length} total posts to sync`);

      // Sync each post with GetLate
      const results = {
        total: allPosts.length,
        synced: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const post of allPosts.slice(0, limit)) {
        const postUrl = post.permalink_url || `https://facebook.com/${post.id}`;
        
        try {
          const syncResponse = await fetch(`${GETLATE_API_URL}/analytics/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId, postUrl }),
          });

          if (syncResponse.ok) {
            results.synced++;
            console.log(`Synced post: ${post.id}`);
          } else {
            results.failed++;
            const errorData = await syncResponse.json();
            results.errors.push(`${post.id}: ${errorData.message || 'Unknown error'}`);
          }
        } catch (syncError) {
          results.failed++;
          results.errors.push(`${post.id}: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('Sync complete:', results);

      return new Response(
        JSON.stringify({ success: true, ...results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "discover" or "sync-all"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in facebook-posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
