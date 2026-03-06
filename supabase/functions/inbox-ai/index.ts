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

    // Increment AI call counter — best-effort, non-atomic read-then-write
    // Race condition under concurrency is acceptable for a monitoring counter
    const incrementAICalls = async () => {
      try {
        const { data: s } = await supabase
          .from('inbox_ai_settings')
          .select('ai_calls_count')
          .eq('company_id', companyId)
          .maybeSingle();
        if (s) {
          await supabase
            .from('inbox_ai_settings')
            .update({ ai_calls_count: (s.ai_calls_count || 0) + 1 })
            .eq('company_id', companyId);
        }
      } catch {
        // Non-fatal — counter increment is best-effort
      }
    };

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
        await incrementAICalls();
        break;
      case 'suggest-reply-v2':
        result = await suggestReplyV2(supabase, geminiApiKey, companyId, params.conversationId);
        await incrementAICalls();
        break;
      case 'translate':
        result = await translateMessage(supabase, geminiApiKey, companyId, params);
        await incrementAICalls();
        break;
      case 'crisis-check':
        result = await crisisCheck(supabase, geminiApiKey, companyId);
        break;
      case 'content-recycle-check':
        result = await contentRecycleCheck(supabase, geminiApiKey, companyId, params.conversationId);
        await incrementAICalls();
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
    model_version: 'gemini-3.1-flash-lite-preview',
  });

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
    model_version: 'gemini-3.1-flash-lite-preview',
  });

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

// ─── Phase 3: Suggest Reply V2 (type-aware, article-aware) ─────

async function suggestReplyV2(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  conversationId: string
) {
  const { conversation, messages } = await getConversationContext(supabase, companyId, conversationId);
  const thread = formatMessagesForPrompt(messages);

  // Fetch canned replies for fusion
  const { data: cannedReplies } = await supabase
    .from('inbox_canned_replies')
    .select('id, title, content')
    .eq('company_id', companyId)
    .limit(20);

  const cannedContext = (cannedReplies || []).length > 0
    ? `\nAvailable canned replies (you may adapt/fuse these into suggestions):\n${(cannedReplies || []).map((r: { title: string; content: string }) => `- "${r.title}": ${r.content}`).join('\n')}`
    : '';

  // Article context for comment threads
  const articleContext = conversation.article_title
    ? `\nThis comment thread is on the article: "${conversation.article_title}"${conversation.article_url ? ` (${conversation.article_url})` : ''}`
    : '';

  // Classification context
  const classContext = conversation.message_type
    ? `\nMessage classified as: ${conversation.message_type}${conversation.message_subtype ? `/${conversation.message_subtype}` : ''} (editorial value: ${conversation.editorial_value || 'N/A'})`
    : '';

  const detectedLang = conversation.detected_language || 'en';

  const prompt = `You are a social media editorial assistant for a media company. Generate reply suggestions for this ${conversation.platform} ${conversation.type} conversation.
${classContext}${articleContext}

Conversation:
${thread}
${cannedContext}

IMPORTANT RULES:
1. Reply in ${detectedLang} (match the sender's language)
2. If this is about an article, naturally reference it
3. For editorial/business messages (high editorial value), be professional and thorough
4. For community messages, be warm and engaging
5. For support messages, be helpful and solution-oriented
6. For noise/trolling, suggest a brief, dignified response or recommend ignoring

Return a JSON object with:
- "recommended": { "content": string, "label": string (2-3 words), "reasoning": string (1 sentence why this is best) }
- "alternatives": [{ "content": string, "label": string }] (exactly 2 alternatives)
- "language": "${detectedLang}"
- "fused_from_canned": boolean (true if any suggestion adapted a canned reply)

Return ONLY the JSON object, no markdown or explanation.`;

  const response = await callGemini(apiKey, prompt);
  let data;
  try {
    data = JSON.parse(response);
  } catch {
    data = {
      recommended: { content: '', label: 'Unable to generate', reasoning: 'AI response parsing failed' },
      alternatives: [],
      language: detectedLang,
      fused_from_canned: false,
    };
  }

  // Persist to inbox_ai_results
  await supabase.from('inbox_ai_results').insert({
    conversation_id: conversationId,
    company_id: companyId,
    result_type: 'suggestions',
    result_data: data,
    model_version: 'gemini-3.1-flash-lite-preview',
  });

  return data;
}

// ─── Phase 5: Translation ─────

async function translateMessage(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  params: {
    conversationId?: string;
    messageId?: string;
    content?: string;
    targetLanguage: string;
  }
) {
  let textToTranslate = params.content || '';

  // If messageId provided, fetch the message content
  if (params.messageId && !textToTranslate) {
    const { data: msg } = await supabase
      .from('inbox_messages')
      .select('content')
      .eq('id', params.messageId)
      .eq('company_id', companyId)
      .single();
    if (msg) textToTranslate = msg.content;
  }

  if (!textToTranslate) {
    return { translated: '', targetLanguage: params.targetLanguage };
  }

  const prompt = `Translate the following text to ${params.targetLanguage}. Return ONLY the translated text, nothing else. Preserve the original tone and style.

Text: ${textToTranslate}`;

  const translated = await callGemini(apiKey, prompt);

  // Persist to inbox_ai_results if conversation context exists
  if (params.conversationId) {
    await supabase.from('inbox_ai_results').insert({
      conversation_id: params.conversationId,
      company_id: companyId,
      result_type: 'translation',
      result_data: {
        original: textToTranslate,
        translated,
        targetLanguage: params.targetLanguage,
        messageId: params.messageId || null,
      },
      model_version: 'gemini-3.1-flash-lite-preview',
    });
  }

  return { translated, targetLanguage: params.targetLanguage };
}

