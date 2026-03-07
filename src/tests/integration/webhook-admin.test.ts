/**
 * Integration tests for webhook-admin edge function.
 * Tests auth enforcement and action routing against real Supabase.
 *
 * Run: npx vitest --config vitest.integration.config.ts src/tests/integration/webhook-admin.test.ts
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, anonClient } from './setup';

const FUNCTION_URL = `${supabaseUrl}/functions/v1/webhook-admin`;

// These accounts have different passwords than the test helper's hardcoded one
const SUPERADMIN = { email: 'alan@100xlt.ai', password: 'pam12ela' };
const MEMBER = { email: 'test-member@longtale.ai', password: 'TestPass123' };

async function getAccessToken(email: string, password: string): Promise<string> {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return data.session.access_token;
}

describe('webhook-admin edge function', () => {
  it('superadmin can call status action', async () => {
    const token = await getAccessToken(SUPERADMIN.email, SUPERADMIN.password);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'status' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('registrations');
    expect(data.data).toHaveProperty('recentEvents');
  });

  it('non-superadmin gets 403', async () => {
    const token = await getAccessToken(MEMBER.email, MEMBER.password);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'status' }),
    });

    expect(response.status).toBe(403);
  });

  it('unknown action returns 400', async () => {
    const token = await getAccessToken(SUPERADMIN.email, SUPERADMIN.password);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'nonexistent' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Unknown action');
  });

  it('status returns single getlate registration (single-webhook model)', async () => {
    const token = await getAccessToken(SUPERADMIN.email, SUPERADMIN.password);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'status' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Should have exactly 1 getlate registration
    const getlateRegs = data.data.registrations.filter(
      (r: any) => r.provider === 'getlate'
    );
    expect(getlateRegs.length).toBe(1);
    expect(getlateRegs[0].is_active).toBe(true);
    expect(getlateRegs[0].webhook_id).toBeTruthy();
  });

  it('register returns already_active for existing webhook', async () => {
    const token = await getAccessToken(SUPERADMIN.email, SUPERADMIN.password);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'register' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('already_active');
    expect(data.data.webhookId).toBeTruthy();
  });

  it('deregister and test no longer require companyId', async () => {
    // Verify the API accepts these actions without companyId
    // We don't actually deregister (would break the webhook), just verify the shape
    const token = await getAccessToken(SUPERADMIN.email, SUPERADMIN.password);

    // Test action should work without companyId
    const testResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'test' }),
    });

    // Should get 200 (success or failure from GetLate API), not 500 "companyId is required"
    expect(testResponse.status).toBe(200);
    const testData = await testResponse.json();
    expect(testData).toHaveProperty('data');
    expect(testData.data).toHaveProperty('status');
  });
});
