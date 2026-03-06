import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { callGemini, getConversationContext, formatMessagesForPrompt } from '../_shared/inbox-ai-helpers.ts';
import { classifyConversation } from '../_shared/classify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let action = 'unknown';
  let companyId = '';
  let userId = '';

  try {
    const body = await req.json();
    ({ action, companyId } = body);
    const params = { ...body };
    delete params.action;
    delete params.companyId;

    const auth = await authorize(req, { companyId });
    userId = auth.userId;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    switch (action) {
      case 'analyze-sentiment':
        result = await analyzeSentiment(supabase, geminiApiKey, companyId, params.conversationId);
        break;
      case 'suggest-reply':
        result = await suggestReply(supabase, geminiApiKey, companyId, params.conversationId);
        break;
      case 'summarize-thread':
        result = await summarizeThread(supabase, geminiApiKey, companyId, params.conversationId);
        break;
      case 'classify':
        result = await classifyConversation(supabase, geminiApiKey, companyId, params.conversationId);
        // Increment AI call counter
        await supabase.rpc('increment_ai_calls', { _company_id: companyId }).catch(() => {});
        break;
      case 'save-feedback':
        result = await saveFeedback(supabase, companyId, userId, params);
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Log successful AI action
    try {
      await supabase.from('api_call_logs' as any).insert({
        function_name: 'inbox-ai',
        action,
        request_summary: JSON.stringify({ action, companyId, conversationId: params.conversationId }).slice(0, 500),
        response_summary: JSON.stringify(result).slice(0, 500),
        success: true,
        duration_ms: Date.now() - startTime,
        company_id: companyId,
        user_id: userId,
      });
    } catch (logErr) {
      console.error('Failed to log ai call:', logErr);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('inbox-ai error:', error);

    // Log failed AI action
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const logClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await logClient.from('api_call_logs' as any).insert({
        function_name: 'inbox-ai',
        action,
        request_summary: JSON.stringify({ action, companyId }).slice(0, 500),
        response_summary: String(error).slice(0, 500),
        success: false,
        duration_ms: Date.now() - startTime,
        company_id: companyId || null,
        user_id: userId || null,
      });
    } catch (logErr) {
      console.error('Failed to log ai call error:', logErr);
    }

    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Actions ─────────────────────────────────────────────────

async function analyzeSentiment(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  conversationId: string
) {
  const { messages } = await getConversationContext(supabase, companyId, conversationId);

  const contactMessages = messages.filter((m: { sender_type: string }) => m.sender_type === 'contact');
  const text = contactMessages.map((m: { content: string }) => m.content).join('\n');

  const prompt = `Analyze the sentiment of these customer messages from a social media conversation.

Messages:
${text}

Return a JSON object with:
- "sentiment": "positive" | "neutral" | "negative"
- "confidence": number between 0 and 1
- "topics": array of 1-3 main topics discussed (short strings)

Return ONLY the JSON object, no markdown or explanation.`;

  const response = await callGemini(apiKey, prompt);
  let analysis;
  try {
    analysis = JSON.parse(response);
  } catch {
    analysis = { sentiment: 'neutral', confidence: 0.5, topics: [] };
  }

  // Update conversation sentiment
  await supabase
    .from('inbox_conversations')
    .update({ sentiment: analysis.sentiment })
    .eq('id', conversationId)
    .eq('company_id', companyId);

  // Persist to inbox_ai_results
  await supabase.from('inbox_ai_results').insert({
    conversation_id: conversationId,
    company_id: companyId,
    result_type: 'sentiment',
    result_data: analysis,
    model_version: 'gemini-2.5-flash-preview-04-17',
  }).catch(() => {});

  return { analysis };
}

async function suggestReply(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  conversationId: string
) {
  const { conversation, messages } = await getConversationContext(supabase, companyId, conversationId);
  const thread = formatMessagesForPrompt(messages);

  const prompt = `You are a social media customer service agent. Based on this ${conversation.platform} ${conversation.type} conversation, suggest 3 reply options.

Conversation:
${thread}

Platform: ${conversation.platform}
Type: ${conversation.type}

Return a JSON object with:
- "suggestions": array of 3 objects, each with:
  - "tone": "formal" | "casual" | "brief"
  - "content": the suggested reply text (appropriate for ${conversation.platform})
  - "label": a 2-3 word description of the approach

Keep replies platform-appropriate (short for Twitter, professional for LinkedIn, etc).
Return ONLY the JSON object, no markdown or explanation.`;

  const response = await callGemini(apiKey, prompt);
  let data;
  try {
    data = JSON.parse(response);
  } catch {
    data = { suggestions: [] };
  }

  return { suggestions: data.suggestions || [] };
}

async function summarizeThread(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  conversationId: string
) {
  const { conversation, messages } = await getConversationContext(supabase, companyId, conversationId);
  const thread = formatMessagesForPrompt(messages);

  const prompt = `Summarize this social media ${conversation.type} conversation in a concise paragraph (2-4 sentences). Focus on the key topics, customer intent, and current status.

Conversation:
${thread}

Return a JSON object with:
- "summary": string (the summary paragraph)

Return ONLY the JSON object, no markdown or explanation.`;

  const response = await callGemini(apiKey, prompt);
  let data;
  try {
    data = JSON.parse(response);
  } catch {
    data = { summary: 'Unable to generate summary.' };
  }

  // Persist to inbox_ai_results
  await supabase.from('inbox_ai_results').insert({
    conversation_id: conversationId,
    company_id: companyId,
    result_type: 'summary',
    result_data: data,
    model_version: 'gemini-2.5-flash-preview-04-17',
  }).catch(() => {});

  return { summary: data.summary };
}

// ─── Phase 1F: Save Feedback (backend for feedback loop) ─────

async function saveFeedback(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  params: {
    conversationId: string;
    feedbackType: 'classification' | 'editorial_value' | 'sentiment';
    originalValue: Record<string, unknown>;
    correctedValue: Record<string, unknown>;
  }
) {
  // Insert feedback record
  const { data, error } = await supabase
    .from('inbox_ai_feedback')
    .insert({
      conversation_id: params.conversationId,
      company_id: companyId,
      feedback_type: params.feedbackType,
      original_value: params.originalValue,
      corrected_value: params.correctedValue,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Apply the correction directly to the conversation
  if (params.feedbackType === 'classification') {
    const updates: Record<string, unknown> = {};
    if (params.correctedValue.category) updates.message_type = params.correctedValue.category;
    if (params.correctedValue.subcategory) updates.message_subtype = params.correctedValue.subcategory;
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('inbox_conversations')
        .update(updates)
        .eq('id', params.conversationId)
        .eq('company_id', companyId);
    }
  } else if (params.feedbackType === 'editorial_value' && params.correctedValue.editorial_value) {
    await supabase
      .from('inbox_conversations')
      .update({ editorial_value: params.correctedValue.editorial_value })
      .eq('id', params.conversationId)
      .eq('company_id', companyId);
  } else if (params.feedbackType === 'sentiment' && params.correctedValue.sentiment) {
    await supabase
      .from('inbox_conversations')
      .update({ sentiment: params.correctedValue.sentiment })
      .eq('id', params.conversationId)
      .eq('company_id', companyId);
  }

  return { feedback: data };
}
