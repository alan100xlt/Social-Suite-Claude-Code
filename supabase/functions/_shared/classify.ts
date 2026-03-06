/**
 * Shared classification module for inbox conversations.
 * Used by: inbox-sync (auto-classify), inbox-ai (manual re-classify)
 *
 * Per R9: MUST live in _shared/ so both edge functions can import it.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGemini, getConversationContext, formatMessagesForPrompt } from './inbox-ai-helpers.ts';

export interface ClassificationResult {
  category: string;
  subcategory: string;
  editorial_value: number;
  sentiment: string;
  confidence: number;
  language: string;
  topics: string[];
  priority: string;
}

const TAXONOMY = `
Categories and subcategories:
1. editorial: news_tip, story_idea, source_offer, correction_request, editorial_complaint
2. business: advertising_inquiry, pr_pitch, partnership_proposal, event_invitation
3. support: subscription_access_issue, technical_problem, general_question
4. community: positive_engagement, discussion, user_generated_content
5. noise: spam_bot, trolling_harassment, off_topic
6. general: greeting_chat, unclassifiable
`;

const PRIORITY_MAP: Record<string, string> = {
  correction_request: 'critical',
  news_tip: 'high',
  story_idea: 'high',
  source_offer: 'high',
  editorial_complaint: 'high',
  advertising_inquiry: 'high',
  general_question: 'normal',
  subscription_access_issue: 'normal',
  positive_engagement: 'normal',
  discussion: 'normal',
  user_generated_content: 'normal',
  technical_problem: 'normal',
  partnership_proposal: 'normal',
  event_invitation: 'normal',
  pr_pitch: 'low',
  greeting_chat: 'low',
  spam_bot: 'low',
  trolling_harassment: 'low',
  off_topic: 'low',
  unclassifiable: 'low',
};

const PRIORITY_ORDER = ['low', 'normal', 'high', 'critical'];

/** @internal Exported for testing */
export function derivePriority(subcategory: string, editorialValue: number): string {
  const basePriority = PRIORITY_MAP[subcategory] || 'normal';
  if (editorialValue >= 4) {
    const idx = PRIORITY_ORDER.indexOf(basePriority);
    if (idx < PRIORITY_ORDER.length - 1) {
      return PRIORITY_ORDER[idx + 1];
    }
  }
  return basePriority;
}

function buildClassificationPrompt(
  thread: string,
  platform: string,
  type: string,
  articleTitle: string | null,
  articleUrl: string | null,
  companyType: string,
  feedbackExamples: string
): string {
  const articleContext = articleTitle
    ? `\nThis conversation is about the article: "${articleTitle}"${articleUrl ? ` (${articleUrl})` : ''}`
    : '';

  const companyContext = companyType === 'brand'
    ? 'This is a BRAND account. Score "signal" based on viral potential, VIP customers, partnership opportunities.'
    : companyType === 'agency'
      ? 'This is an AGENCY account managing multiple clients.'
      : 'This is a MEDIA/NEWS organization. Score editorial value based on journalistic relevance.';

  return `You are an editorial intelligence classifier for social media messages.
${companyContext}

Classify this ${platform} ${type} conversation:
${articleContext}

${TAXONOMY}

Thread:
${thread}

${feedbackExamples ? `Previous corrections (learn from these):\n${feedbackExamples}\n` : ''}

Return a JSON object with EXACTLY these fields:
{
  "category": one of [editorial, business, support, community, noise, general],
  "subcategory": one of the subcategories listed above for the chosen category,
  "editorial_value": integer 1-5 (1=no editorial value, 5=extremely high value),
  "sentiment": one of [positive, neutral, negative],
  "confidence": number 0-1 (how confident you are in the classification),
  "language": ISO 639-1 language code of the messages (e.g. "es", "en", "he"),
  "topics": array of 1-3 short topic strings
}`;
}

const VALID_CATEGORIES = ['editorial', 'business', 'support', 'community', 'noise', 'general'];
const VALID_SUBCATEGORIES = new Set([
  'news_tip', 'story_idea', 'source_offer', 'correction_request', 'editorial_complaint',
  'advertising_inquiry', 'pr_pitch', 'partnership_proposal', 'event_invitation',
  'subscription_access_issue', 'technical_problem', 'general_question',
  'positive_engagement', 'discussion', 'user_generated_content',
  'spam_bot', 'trolling_harassment', 'off_topic',
  'greeting_chat', 'unclassifiable',
]);

