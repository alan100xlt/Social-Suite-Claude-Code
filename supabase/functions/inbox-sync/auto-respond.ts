import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
const GETLATE_API_URL = 'https://getlate.dev/api/v1';

interface AutoRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  trigger_value: string | null;
  trigger_platform: string | null;
  trigger_conversation_type: string | null;
  action_type: string;
  canned_reply_id: string | null;
  ai_prompt_template: string | null;
  notify_user_ids: string[] | null;
  notify_via: string[] | null;
  after_hours_config: { timezone?: string; start_hour?: number; end_hour?: number } | null;
}

interface NewMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  content: string;
  sender_type: string;
  contact_id: string | null;
}

interface Conversation {
  id: string;
  platform: string;
  type: string;
  platform_conversation_id: string | null;
  post_id: string | null;
  contact_id: string | null;
  metadata?: Record<string, unknown> | null;
  // AI classification fields
  message_type?: string | null;
  message_subtype?: string | null;
  editorial_value?: number | null;
  sentiment?: string | null;
  detected_language?: string | null;
}

export async function checkAndAutoRespond(
  supabase: ReturnType<typeof createClient>,
  message: NewMessage,
  conversation: Conversation,
  getlateApiKey: string,
  profileId: string | null
): Promise<{ responded: boolean; ruleName?: string }> {
  // Only auto-respond to contact messages
  if (message.sender_type !== 'contact') {
    return { responded: false };
  }

  // Fetch enabled rules for this company
  const { data: rules, error } = await supabase
    .from('inbox_auto_rules')
    .select('*')
    .eq('company_id', message.company_id)
    .eq('enabled', true)
    .order('created_at', { ascending: true });

  if (error || !rules || rules.length === 0) {
    return { responded: false };
  }

  for (const rule of rules as AutoRule[]) {
    // Special handling for repeat_contact trigger — requires DB query
    if (rule.trigger_type === 'repeat_contact' && message.contact_id) {
      const { count } = await supabase
        .from('inbox_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', message.company_id)
        .eq('contact_id', message.contact_id);
      if ((count || 0) < 2) continue;
      // Platform/type filters still apply
      if (rule.trigger_platform && rule.trigger_platform !== conversation.platform) continue;
      if (rule.trigger_conversation_type && rule.trigger_conversation_type !== conversation.type) continue;
    } else if (!matchesRule(rule, message, conversation)) continue;

    try {
      let responseContent: string | null = null;

      // Handle different action types
      if (rule.action_type === 'notify_editor') {
        // Fire-and-forget notification — no reply sent
        await notifyEditor(supabase, message, conversation, rule);
        return { responded: true, ruleName: rule.name };
      }

      if (rule.action_type === 'hide_comment') {
        // Hide comment via GetLate API (comments only)
        if (conversation.type === 'comment') {
          await hideComment(getlateApiKey, profileId, message, conversation);
        }
        return { responded: true, ruleName: rule.name };
      }

      if (rule.action_type === 'canned_reply' && rule.canned_reply_id) {
        const { data: reply } = await supabase
          .from('inbox_canned_replies')
          .select('content')
          .eq('id', rule.canned_reply_id)
          .eq('company_id', message.company_id)
          .single();

        if (reply) {
          responseContent = reply.content;
          if (message.contact_id) {
            const { data: contact } = await supabase
              .from('inbox_contacts')
              .select('display_name')
              .eq('id', message.contact_id)
              .eq('company_id', message.company_id)
              .single();
            if (contact?.display_name) {
              responseContent = responseContent.replace(/\{\{contact_name\}\}/g, contact.display_name);
            }
          }
        }
      } else if (rule.action_type === 'ai_response' && rule.ai_prompt_template) {
        responseContent = await generateAIResponse(rule.ai_prompt_template, message.content, conversation);
      } else if (rule.action_type === 'acknowledge') {
        // Smart acknowledgment — use template, not AI
        responseContent = getAcknowledgmentTemplate(conversation.detected_language || 'en');
      }

      if (!responseContent) continue;

      await sendAutoResponse(supabase, message, conversation, responseContent, getlateApiKey, profileId);

      return { responded: true, ruleName: rule.name };
    } catch (err) {
      console.error(`Auto-respond rule "${rule.name}" failed:`, err);
    }
  }

  return { responded: false };
}

