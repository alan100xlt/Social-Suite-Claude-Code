import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent';

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

// ─── Helpers ─────────────────────────────────────────────────

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function getConversationContext(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string
) {
  const [convResult, msgsResult] = await Promise.all([
    supabase
      .from('inbox_conversations')
      .select('*, contact:inbox_contacts(*)')
      .eq('id', conversationId)
      .eq('company_id', companyId)
      .single(),
    supabase
      .from('inbox_messages')
      .select('*, contact:inbox_contacts(*)')
      .eq('conversation_id', conversationId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  if (convResult.error) throw convResult.error;
  return { conversation: convResult.data, messages: msgsResult.data || [] };
}

function formatMessagesForPrompt(messages: Array<{ sender_type: string; content: string; contact?: { display_name?: string } | null }>) {
  return messages.map(m => {
    const sender = m.sender_type === 'agent' ? 'Agent' :
                   m.sender_type === 'bot' ? 'Bot' :
                   m.contact?.display_name || 'Contact';
    return `${sender}: ${m.content}`;
  }).join('\n');
}

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

  return { summary: data.summary };
}
