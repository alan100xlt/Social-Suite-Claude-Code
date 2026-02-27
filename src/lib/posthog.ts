import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

const POSTHOG_KEY = 'phc_VGfw8iKfFpDImNWKfjyulFmebM5G7bUeHUI8pzhm5bA';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export function initPostHog() {
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not found, analytics disabled');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
  });
}

export async function identifyUser(userId: string, email?: string) {
  try {
    // Fetch profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email || email;

    // Get first membership for company context
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    // Identify user with rich properties
    posthog.identify(userId, {
      email: userEmail,
      name: profile?.full_name,
      avatar_url: profile?.avatar_url,
      company_id: membership?.company_id,
    });

    // Set company as a group if available
    if (membership?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name, slug')
        .eq('id', membership.company_id)
        .single();

      if (company) {
        posthog.group('company', membership.company_id, {
          name: company.name,
          slug: company.slug,
        });
      }
    }

    if (membership?.role) {
      posthog.people.set({ role: membership.role });
    }
  } catch (err) {
    console.warn('PostHog identify enrichment failed:', err);
    // Fallback to basic identify
    posthog.identify(userId, { email });
  }
}

export function resetPostHog() {
  posthog.reset();
}

export { posthog };
