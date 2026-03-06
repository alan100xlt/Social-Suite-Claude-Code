import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { classifyConversation } from '../_shared/classify.ts';
import { callGemini } from '../_shared/inbox-ai-helpers.ts';

const BATCH_SIZE = 10;
const THROTTLE_MS = 500;
const MAX_CURSOR = 5000; // Safety guard: stop after 5000 conversations to prevent infinite self-chaining

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { companyId, jobId, cursor } = body;

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: user-initiated calls require company membership; self-chain uses service role
    if (jobId) {
      // Self-chain continuation — require service role
      await authorize(req, { allowServiceRole: true, companyId });
    } else {
      // User-initiated — require company membership
      await authorize(req, { companyId });
    }

    // First invocation — create the job
    if (!jobId) {
      return await startBackfill(supabase, companyId);
    }

    // Subsequent invocation — continue classifying
    return await continueBackfill(supabase, geminiApiKey, companyId, jobId, cursor || 0);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('inbox-backfill error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startBackfill(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  // Check for existing running job
  const { data: existing } = await supabase
    .from('inbox_backfill_jobs')
    .select('id, status')
    .eq('company_id', companyId)
    .in('status', ['pending', 'running'])
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Backfill already in progress',
      jobId: existing[0].id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Count unclassified conversations
  const { count } = await supabase
    .from('inbox_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('ai_classified_at', null);

  // Create the job
  const { data: job, error } = await supabase
    .from('inbox_backfill_jobs')
    .insert({
      company_id: companyId,
      status: 'running',
      total_conversations: count || 0,
      classified_conversations: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Self-chain: fire-and-forget to start classification
  if ((count || 0) > 0) {
    const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbox-backfill`;
    fetch(selfUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId, jobId: job.id, cursor: 0 }),
    }).catch(() => {}); // Fire-and-forget
  } else {
    // No conversations to classify — generate report immediately
    await generateAuditReport(supabase, Deno.env.get('GEMINI_API_KEY') || '', companyId, job.id);
  }

  return new Response(JSON.stringify({
    success: true,
    jobId: job.id,
    totalConversations: count || 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function continueBackfill(
  supabase: ReturnType<typeof createClient>,
  geminiApiKey: string | undefined,
  companyId: string,
  jobId: string,
  cursor: number
) {
  // Safety guard: stop if cursor exceeds max to prevent runaway self-chaining
  if (cursor >= MAX_CURSOR) {
    await supabase
      .from('inbox_backfill_jobs')
      .update({ status: 'completed', error: `Stopped at cursor ${cursor} (max ${MAX_CURSOR})`, completed_at: new Date().toISOString() })
      .eq('id', jobId);
    return new Response(JSON.stringify({ success: true, status: 'completed', reason: 'max_cursor_reached' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!geminiApiKey) {
    await supabase
      .from('inbox_backfill_jobs')
      .update({ status: 'failed', error: 'GEMINI_API_KEY not configured' })
      .eq('id', jobId);
    return new Response(JSON.stringify({ error: 'No API key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch next batch of unclassified conversations
  const { data: conversations } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('company_id', companyId)
    .is('ai_classified_at', null)
    .order('created_at', { ascending: true })
    .range(0, BATCH_SIZE - 1);

  if (!conversations || conversations.length === 0) {
    // All done — generate report
    await generateAuditReport(supabase, geminiApiKey, companyId, jobId);
    return new Response(JSON.stringify({ success: true, status: 'completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Classify each conversation with throttling
  let classified = 0;
  for (const conv of conversations) {
    try {
      await classifyConversation(supabase, geminiApiKey, companyId, conv.id);
      classified++;

      // Update progress
      await supabase
        .from('inbox_backfill_jobs')
        .update({
          classified_conversations: cursor + classified,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Throttle
      if (classified < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
      }
    } catch (err) {
      console.error(`Failed to classify ${conv.id}:`, err);
    }
  }

  // Self-chain for next batch
  const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbox-backfill`;
  fetch(selfUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ companyId, jobId, cursor: cursor + classified }),
  }).catch(() => {});

  return new Response(JSON.stringify({
    success: true,
    classified,
    nextCursor: cursor + classified,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateAuditReport(
  supabase: ReturnType<typeof createClient>,
  geminiApiKey: string,
  companyId: string,
  jobId: string
) {
  // Gather stats
  const { count: totalConvos } = await supabase
    .from('inbox_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { data: typeBreakdown } = await supabase
    .from('inbox_conversations')
    .select('message_type, sentiment, editorial_value, detected_language')
    .eq('company_id', companyId)
    .not('message_type', 'is', null);

  const { count: totalContacts } = await supabase
    .from('inbox_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  // Aggregate stats
  const sentimentCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const languages: Record<string, number> = {};
  let highValueCount = 0;

  for (const row of typeBreakdown || []) {
    const r = row as { message_type: string; sentiment: string; editorial_value: number; detected_language: string };
    typeCounts[r.message_type] = (typeCounts[r.message_type] || 0) + 1;
    if (r.sentiment) sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] || 0) + 1;
    if (r.detected_language) languages[r.detected_language] = (languages[r.detected_language] || 0) + 1;
    if (r.editorial_value >= 4) highValueCount++;
  }

  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  // Generate AI report
  let reportData: Record<string, unknown> = {};

  if (geminiApiKey) {
    const prompt = `Generate a social intelligence audit report for a media company based on this data:

Total conversations: ${totalConvos || 0}
Total contacts: ${totalContacts || 0}
Primary language: ${primaryLanguage}
Category breakdown: ${JSON.stringify(typeCounts)}
Sentiment breakdown: ${JSON.stringify(sentimentCounts)}
High editorial value messages (4-5): ${highValueCount}
Languages: ${JSON.stringify(languages)}

Return a JSON object with:
- "summary": string (2-3 sentence executive summary)
- "audience_profile": { total_contacts, primary_language, sentiment_breakdown, top_topics: string[] }
- "editorial_intelligence": { editorial_leads_found, correction_requests, highest_value_count }
- "content_performance": { best_performing_topics: string[], recommendations: string[] }
- "recommendations": string[] (3-5 actionable recommendations)

Return ONLY the JSON object, no markdown.`;

    try {
      const response = await callGemini(geminiApiKey, prompt);
      reportData = JSON.parse(response);
    } catch {
      reportData = {
        summary: `Analyzed ${totalConvos || 0} conversations from ${totalContacts || 0} contacts.`,
        audience_profile: { total_contacts: totalContacts, primary_language: primaryLanguage, sentiment_breakdown: sentimentCounts },
        editorial_intelligence: { editorial_leads_found: highValueCount, correction_requests: 0, highest_value_count: highValueCount },
        recommendations: ['Enable auto-classify for real-time classification', 'Review high editorial value messages for story leads'],
      };
    }
  }

  // Update job with report
  await supabase
    .from('inbox_backfill_jobs')
    .update({
      status: 'completed',
      report_data: reportData,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
