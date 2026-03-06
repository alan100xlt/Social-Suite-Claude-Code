import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { matchesRule } from '../inbox-sync/auto-respond.ts';

// ─── Helpers ─────────────────────────────────────────────────

function makeRule(overrides: Partial<Parameters<typeof matchesRule>[0]> = {}) {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    enabled: true,
    trigger_type: 'all_new',
    trigger_value: null,
    trigger_platform: null,
    trigger_conversation_type: null,
    action_type: 'canned_reply',
    canned_reply_id: null,
    ai_prompt_template: null,
    notify_user_ids: null,
    notify_via: null,
    after_hours_config: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<{ id: string; conversation_id: string; company_id: string; content: string; sender_type: string; contact_id: string | null }> = {}) {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    company_id: 'company-1',
    content: 'Hello, I have a question about your article.',
    sender_type: 'contact',
    contact_id: 'contact-1',
    ...overrides,
  };
}

function makeConversation(overrides: Partial<{
  id: string; platform: string; type: string; platform_conversation_id: string | null;
  post_id: string | null; contact_id: string | null; message_type: string | null;
  message_subtype: string | null; editorial_value: number | null; sentiment: string | null;
  detected_language: string | null;
}> = {}) {
  return {
    id: 'conv-1',
    platform: 'facebook',
    type: 'comment',
    platform_conversation_id: 'fb-post-123',
    post_id: 'post-1',
    contact_id: 'contact-1',
    message_type: null,
    message_subtype: null,
    editorial_value: null,
    sentiment: null,
    detected_language: null,
    ...overrides,
  };
}

// ─── all_new trigger ─────────────────────────────────────────

