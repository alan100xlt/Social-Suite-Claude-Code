import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { validateClassification, derivePriority } from './classify.ts';

// ─── derivePriority ─────────────────────────────────────────

Deno.test('derivePriority: returns base priority for known subcategory', () => {
  assertEquals(derivePriority('correction_request', 1), 'critical');
  assertEquals(derivePriority('news_tip', 1), 'high');
  assertEquals(derivePriority('general_question', 1), 'normal');
  assertEquals(derivePriority('spam_bot', 1), 'low');
});

Deno.test('derivePriority: returns normal for unknown subcategory', () => {
  assertEquals(derivePriority('nonexistent_subcategory', 1), 'normal');
});

Deno.test('derivePriority: bumps priority when editorial_value >= 4', () => {
  // normal → high
  assertEquals(derivePriority('general_question', 4), 'high');
  // low → normal
  assertEquals(derivePriority('spam_bot', 4), 'normal');
  // high → critical
  assertEquals(derivePriority('news_tip', 5), 'critical');
});

Deno.test('derivePriority: critical stays critical (ceiling)', () => {
  assertEquals(derivePriority('correction_request', 5), 'critical');
});

Deno.test('derivePriority: no bump when editorial_value < 4', () => {
  assertEquals(derivePriority('general_question', 3), 'normal');
  assertEquals(derivePriority('spam_bot', 3), 'low');
});

// ─── validateClassification ─────────────────────────────────

Deno.test('validateClassification: valid classification with all fields', () => {
  const result = validateClassification({
    category: 'editorial',
    subcategory: 'news_tip',
    editorial_value: 4,
    sentiment: 'positive',
    confidence: 0.9,
    language: 'es',
    topics: ['politics', 'economy'],
  });

  assertNotEquals(result, null);
  assertEquals(result!.category, 'editorial');
  assertEquals(result!.subcategory, 'news_tip');
  assertEquals(result!.editorial_value, 4);
  assertEquals(result!.sentiment, 'positive');
  assertEquals(result!.confidence, 0.9);
  assertEquals(result!.language, 'es');
  assertEquals(result!.topics, ['politics', 'economy']);
  assertEquals(result!.priority, 'critical'); // news_tip=high + editorial_value>=4 → critical
});

Deno.test('validateClassification: returns null for missing category', () => {
  const result = validateClassification({
    subcategory: 'news_tip',
    editorial_value: 3,
    sentiment: 'neutral',
    confidence: 0.8,
    language: 'en',
    topics: [],
  });
  assertEquals(result, null);
});

Deno.test('validateClassification: returns null for invalid category', () => {
  const result = validateClassification({
    category: 'invalid_category',
    subcategory: 'news_tip',
    editorial_value: 3,
    sentiment: 'neutral',
    confidence: 0.8,
    language: 'en',
    topics: [],
  });
  assertEquals(result, null);
});

Deno.test('validateClassification: returns null for missing subcategory', () => {
  const result = validateClassification({
    category: 'editorial',
    editorial_value: 3,
    sentiment: 'neutral',
    confidence: 0.8,
    language: 'en',
    topics: [],
  });
  assertEquals(result, null);
});

Deno.test('validateClassification: returns null for invalid subcategory', () => {
  const result = validateClassification({
    category: 'editorial',
    subcategory: 'made_up_subcategory',
    editorial_value: 3,
    sentiment: 'neutral',
    confidence: 0.8,
    language: 'en',
    topics: [],
  });
  assertEquals(result, null);
});

Deno.test('validateClassification: clamps editorial_value to 1-5 range', () => {
  const low = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: -10,
    sentiment: 'neutral',
    confidence: 0.5,
    language: 'en',
    topics: [],
  });
  assertEquals(low!.editorial_value, 1);

  const high = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 99,
    sentiment: 'neutral',
    confidence: 0.5,
    language: 'en',
    topics: [],
  });
  assertEquals(high!.editorial_value, 5);
});

Deno.test('validateClassification: clamps confidence to 0-1 range', () => {
  const low = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'neutral',
    confidence: -0.5,
    language: 'en',
    topics: [],
  });
  assertEquals(low!.confidence, 0);

  const high = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'neutral',
    confidence: 5.0,
    language: 'en',
    topics: [],
  });
  assertEquals(high!.confidence, 1);
});

Deno.test('validateClassification: fallback sentiment for invalid value', () => {
  const result = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'ANGRY',
    confidence: 0.5,
    language: 'en',
    topics: [],
  });
  assertEquals(result!.sentiment, 'neutral');
});

Deno.test('validateClassification: truncates topics to 3 items', () => {
  const result = validateClassification({
    category: 'editorial',
    subcategory: 'news_tip',
    editorial_value: 3,
    sentiment: 'neutral',
    confidence: 0.8,
    language: 'en',
    topics: ['a', 'b', 'c', 'd', 'e'],
  });
  assertEquals(result!.topics.length, 3);
  assertEquals(result!.topics, ['a', 'b', 'c']);
});

Deno.test('validateClassification: handles non-array topics', () => {
  const result = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'neutral',
    confidence: 0.5,
    language: 'en',
    topics: 'not an array',
  });
  assertEquals(result!.topics, []);
});

Deno.test('validateClassification: defaults language to en when missing', () => {
  const result = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'neutral',
    confidence: 0.5,
    topics: [],
  });
  assertEquals(result!.language, 'en');
});

Deno.test('validateClassification: defaults editorial_value to 1 when NaN', () => {
  const result = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 'not a number',
    sentiment: 'neutral',
    confidence: 0.5,
    language: 'en',
    topics: [],
  });
  assertEquals(result!.editorial_value, 1);
});

Deno.test('validateClassification: defaults confidence to 0.5 when NaN', () => {
  const result = validateClassification({
    category: 'general',
    subcategory: 'unclassifiable',
    editorial_value: 1,
    sentiment: 'neutral',
    confidence: 'high',
    language: 'en',
    topics: [],
  });
  assertEquals(result!.confidence, 0.5);
});
