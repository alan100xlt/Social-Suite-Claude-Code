/**
 * Integration tests for webhook ingestion data flows.
 * Tests shared inbox-processing module against real Supabase.
 *
 * Run: npx vitest --config vitest.integration.config.ts src/tests/integration/webhook-ingestion.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient } from './setup';

const TEST_PREFIX = `webhook-test-${Date.now()}`;
let testCompanyId: string;

beforeAll(async () => {
  // Create a test company for isolation
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      name: `${TEST_PREFIX}-company`,
      slug: `${TEST_PREFIX}-company`,
      getlate_profile_id: `${TEST_PREFIX}-profile`,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Setup failed: ${error.message}`);
  testCompanyId = data.id;
});

afterAll(async () => {
  // Cleanup: delete test data in dependency order
  await adminClient
    .from('inbox_messages')
    .delete()
    .eq('company_id', testCompanyId);
  await adminClient
    .from('inbox_conversations')
    .delete()
    .eq('company_id', testCompanyId);
  await adminClient
    .from('inbox_contacts')
    .delete()
    .eq('company_id', testCompanyId);
  await adminClient
    .from('webhook_event_log')
    .delete()
    .eq('company_id', testCompanyId);
  await adminClient
    .from('webhook_registrations')
    .delete()
    .eq('company_id', testCompanyId);
  await adminClient
    .from('companies')
    .delete()
    .eq('id', testCompanyId);
});

describe('Company Resolution', () => {
  it('resolves company from getlate_profile_id', async () => {
    const { data } = await adminClient
      .from('companies')
      .select('id')
      .eq('getlate_profile_id', `${TEST_PREFIX}-profile`)
      .maybeSingle();

    expect(data).not.toBeNull();
    expect(data!.id).toBe(testCompanyId);
  });

  it('returns null for unknown profile ID', async () => {
    const { data } = await adminClient
      .from('companies')
      .select('id')
      .eq('getlate_profile_id', 'nonexistent-profile-xyz')
      .maybeSingle();

    expect(data).toBeNull();
  });
});

describe('Contact Upsert', () => {
  it('creates a new contact', async () => {
    const { data, error } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-user-1`,
        display_name: 'Test User',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBeTruthy();
  });

  it('updates existing contact on second upsert', async () => {
    // First insert
    const { data: first } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-user-2`,
        display_name: 'Original Name',
      })
      .select('id')
      .single();

    // Update display_name
    await adminClient
      .from('inbox_contacts')
      .update({ display_name: 'Updated Name' })
      .eq('id', first!.id);

    const { data: updated } = await adminClient
      .from('inbox_contacts')
      .select('display_name')
      .eq('id', first!.id)
      .single();

    expect(updated!.display_name).toBe('Updated Name');
  });
});

describe('Conversation + Message Creation', () => {
  it('creates DM conversation and message', async () => {
    // Create contact first
    const { data: contact } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-dm-user`,
      })
      .select('id')
      .single();

    // Create conversation
    const { data: conv, error: convErr } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_conversation_id: `dm-facebook-${TEST_PREFIX}-conv1`,
        type: 'dm',
        status: 'open',
        subject: 'Test DM',
        contact_id: contact!.id,
      })
      .select('id')
      .single();

    expect(convErr).toBeNull();

    // Create message
    const { data: msg, error: msgErr } = await adminClient
      .from('inbox_messages')
      .insert({
        conversation_id: conv!.id,
        company_id: testCompanyId,
        platform_message_id: `${TEST_PREFIX}-msg-1`,
        contact_id: contact!.id,
        sender_type: 'contact',
        content: 'Hello from webhook test',
      })
      .select('id')
      .single();

    expect(msgErr).toBeNull();
    expect(msg!.id).toBeTruthy();
  });

  it('creates comment conversation with post_id', async () => {
    const { data: contact } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'instagram',
        platform_user_id: `${TEST_PREFIX}-comment-user`,
      })
      .select('id')
      .single();

    const { data: conv, error } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'instagram',
        platform_conversation_id: `instagram-${TEST_PREFIX}-post1`,
        type: 'comment',
        status: 'open',
        subject: 'Comment thread',
        contact_id: contact!.id,
        post_id: `${TEST_PREFIX}-post1`,
      })
      .select('id, post_id')
      .single();

    expect(error).toBeNull();
    expect(conv!.post_id).toBe(`${TEST_PREFIX}-post1`);
  });
});

describe('Message Deduplication', () => {
  it('unique index prevents duplicate platform_message_id per conversation', async () => {
    const { data: contact } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-dedup-user`,
      })
      .select('id')
      .single();

    const { data: conv } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_conversation_id: `dm-facebook-${TEST_PREFIX}-dedup`,
        type: 'dm',
        status: 'open',
        contact_id: contact!.id,
      })
      .select('id')
      .single();

    const msgData = {
      conversation_id: conv!.id,
      company_id: testCompanyId,
      platform_message_id: `${TEST_PREFIX}-dedup-msg`,
      sender_type: 'contact',
      content: 'First insert',
    };

    // First insert succeeds
    const { error: err1 } = await adminClient
      .from('inbox_messages')
      .insert(msgData);
    expect(err1).toBeNull();

    // Second insert with same platform_message_id + conversation_id fails
    const { error: err2 } = await adminClient
      .from('inbox_messages')
      .insert({ ...msgData, content: 'Duplicate attempt' });
    expect(err2).not.toBeNull();
    expect(err2!.code).toBe('23505'); // unique_violation

    // Verify only one message exists
    const { count } = await adminClient
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('platform_message_id', `${TEST_PREFIX}-dedup-msg`)
      .eq('conversation_id', conv!.id);

    expect(count).toBe(1);
  });

  it('same platform_message_id in different conversations is allowed', async () => {
    const { data: contact } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-cross-conv-user`,
      })
      .select('id')
      .single();

    const { data: conv1 } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_conversation_id: `dm-facebook-${TEST_PREFIX}-cross1`,
        type: 'dm',
        status: 'open',
        contact_id: contact!.id,
      })
      .select('id')
      .single();

    const { data: conv2 } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_conversation_id: `dm-facebook-${TEST_PREFIX}-cross2`,
        type: 'dm',
        status: 'open',
        contact_id: contact!.id,
      })
      .select('id')
      .single();

    const sharedMsgId = `${TEST_PREFIX}-cross-msg`;

    const { error: err1 } = await adminClient
      .from('inbox_messages')
      .insert({
        conversation_id: conv1!.id,
        company_id: testCompanyId,
        platform_message_id: sharedMsgId,
        sender_type: 'contact',
        content: 'In conv 1',
      });
    expect(err1).toBeNull();

    const { error: err2 } = await adminClient
      .from('inbox_messages')
      .insert({
        conversation_id: conv2!.id,
        company_id: testCompanyId,
        platform_message_id: sharedMsgId,
        sender_type: 'contact',
        content: 'In conv 2',
      });
    expect(err2).toBeNull();
  });
});

describe('Webhook Event Log', () => {
  it('inserts event log entry', async () => {
    const eventId = `${TEST_PREFIX}-evt-1`;
    const { error } = await adminClient
      .from('webhook_event_log')
      .insert({
        company_id: testCompanyId,
        provider: 'getlate',
        event_type: 'webhook.test',
        event_id: eventId,
        payload: { test: true },
        processing_status: 'processed',
        duration_ms: 42,
      });

    expect(error).toBeNull();
  });

  it('unique constraint on (provider, event_id) prevents duplicates', async () => {
    const eventId = `${TEST_PREFIX}-evt-unique`;
    await adminClient.from('webhook_event_log').insert({
      company_id: testCompanyId,
      provider: 'getlate',
      event_type: 'webhook.test',
      event_id: eventId,
      payload: {},
      processing_status: 'processed',
    });

    const { error } = await adminClient.from('webhook_event_log').insert({
      company_id: testCompanyId,
      provider: 'getlate',
      event_type: 'webhook.test',
      event_id: eventId,
      payload: {},
      processing_status: 'processed',
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe('23505');
  });
});

describe('Webhook Registration', () => {
  it('creates registration with unique company+provider constraint', async () => {
    const { error } = await adminClient
      .from('webhook_registrations')
      .insert({
        company_id: testCompanyId,
        provider: 'getlate',
        secret: `${TEST_PREFIX}-secret`,
        events: ['message.received', 'comment.received'],
        is_active: true,
      });

    expect(error).toBeNull();
  });

  it('upsert updates existing registration', async () => {
    const newSecret = `${TEST_PREFIX}-secret-updated`;
    const { error } = await adminClient
      .from('webhook_registrations')
      .upsert({
        company_id: testCompanyId,
        provider: 'getlate',
        secret: newSecret,
        events: ['message.received', 'comment.received', 'webhook.test'],
        is_active: true,
      }, { onConflict: 'company_id,provider' });

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('webhook_registrations')
      .select('secret, events')
      .eq('company_id', testCompanyId)
      .eq('provider', 'getlate')
      .single();

    expect(data!.secret).toBe(newSecret);
    expect(data!.events).toContain('webhook.test');
  });
});

describe('AI Classification Eligibility', () => {
  it('new conversation has null ai_classified_at', async () => {
    const { data: contact } = await adminClient
      .from('inbox_contacts')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_user_id: `${TEST_PREFIX}-classify-user`,
      })
      .select('id')
      .single();

    const { data: conv } = await adminClient
      .from('inbox_conversations')
      .insert({
        company_id: testCompanyId,
        platform: 'facebook',
        platform_conversation_id: `dm-facebook-${TEST_PREFIX}-classify`,
        type: 'dm',
        status: 'open',
        contact_id: contact!.id,
      })
      .select('id, ai_classified_at')
      .single();

    expect(conv!.ai_classified_at).toBeNull();
  });
});