Deno.test('matchesRule: all_new always matches', () => {
  const rule = makeRule({ trigger_type: 'all_new' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

// ─── keyword trigger ─────────────────────────────────────────

Deno.test('matchesRule: keyword matches single keyword', () => {
  const rule = makeRule({ trigger_type: 'keyword', trigger_value: 'question' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

Deno.test('matchesRule: keyword does not match absent keyword', () => {
  const rule = makeRule({ trigger_type: 'keyword', trigger_value: 'refund' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

Deno.test('matchesRule: keyword matches comma-separated keywords', () => {
  const rule = makeRule({ trigger_type: 'keyword', trigger_value: 'refund, question, complaint' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

Deno.test('matchesRule: keyword is case-insensitive', () => {
  const rule = makeRule({ trigger_type: 'keyword', trigger_value: 'HELLO' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

Deno.test('matchesRule: keyword returns false when trigger_value is null', () => {
  const rule = makeRule({ trigger_type: 'keyword', trigger_value: null });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

// ─── regex trigger ───────────────────────────────────────────

Deno.test('matchesRule: regex matches valid pattern', () => {
  const rule = makeRule({ trigger_type: 'regex', trigger_value: 'ques(tion|t)' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

Deno.test('matchesRule: regex rejects invalid pattern gracefully', () => {
  const rule = makeRule({ trigger_type: 'regex', trigger_value: '[invalid(' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

Deno.test('matchesRule: regex rejects pattern > 200 chars', () => {
  const rule = makeRule({ trigger_type: 'regex', trigger_value: 'a'.repeat(201) });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

Deno.test('matchesRule: regex allows pattern exactly 200 chars', () => {
  // 'Hello' (5 chars) + padding to 200
  const pattern = 'Hello' + 'x'.repeat(195);
  assertEquals(pattern.length, 200);
  const rule = makeRule({ trigger_type: 'regex', trigger_value: pattern });
  const msg = makeMessage({ content: pattern }); // content matches the literal pattern
  assertEquals(matchesRule(rule, msg, makeConversation()), true);
});

Deno.test('matchesRule: regex returns false when trigger_value is null', () => {
  const rule = makeRule({ trigger_type: 'regex', trigger_value: null });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

// ─── sentiment trigger ───────────────────────────────────────

Deno.test('matchesRule: sentiment matches when conversation sentiment matches', () => {
  const rule = makeRule({ trigger_type: 'sentiment', trigger_value: 'negative' });
  const conv = makeConversation({ sentiment: 'negative' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: sentiment is case-insensitive', () => {
  const rule = makeRule({ trigger_type: 'sentiment', trigger_value: 'Negative' });
  const conv = makeConversation({ sentiment: 'negative' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: sentiment does not match different sentiment', () => {
  const rule = makeRule({ trigger_type: 'sentiment', trigger_value: 'negative' });
  const conv = makeConversation({ sentiment: 'positive' });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: sentiment returns false when conversation has no sentiment', () => {
  const rule = makeRule({ trigger_type: 'sentiment', trigger_value: 'negative' });
  const conv = makeConversation({ sentiment: null });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

// ─── message_type trigger ────────────────────────────────────

Deno.test('matchesRule: message_type matches category only', () => {
  const rule = makeRule({ trigger_type: 'message_type', trigger_value: 'editorial' });
  const conv = makeConversation({ message_type: 'editorial', message_subtype: 'news_tip' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: message_type matches category:subcategory', () => {
  const rule = makeRule({ trigger_type: 'message_type', trigger_value: 'editorial:news_tip' });
  const conv = makeConversation({ message_type: 'editorial', message_subtype: 'news_tip' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: message_type category:subcategory fails on wrong subcategory', () => {
  const rule = makeRule({ trigger_type: 'message_type', trigger_value: 'editorial:story_idea' });
  const conv = makeConversation({ message_type: 'editorial', message_subtype: 'news_tip' });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: message_type returns false when conversation has no message_type', () => {
  const rule = makeRule({ trigger_type: 'message_type', trigger_value: 'editorial' });
  const conv = makeConversation({ message_type: null });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

// ─── editorial_value trigger ─────────────────────────────────

Deno.test('matchesRule: editorial_value matches threshold >=4', () => {
  const rule = makeRule({ trigger_type: 'editorial_value', trigger_value: '>=4' });
  const conv = makeConversation({ editorial_value: 4 });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: editorial_value fails below threshold', () => {
  const rule = makeRule({ trigger_type: 'editorial_value', trigger_value: '>=4' });
  const conv = makeConversation({ editorial_value: 3 });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: editorial_value handles >= with space', () => {
  const rule = makeRule({ trigger_type: 'editorial_value', trigger_value: '>= 3' });
  const conv = makeConversation({ editorial_value: 3 });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: editorial_value returns false for invalid format', () => {
  const rule = makeRule({ trigger_type: 'editorial_value', trigger_value: 'high' });
  const conv = makeConversation({ editorial_value: 5 });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: editorial_value returns false when conversation has null', () => {
  const rule = makeRule({ trigger_type: 'editorial_value', trigger_value: '>=3' });
  const conv = makeConversation({ editorial_value: null });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

// ─── language trigger ────────────────────────────────────────

Deno.test('matchesRule: language matches detected_language', () => {
  const rule = makeRule({ trigger_type: 'language', trigger_value: 'es' });
  const conv = makeConversation({ detected_language: 'es' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: language is case-insensitive', () => {
  const rule = makeRule({ trigger_type: 'language', trigger_value: 'ES' });
  const conv = makeConversation({ detected_language: 'es' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: language returns false when no detected_language', () => {
  const rule = makeRule({ trigger_type: 'language', trigger_value: 'es' });
  const conv = makeConversation({ detected_language: null });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

// ─── after_hours trigger ─────────────────────────────────────

Deno.test('matchesRule: after_hours returns false without config', () => {
  const rule = makeRule({ trigger_type: 'after_hours', after_hours_config: null });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

Deno.test('matchesRule: after_hours detects outside business hours (UTC)', () => {
  // We can't control Date.now() in Deno tests easily, so we test with a timezone
  // where the current time is likely outside 9-18 (use a far-offset timezone)
  const rule = makeRule({
    trigger_type: 'after_hours',
    after_hours_config: { timezone: 'Pacific/Kiritimati', start_hour: 0, end_hour: 0 },
    // start=0, end=0 means ALL hours are "after hours"
  });
  // With start=0, end=0: currentHour < 0 (never) || currentHour >= 0 (always) → true
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), true);
});

Deno.test('matchesRule: after_hours returns false during business hours', () => {
  const rule = makeRule({
    trigger_type: 'after_hours',
    after_hours_config: { timezone: 'UTC', start_hour: 0, end_hour: 24 },
    // start=0, end=24 means ALL hours are "during business hours"
  });
  // currentHour < 0 (never) || currentHour >= 24 (never) → false
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

Deno.test('matchesRule: after_hours handles invalid timezone gracefully', () => {
  const rule = makeRule({
    trigger_type: 'after_hours',
    after_hours_config: { timezone: 'Invalid/Timezone', start_hour: 9, end_hour: 18 },
  });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

// ─── Platform filter ─────────────────────────────────────────

Deno.test('matchesRule: respects trigger_platform filter', () => {
  const rule = makeRule({ trigger_type: 'all_new', trigger_platform: 'instagram' });
  const conv = makeConversation({ platform: 'facebook' });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: passes when trigger_platform matches', () => {
  const rule = makeRule({ trigger_type: 'all_new', trigger_platform: 'facebook' });
  const conv = makeConversation({ platform: 'facebook' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

Deno.test('matchesRule: null trigger_platform matches any platform', () => {
  const rule = makeRule({ trigger_type: 'all_new', trigger_platform: null });
  const conv = makeConversation({ platform: 'twitter' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

// ─── Conversation type filter ────────────────────────────────

Deno.test('matchesRule: respects trigger_conversation_type filter', () => {
  const rule = makeRule({ trigger_type: 'all_new', trigger_conversation_type: 'dm' });
  const conv = makeConversation({ type: 'comment' });
  assertEquals(matchesRule(rule, makeMessage(), conv), false);
});

Deno.test('matchesRule: passes when trigger_conversation_type matches', () => {
  const rule = makeRule({ trigger_type: 'all_new', trigger_conversation_type: 'comment' });
  const conv = makeConversation({ type: 'comment' });
  assertEquals(matchesRule(rule, makeMessage(), conv), true);
});

// ─── repeat_contact trigger ──────────────────────────────────

Deno.test('matchesRule: repeat_contact always returns false (handled externally)', () => {
  const rule = makeRule({ trigger_type: 'repeat_contact' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});

// ─── Unknown trigger ─────────────────────────────────────────

Deno.test('matchesRule: unknown trigger_type returns false', () => {
  const rule = makeRule({ trigger_type: 'unknown_trigger' });
  assertEquals(matchesRule(rule, makeMessage(), makeConversation()), false);
});
