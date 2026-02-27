import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';

// Helper to safely parse JSON responses, handling HTML error pages
async function safeJsonParse(response: Response): Promise<{ data: unknown; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  
  // Check if response is JSON
  if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
    try {
      return { data: JSON.parse(text), error: null };
    } catch {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      return { data: null, error: 'Invalid JSON response from API' };
    }
  }
  
  // Response is HTML or other non-JSON
  console.error('Non-JSON response received:', text.substring(0, 200));
  
  // Try to extract error message from HTML if possible
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    // Check for common error patterns
    if (text.includes('404') || text.includes('Not Found')) {
      return { data: null, error: 'API endpoint not found (404)' };
    }
    if (text.includes('401') || text.includes('Unauthorized')) {
      return { data: null, error: 'Authentication failed' };
    }
    if (text.includes('expired') || text.includes('invalid')) {
      return { data: null, error: 'Token expired or invalid. Please try connecting again.' };
    }
    return { data: null, error: 'API returned an error page. The token may have expired.' };
  }
  
  return { data: null, error: text.substring(0, 100) || 'Unknown error' };
}

// Helper to get the first profile ID from GetLate
async function getDefaultProfileId(apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${GETLATE_API_URL}/profiles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const { data, error } = await safeJsonParse(response);
    
    if (error || !response.ok) {
      console.error('Failed to fetch profiles:', error);
      return null;
    }

    const profiles = data as { profiles?: Array<{ _id?: string; id?: string }> };
    // GetLate returns profiles array - use the first one
    if (profiles.profiles && profiles.profiles.length > 0) {
      return profiles.profiles[0]._id || profiles.profiles[0].id || null;
    }
    // Or it might be a direct array
    if (Array.isArray(data) && data.length > 0) {
      return data[0]._id || data[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return null;
  }
}

// Helper to create a new profile in GetLate
async function createProfile(apiKey: string, name: string, description?: string): Promise<{ id: string; name: string } | null> {
  try {
    console.log('Creating GetLate profile:', name);
    const response = await fetch(`${GETLATE_API_URL}/profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description: description || `Profile for ${name}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create profile:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('Profile created:', data);
    
    // Handle different response formats
    const profile = data.profile || data;
    return {
      id: profile._id || profile.id,
      name: profile.name,
    };
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
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
    
    if (!apiKey) {
      console.error('GETLATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'GetLate API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, platform, profileId, redirectUrl, tempToken, selection, companyId, companyName, userProfile } = body;

    // Create a new profile for a company
    if (action === 'create-profile') {
      if (!companyName) {
        return new Response(
          JSON.stringify({ success: false, error: 'Company name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profile = await createProfile(apiKey, companyName);
      
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create GetLate profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If companyId is provided, update the company with the new profile ID
      if (companyId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error: updateError } = await supabase
          .from('companies')
          .update({ getlate_profile_id: profile.id })
          .eq('id', companyId);

        if (updateError) {
          console.error('Failed to update company with profile ID:', updateError);
          // Don't fail - profile was still created
        } else {
          console.log('Updated company', companyId, 'with profile', profile.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile name
    if (action === 'update-profile') {
      const { profileId, name: newName } = body;
      
      if (!profileId || !newName) {
        return new Response(
          JSON.stringify({ success: false, error: 'Profile ID and name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Updating GetLate profile:', profileId, 'to name:', newName);
      
      const response = await fetch(`${GETLATE_API_URL}/profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          description: `Profile for ${newName}`,
        }),
      });

      const { data, error: parseError } = await safeJsonParse(response);

      if (parseError || !response.ok) {
        console.error('Failed to update profile:', parseError || data);
        const errorData = data as { message?: string } | null;
        return new Response(
          JSON.stringify({ success: false, error: parseError || errorData?.message || 'Failed to update profile' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Profile updated:', data);
      return new Response(
        JSON.stringify({ success: true, profile: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profiles list
    if (action === 'get-profiles') {
      const response = await fetch(`${GETLATE_API_URL}/profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const { data, error: parseError } = await safeJsonParse(response);

      if (parseError || !response.ok) {
        console.error('GetLate profiles error:', parseError || data);
        return new Response(
          JSON.stringify({ success: false, error: parseError || (data as { message?: string })?.message || 'Failed to get profiles' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileData = data as { profiles?: unknown[] };
      return new Response(
        JSON.stringify({ success: true, profiles: profileData.profiles || data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure profile exists for connection (auto-create if needed)
    if (action === 'ensure-profile') {
      if (!companyId || !companyName) {
        return new Response(
          JSON.stringify({ success: false, error: 'Company ID and name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Database not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check if company already has a profile
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('getlate_profile_id')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Failed to fetch company:', companyError);
        return new Response(
          JSON.stringify({ success: false, error: 'Company not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If company already has a profile, return it
      if (company.getlate_profile_id) {
        console.log('Company already has profile:', company.getlate_profile_id);
        return new Response(
          JSON.stringify({ success: true, profileId: company.getlate_profile_id, created: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a new profile for this company
      const profile = await createProfile(apiKey, companyName);
      
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create GetLate profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the company with the new profile ID
      const { error: updateError } = await supabase
        .from('companies')
        .update({ getlate_profile_id: profile.id })
        .eq('id', companyId);

      if (updateError) {
        console.error('Failed to update company with profile ID:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to link profile to company' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Created and linked profile', profile.id, 'to company', companyId);
      return new Response(
        JSON.stringify({ success: true, profileId: profile.id, created: true, profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start OAuth connection flow
    if (action === 'start') {
      // Use provided profileId or fetch the default one
      let actualProfileId = profileId;
      if (!actualProfileId || actualProfileId === 'default') {
        actualProfileId = await getDefaultProfileId(apiKey);
        if (!actualProfileId) {
          return new Response(
            JSON.stringify({ success: false, error: 'No GetLate profile found. Please create a profile first or link one to your company.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log('Starting OAuth for platform:', platform, 'with profileId:', actualProfileId);

      const params = new URLSearchParams({
        profileId: actualProfileId,
        headless: 'true',
        redirect_url: redirectUrl,
      });

      const response = await fetch(`${GETLATE_API_URL}/connect/${platform}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const { data, error: parseError } = await safeJsonParse(response);

      if (parseError || !response.ok) {
        console.error('GetLate connect error:', parseError || data);
        const errorData = data as { message?: string; error?: string };
        return new Response(
          JSON.stringify({ success: false, error: parseError || errorData?.message || errorData?.error || 'Failed to start connection' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const connectData = data as { authUrl?: string };
      console.log('OAuth URL received:', connectData.authUrl);
      return new Response(
        JSON.stringify({ success: true, authUrl: connectData.authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Complete connection with page/account selection (for platforms like Facebook, LinkedIn)
    if (action === 'select') {
      let actualProfileId = profileId;
      if (!actualProfileId || actualProfileId === 'default') {
        actualProfileId = await getDefaultProfileId(apiKey);
      }

      if (!tempToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token is required. Please try connecting again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!selection?.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Page/account selection is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Selecting page:', selection.name, 'id:', selection.id, 'for platform:', platform, 'profileId:', actualProfileId);
      console.log('UserProfile received:', JSON.stringify(userProfile));

      // Build request body - GetLate API expects specific field names including userProfile object
      const requestBody: Record<string, unknown> = {
        tempToken,
        pageId: selection.id,
        profileId: actualProfileId,
      };

      // Add userProfile if provided (required by GetLate for some platforms)
      if (userProfile) {
        requestBody.userProfile = userProfile;
      }
      
      console.log('Select request body:', JSON.stringify(requestBody));

      const response = await fetch(`${GETLATE_API_URL}/connect/${platform}/select-page`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Select response status:', response.status);
      const { data, error: parseError } = await safeJsonParse(response);
      console.log('Select response data:', JSON.stringify(data));

      if (parseError || !response.ok) {
        console.error('GetLate select error - status:', response.status, 'parseError:', parseError, 'data:', JSON.stringify(data));
        const errorData = data as { message?: string; error?: string; details?: string };
        const errorMessage = parseError || errorData?.message || errorData?.error || errorData?.details || 'Failed to complete connection';
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: response.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Page connected successfully:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: true, account: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get available pages/accounts to select from
    if (action === 'get-options') {
      if (!tempToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token is required. Please try connecting again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the correct GetLate endpoint: GET /connect/{platform}/select-page
      const params = new URLSearchParams({
        tempToken,
        profileId: profileId || '',
      });

      console.log('Fetching page options for platform:', platform);
      
      const response = await fetch(`${GETLATE_API_URL}/connect/${platform}/select-page?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const { data, error: parseError } = await safeJsonParse(response);

      if (parseError) {
        console.error('GetLate options parse error:', parseError);
        return new Response(
          JSON.stringify({ success: false, error: parseError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        console.error('GetLate options error:', data);
        const errorData = data as { message?: string; error?: string };
        return new Response(
          JSON.stringify({ success: false, error: errorData?.message || errorData?.error || 'Failed to get options' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GetLate returns { pages: [...] } for Facebook, { channels: [...] } for YouTube, etc.
      const responseData = data as { 
        pages?: Array<{ id: string; name: string; username?: string; pictureUrl?: string }>;
        channels?: Array<{ id: string; name: string; username?: string; pictureUrl?: string }>;
        accounts?: Array<{ id: string; name: string; username?: string; pictureUrl?: string }>;
      };
      
      // Try different response formats
      const rawOptions = responseData.pages || responseData.channels || responseData.accounts || [];
      const options = rawOptions.map(item => ({
        id: item.id,
        name: item.name || item.username || item.id,
        pictureUrl: item.pictureUrl,
      }));
      
      console.log('Response data keys:', Object.keys(data as object));
      console.log('Raw options found:', JSON.stringify(rawOptions));

      console.log('Found', options.length, 'pages/accounts to select from');
      
      return new Response(
        JSON.stringify({ success: true, options }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in getlate-connect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