/** @internal Exported for testing */
export function matchesRule(rule: AutoRule, message: NewMessage, conversation: Conversation): boolean {
  // Check platform filter
  if (rule.trigger_platform && rule.trigger_platform !== conversation.platform) {
    return false;
  }

  // Check conversation type filter
  if (rule.trigger_conversation_type && rule.trigger_conversation_type !== conversation.type) {
    return false;
  }

  switch (rule.trigger_type) {
    case 'all_new':
      return true;

    case 'keyword': {
      if (!rule.trigger_value) return false;
      const keywords = rule.trigger_value.split(',').map(k => k.trim().toLowerCase());
      const content = message.content.toLowerCase();
      return keywords.some(k => content.includes(k));
    }

    case 'regex': {
      if (!rule.trigger_value) return false;
      // Guard against catastrophic backtracking: limit pattern length
      if (rule.trigger_value.length > 200) return false;
      try {
        const regex = new RegExp(rule.trigger_value, 'i');
        // Test on truncated content to limit execution time
        return regex.test(message.content.slice(0, 2000));
      } catch {
        return false;
      }
    }

    case 'sentiment':
      // Now functional — match on AI-classified sentiment
      if (!rule.trigger_value || !conversation.sentiment) return false;
      return conversation.sentiment.toLowerCase() === rule.trigger_value.toLowerCase();

    case 'message_type': {
      if (!rule.trigger_value || !conversation.message_type) return false;
      // Support "category" or "category:subcategory" format
      const parts = rule.trigger_value.split(':');
      if (parts.length === 2) {
        return conversation.message_type === parts[0] && conversation.message_subtype === parts[1];
      }
      return conversation.message_type === rule.trigger_value;
    }

    case 'editorial_value': {
      if (!rule.trigger_value || conversation.editorial_value == null) return false;
      // Threshold comparison: ">=4", ">=3", etc.
      const match = rule.trigger_value.match(/^>=?\s*(\d+)$/);
      if (!match) return false;
      const threshold = parseInt(match[1], 10);
      return conversation.editorial_value >= threshold;
    }

    case 'language':
      if (!rule.trigger_value || !conversation.detected_language) return false;
      return conversation.detected_language.toLowerCase() === rule.trigger_value.toLowerCase();

    case 'repeat_contact':
      // Checked externally before calling matchesRule — always true if we get here
      // The sync flow pre-checks contact conversation count
      return false; // Handled in checkAndAutoRespond with DB query

    case 'after_hours': {
      if (!rule.after_hours_config) return false;
      const { timezone = 'UTC', start_hour = 9, end_hour = 18 } = rule.after_hours_config;
      try {
        const now = new Date();
        // Convert to target timezone using Intl
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
        const currentHour = parseInt(formatter.format(now), 10);
        // "After hours" means OUTSIDE business hours
        return currentHour < start_hour || currentHour >= end_hour;
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

async function generateAIResponse(
  promptTemplate: string,
  messageContent: string,
  conversation: Conversation
): Promise<string | null> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) return null;

  const prompt = `${promptTemplate}

Platform: ${conversation.platform}
Message type: ${conversation.type}
Customer message: ${messageContent}

Respond with ONLY the reply text, nothing else. Keep it concise and appropriate for ${conversation.platform}.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function sendAutoResponse(
  supabase: ReturnType<typeof createClient>,
  message: NewMessage,
  conversation: Conversation,
  content: string,
  getlateApiKey: string,
  profileId: string | null
) {
  // Send via GetLate API — requires accountId (cached in conversation metadata during sync)
  const accountId = conversation.metadata?.accountId as string | undefined;
  if (!accountId) {
    console.warn(`Auto-respond skipped: no accountId in metadata for conversation ${conversation.id}`);
    return;
  }

  if (conversation.type === 'dm' && conversation.platform_conversation_id) {
    const dmConvId = conversation.platform_conversation_id.replace(`dm-${conversation.platform}-`, '');
    const resp = await fetch(`${GETLATE_API_URL}/inbox/conversations/${dmConvId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getlateApiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ accountId, message: content }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      console.error(`Auto-respond DM failed (${resp.status}): ${err.slice(0, 200)}`);
    }
  } else if (conversation.type === 'comment') {
    const resp = await fetch(`${GETLATE_API_URL}/inbox/comments/reply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getlateApiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ accountId, postId: conversation.post_id, message: content }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      console.error(`Auto-respond comment failed (${resp.status}): ${err.slice(0, 200)}`);
    }
  }

  // Store the bot message
  await supabase.from('inbox_messages').insert({
    conversation_id: message.conversation_id,
    company_id: message.company_id,
    sender_type: 'bot',
    content,
    content_type: 'text',
    metadata: { auto_response: true },
  });

  // Update conversation
  await supabase
    .from('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 200),
    })
    .eq('id', message.conversation_id)
    .eq('company_id', message.company_id);
}

async function notifyEditor(
  supabase: ReturnType<typeof createClient>,
  message: NewMessage,
  conversation: Conversation,
  rule: AutoRule
) {
  if (!rule.notify_user_ids || rule.notify_user_ids.length === 0) return;

  const preview = message.content.slice(0, 200);
  const notification = {
    title: `Inbox: ${rule.name}`,
    body: `New ${conversation.type} on ${conversation.platform}: "${preview}"`,
    action_url: `/app/inbox?conversation=${conversation.id}`,
  };

  // Insert in-app notifications for each editor
  for (const userId of rule.notify_user_ids) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        company_id: message.company_id,
        type: 'inbox_rule_trigger',
        title: notification.title,
        body: notification.body,
        action_url: notification.action_url,
        read: false,
      });
    } catch {
      // Non-fatal — notification insert is best-effort
    }
  }

  // Email notification via Resend (if configured and notify_via includes 'email')
  if (rule.notify_via?.includes('email')) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      // Fetch user emails — only for users who are members of this company
      const { data: members } = await supabase
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', message.company_id)
        .in('user_id', rule.notify_user_ids);

      const memberIds = (members || []).map(m => m.user_id);
      if (memberIds.length === 0) return;

      const { data: users } = await supabase
        .from('profiles')
        .select('email')
        .in('id', memberIds);

      for (const user of users || []) {
        if (!user.email) continue;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
            body: JSON.stringify({
              from: 'Longtale Inbox <inbox@longtale.ai>',
              to: user.email,
              subject: notification.title,
              text: `${notification.body}\n\nView: https://app.longtale.ai${notification.action_url}`,
            }),
          });
        } catch {
          // Fire-and-forget — email notification is best-effort
        }
      }
    }
  }
}

