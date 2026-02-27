import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINEAR_API_URL = 'https://api.linear.app/graphql';

async function linearRequest(query: string, variables: Record<string, unknown>, apiKey: string) {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    // Personal API keys use "Authorization: <key>" (no Bearer prefix)
    // OAuth tokens use "Authorization: Bearer <token>"
    'Authorization': apiKey.startsWith('lin_api_') ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LINEAR_API_KEY = Deno.env.get('LINEAR_API_KEY');
    const LINEAR_TEAM_ID = Deno.env.get('LINEAR_TEAM_ID');
    if (!LINEAR_API_KEY) throw new Error('LINEAR_API_KEY not configured');
    if (!LINEAR_TEAM_ID) throw new Error('LINEAR_TEAM_ID not configured');

    // Validate auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { feedbackText, feedbackTitle, feedbackType, priority, companyName, companyDomain, companySize, companyWebsite, userName, userEmail } = body;

    if (!feedbackText?.trim()) {
      return new Response(JSON.stringify({ error: 'Feedback text is required' }), { status: 400, headers: corsHeaders });
    }

    // Step 1: Upsert Linear Customer (the company)
    const domain = companyDomain || (companyWebsite ? new URL(companyWebsite).hostname.replace('www.', '') : null);

    let customerId: string | null = null;

    if (domain || companyName) {
      try {
        // Try to create customer — Linear deduplicates by domain
        const createCustomerQuery = `
          mutation CustomerCreate($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
              success
              customer { id name }
            }
          }
        `;
        const customerInput: Record<string, unknown> = {
          name: companyName || domain,
        };
        if (domain) customerInput.domains = [domain];
        if (companySize) customerInput.size = companySize;

        const customerData = await linearRequest(createCustomerQuery, { input: customerInput }, LINEAR_API_KEY);
        customerId = customerData?.customerCreate?.customer?.id ?? null;
      } catch (e) {
        // Customer may already exist — that's OK, proceed without customerId
        console.warn('Customer upsert failed (may already exist):', e);
      }
    }

    // Step 2: Create a Linear issue for the feedback
    const typeEmoji: Record<string, string> = {
      feature: '✨',
      bug: '🐛',
      general: '💬',
    };
    const emoji = typeEmoji[feedbackType] || '💬';
    const typeLabel = feedbackType === 'feature' ? 'Feature Request' : feedbackType === 'bug' ? 'Bug Report' : 'Feedback';

    const createIssueQuery = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;

    const issueInput: Record<string, unknown> = {
      teamId: LINEAR_TEAM_ID,
      title: feedbackTitle
        ? `${emoji} [${typeLabel}] ${feedbackTitle}`
        : `${emoji} [${typeLabel}] ${feedbackText.slice(0, 80)}${feedbackText.length > 80 ? '…' : ''}`,
      description: `**${typeLabel}** submitted via in-app feedback\n\n---\n\n${feedbackText}\n\n---\n\n**Submitted by:** ${userName || 'Unknown'} (${userEmail || 'no email'})\n**Company:** ${companyName || 'Unknown'}\n**Website:** ${companyWebsite || 'N/A'}\n**Domain:** ${domain || 'N/A'}\n**Company size:** ${companySize || 'N/A'}`,
    };
    if (typeof priority === 'number') issueInput.priority = priority;

    const issueData = await linearRequest(createIssueQuery, { input: issueInput }, LINEAR_API_KEY);
    const issueId = issueData?.issueCreate?.issue?.id;
    const issueUrl = issueData?.issueCreate?.issue?.url;

    // Step 3: Attach customer need to the issue if we have both
    if (customerId && issueId) {
      try {
        const createNeedQuery = `
          mutation CustomerNeedCreate($input: CustomerNeedCreateInput!) {
            customerNeedCreate(input: $input) {
              success
              customerNeed { id }
            }
          }
        `;
        await linearRequest(createNeedQuery, {
          input: {
            customerId,
            issueId,
            body: feedbackText,
          },
        }, LINEAR_API_KEY);
      } catch (e) {
        console.warn('CustomerNeed attach failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, issueUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('linear-feedback error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