// ─── Phase 6: Crisis Detection ─────

async function crisisCheck(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string
) {
  // Load company's crisis settings
  const { data: settings } = await supabase
    .from('inbox_ai_settings')
    .select('crisis_detection, crisis_threshold, crisis_window_minutes')
    .eq('company_id', companyId)
    .single();

  if (!settings?.crisis_detection) {
    return { crisis: false, reason: 'Crisis detection not enabled' };
  }

  const threshold = settings.crisis_threshold || 5;
  const windowMinutes = settings.crisis_window_minutes || 30;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Count negative-sentiment conversations in the window
  const { data: negativeConvos, count } = await supabase
    .from('inbox_conversations')
    .select('id, last_message_preview, message_type, message_subtype', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('sentiment', 'negative')
    .gte('last_message_at', since)
    .limit(10);

  if (!count || count < threshold) {
    return { crisis: false, negativeCount: count || 0, threshold };
  }

  // Check for existing active crisis to avoid duplicates
  const { data: existingCrisis } = await supabase
    .from('inbox_crisis_events')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .gte('created_at', since)
    .limit(1);

  if (existingCrisis && existingCrisis.length > 0) {
    return { crisis: true, existing: true, eventId: existingCrisis[0].id };
  }

  // Cluster topics via Gemini
  const previews = (negativeConvos || []).map((c: { last_message_preview: string }) => c.last_message_preview).join('\n');
  const topicPrompt = `These are negative sentiment messages received by a media company in the last ${windowMinutes} minutes. Identify 1-3 common topics or themes. Return a JSON array of short topic strings.

Messages:
${previews}

Return ONLY a JSON array like ["topic1", "topic2"], nothing else.`;

  let topics: string[] = [];
  try {
    const topicResponse = await callGemini(apiKey, topicPrompt);
    topics = JSON.parse(topicResponse);
  } catch {
    topics = ['unclassified'];
  }

  // Generate summary
  const summaryPrompt = `Summarize this potential crisis for editors in 1-2 sentences. ${count} negative messages in ${windowMinutes} minutes about: ${topics.join(', ')}. Be factual, not alarmist.`;
  let summary = '';
  try {
    summary = await callGemini(apiKey, summaryPrompt);
  } catch {
    summary = `${count} negative sentiment messages detected in the last ${windowMinutes} minutes.`;
  }

  const severity = count >= threshold * 2 ? 'critical' : 'warning';
  const sampleIds = (negativeConvos || []).slice(0, 5).map((c: { id: string }) => c.id);

  // Insert crisis event
  const { data: event } = await supabase
    .from('inbox_crisis_events')
    .insert({
      company_id: companyId,
      status: 'active',
      severity,
      negative_count: count,
      threshold,
      window_minutes: windowMinutes,
      topics,
      sample_conversation_ids: sampleIds,
      summary,
    })
    .select()
    .single();

  return { crisis: true, event, topics, summary };
}

// ─── Phase 7: Content Recycling ─────

async function contentRecycleCheck(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  companyId: string,
  conversationId?: string
) {
  // Find high-engagement articles from inbox data
  const query = supabase
    .from('inbox_conversations')
    .select('id, article_title, article_url, editorial_value, sentiment, message_type, message_subtype, last_message_preview')
    .eq('company_id', companyId)
    .not('article_title', 'is', null)
    .gte('editorial_value', 3)
    .order('editorial_value', { ascending: false })
    .limit(10);

  if (conversationId) {
    query.eq('id', conversationId);
  }

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) {
    return { suggestions: [], reason: 'No high-value articles found' };
  }

  const articleList = candidates.map((c: { article_title: string; editorial_value: number; sentiment: string; message_type: string }) =>
    `- "${c.article_title}" (signal: ${c.editorial_value}/5, sentiment: ${c.sentiment}, type: ${c.message_type})`
  ).join('\n');

  const prompt = `You are a social media strategist for a media company. These articles received high engagement from the audience via inbox messages. Suggest which ones to reshare/recycle and why.

Articles with high audience engagement:
${articleList}

Return a JSON object with:
- "suggestions": array of objects, each with:
  - "article_title": string
  - "reason": string (1 sentence why reshare)
  - "suggested_angle": string (new angle for the reshare post)
  - "best_platform": string (which platform to reshare on)

Return ONLY the JSON object, no markdown.`;

  const response = await callGemini(apiKey, prompt);
  let data;
  try {
    data = JSON.parse(response);
  } catch {
    data = { suggestions: [] };
  }

  return data;
}
