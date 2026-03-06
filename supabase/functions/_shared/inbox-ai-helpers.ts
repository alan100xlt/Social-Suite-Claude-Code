/**
 * Shared AI helpers for inbox edge functions.
 * Used by: inbox-ai, inbox-sync, classify.ts
 *
 * Extracted from inbox-ai/index.ts per R9 — must live in _shared/
 * so both inbox-sync and inbox-ai can import it.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent';

/**
 * Call the Gemini API with a prompt, returning the text response.
 * Uses JSON response mode by default.
 */
export async function callGemini(
  apiKey: string,
  prompt: string,
  options?: { temperature?: number; maxOutputTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const { temperature = 0.7, maxOutputTokens = 2048, jsonMode = true } = options || {};

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(jsonMode && { responseMimeType: 'application/json' }),
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

/**
 * Load conversation + last N messages for AI context.
 */
export async function getConversationContext(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
  messageLimit = 50
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
      .limit(messageLimit),
  ]);

  if (convResult.error) throw convResult.error;
  return { conversation: convResult.data, messages: msgsResult.data || [] };
}

/**
 * Format messages into a human-readable thread for LLM prompts.
 */
export function formatMessagesForPrompt(
  messages: Array<{
    sender_type: string;
    content: string;
    contact?: { display_name?: string } | null;
  }>
): string {
  return messages
    .map((m) => {
      const sender =
        m.sender_type === 'agent'
          ? 'Agent'
          : m.sender_type === 'bot'
            ? 'Bot'
            : m.contact?.display_name || 'Contact';
      return `${sender}: ${m.content}`;
    })
    .join('\n');
}
