import type { Company } from '@/hooks/useCompany';

export const DEMO_COMPANY_ID = 'demo-longtale';

export const DEMO_COMPANY: Company = {
  id: DEMO_COMPANY_ID,
  name: 'Longtale Demo',
  slug: 'demo',
  getlate_profile_id: null,
  created_at: '2025-01-15T10:00:00Z',
  created_by: 'demo-user',
  onboarding_status: 'complete',
  onboarding_step: 5,
  website_url: 'https://longtale.ai',
};

export function isDemoCompany(companyId: string | null | undefined): boolean {
  return companyId === DEMO_COMPANY_ID;
}
