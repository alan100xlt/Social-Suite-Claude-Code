/**
 * Feature gating foundation (R13).
 * Currently all features are available to all tiers.
 * This provides infrastructure for future monetization.
 */

export type CompanyTier = 'free' | 'pro' | 'enterprise';

const TIER_FEATURES: Record<CompanyTier, Set<string>> = {
  free: new Set([
    'inbox',
    'inbox-manual-ai', // sentiment, suggest, summarize
    'inbox-labels',
    'inbox-canned-replies',
    'inbox-auto-rules-basic', // keyword, regex, all_new
  ]),
  pro: new Set([
    'inbox',
    'inbox-manual-ai',
    'inbox-labels',
    'inbox-canned-replies',
    'inbox-auto-rules-basic',
    'inbox-auto-classify',
    'inbox-smart-sort',
    'inbox-editorial-value',
    'inbox-translation',
    'inbox-auto-rules-advanced', // message_type, editorial_value, language, repeat_contact, after_hours
  ]),
  enterprise: new Set([
    'inbox',
    'inbox-manual-ai',
    'inbox-labels',
    'inbox-canned-replies',
    'inbox-auto-rules-basic',
    'inbox-auto-classify',
    'inbox-smart-sort',
    'inbox-editorial-value',
    'inbox-translation',
    'inbox-auto-rules-advanced',
    'inbox-crisis-detection',
    'inbox-content-recycling',
    'inbox-social-audit',
  ]),
};

/**
 * Check if a company has access to a feature based on their tier.
 * Currently returns true for all features (no gating enforced).
 */
export function hasFeature(_companyId: string | null, _featureName: string): boolean {
  // Phase 0.5: No gating enforced. All features available.
  // When we add billing, look up company_tier from companies table
  // and check against TIER_FEATURES[tier].has(featureName)
  return true;
}

/**
 * Get the feature set for a given tier (for admin display).
 */
export function getTierFeatures(tier: CompanyTier): string[] {
  return Array.from(TIER_FEATURES[tier] || []);
}