/** @internal Exported for testing */
export function validateClassification(data: Record<string, unknown>): ClassificationResult | null {
  if (!data.category || !VALID_CATEGORIES.includes(data.category as string)) return null;
  if (!data.subcategory || !VALID_SUBCATEGORIES.has(data.subcategory as string)) return null;

  const editorialValue = Math.max(1, Math.min(5, Number(data.editorial_value) || 1));
  const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.5));

  const subcategory = data.subcategory as string;
  const priority = derivePriority(subcategory, editorialValue);

  return {
    category: data.category as string,
    subcategory,
    editorial_value: editorialValue,
    sentiment: ['positive', 'neutral', 'negative'].includes(data.sentiment as string)
      ? (data.sentiment as string)
      : 'neutral',
    confidence,
    language: (data.language as string) || 'en',
    topics: Array.isArray(data.topics) ? data.topics.slice(0, 3).map(String) : [],
    priority,
  };
}

/**
 * Classify a conversation using Gemini AI.
 * Returns the classification result and persists it to the database.
 */
export async function classifyConversation(
  supabase: ReturnType<typeof createClient>,
  geminiApiKey: string,
  companyId: string,
  conversationId: string
): Promise<ClassificationResult> {
  // Load conversation context
  const { conversation, messages } = await getConversationContext(supabase, companyId, conversationId);
  const thread = formatMessagesForPrompt(messages);

  // Load company AI settings for company_type
  const { data: settings } = await supabase
    .from('inbox_ai_settings')
    .select('company_type')
    .eq('company_id', companyId)
    .maybeSingle();

  const companyType = settings?.company_type || 'media';

  // Load recent feedback for few-shot examples (R2)
  const { data: feedbackRows } = await supabase
    .from('inbox_ai_feedback')
    .select('original_value, corrected_value, feedback_type')
    .eq('company_id', companyId)
    .eq('feedback_type', 'classification')
    .order('created_at', { ascending: false })
    .limit(20);

  let feedbackExamples = '';
  if (feedbackRows && feedbackRows.length > 0) {
    feedbackExamples = feedbackRows
      .map((f: { original_value: unknown; corrected_value: unknown }) =>
        `Original: ${JSON.stringify(f.original_value)} → Corrected: ${JSON.stringify(f.corrected_value)}`
      )
      .join('\n');
  }

  const prompt = buildClassificationPrompt(
    thread,
    conversation.platform,
    conversation.type,
    conversation.article_title || null,
    conversation.article_url || null,
    companyType,
    feedbackExamples
  );

  // Call Gemini with retry on validation failure (R12)
  let result: ClassificationResult | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await callGemini(geminiApiKey, prompt, {
        temperature: attempt === 0 ? 0.3 : 0.1,
        maxOutputTokens: 2048,
      });
      const parsed = JSON.parse(response);
      result = validateClassification(parsed);
      if (result) break;
    } catch {
      // Retry with lower temperature
    }
  }

  // Fallback if both attempts fail (R1)
  if (!result) {
    result = {
      category: 'general',
      subcategory: 'unclassifiable',
      editorial_value: 1,
      sentiment: 'neutral',
      confidence: 0,
      language: 'en',
      topics: [],
      priority: 'low',
    };
  }

  // Write to inbox_conversations
  await supabase
    .from('inbox_conversations')
    .update({
      message_type: result.category,
      message_subtype: result.subcategory,
      editorial_value: result.editorial_value,
      sentiment: result.sentiment,
      detected_language: result.language,
      ai_classified_at: new Date().toISOString(),
      ...(result.subcategory === 'correction_request' ? { correction_status: 'received' } : {}),
    })
    .eq('id', conversationId)
    .eq('company_id', companyId);

  // Persist full result to inbox_ai_results
  await supabase
    .from('inbox_ai_results')
    .insert({
      conversation_id: conversationId,
      company_id: companyId,
      result_type: 'classification',
      result_data: result as unknown as Record<string, unknown>,
      model_version: 'gemini-2.5-flash',
    });

  return result;
}

/**
 * Fallback classification for when Gemini is unreachable.
 * Sets general/unclassifiable so auto-respond rules still fire.
 */
export async function setFallbackClassification(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string
): Promise<void> {
  await supabase
    .from('inbox_conversations')
    .update({
      message_type: 'general',
      message_subtype: 'unclassifiable',
      editorial_value: 1,
      ai_classified_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('company_id', companyId);
}