async function hideComment(
  getlateApiKey: string,
  _profileId: string | null,
  message: NewMessage,
  conversation: Conversation
) {
  const accountId = conversation.metadata?.accountId as string | undefined;
  if (!accountId) {
    console.warn(`Hide comment skipped: no accountId in metadata for conversation ${conversation.id}`);
    return;
  }

  // Hide comment via GetLate API
  const resp = await fetch(`${GETLATE_API_URL}/inbox/comments/hide`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getlateApiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      accountId,
      commentId: message.id,
      message: 'hide',
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    console.error(`Hide comment failed (${resp.status}): ${err.slice(0, 200)}`);
  }
}

function getAcknowledgmentTemplate(language: string): string {
  const templates: Record<string, string> = {
    es: 'Hemos recibido tu mensaje. Te responderemos pronto.',
    en: "We've received your message. We'll get back to you soon.",
    he: '.קיבלנו את ההודעה שלך. נחזור אליך בהקדם',
    fr: 'Nous avons bien reçu votre message. Nous vous répondrons bientôt.',
    pt: 'Recebemos sua mensagem. Responderemos em breve.',
    de: 'Wir haben Ihre Nachricht erhalten. Wir werden uns bald bei Ihnen melden.',
    ar: '.لقد تلقينا رسالتك. سنرد عليك قريبًا',
  };
  // Match by language prefix (e.g., "es-MX" → "es")
  const langPrefix = language.split('-')[0].toLowerCase();
  return templates[langPrefix] || templates['en'];
}
