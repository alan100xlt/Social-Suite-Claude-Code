# SaaS Metrics Reference

Formulas, benchmarks, and tracking guidance for key SaaS metrics. Read this when building metrics dashboards, analyzing growth, or evaluating campaign ROI.

## Table of Contents
- Core SaaS Metrics
- Benchmarks by Stage
- Metric Relationships
- Tracking Implementation
- Longtale.ai Metric Definitions

## Core SaaS Metrics

### Customer Acquisition Cost (CAC)

```
CAC = Total Sales & Marketing Spend / Number of New Customers Acquired
```

**Include in spend**: Ad spend, marketing team salaries, sales team salaries, tools, content creation costs, agency fees.
**Exclude**: Product development, customer support (post-acquisition).

**CAC by channel**: Calculate separately for each channel to identify most efficient sources.
```
Channel CAC = Channel Spend / Customers Acquired via Channel
```

### Lifetime Value (LTV)

```
LTV = ARPU x Gross Margin % x Average Customer Lifespan (months)
```

Simplified:
```
LTV = ARPU / Monthly Churn Rate
```

Example: $50/month ARPU, 5% monthly churn -> LTV = $50 / 0.05 = $1,000

### LTV:CAC Ratio

```
LTV:CAC = LTV / CAC
```

| Ratio | Interpretation |
|-------|---------------|
| < 1:1 | Losing money on every customer. Unsustainable. |
| 1:1 - 2:1 | Barely breaking even. Improve retention or reduce CAC. |
| 3:1 | Healthy. Industry benchmark for sustainable growth. |
| 5:1+ | Under-investing in growth. Spend more on acquisition. |

### Monthly Recurring Revenue (MRR)

```
MRR = Sum of all active subscription revenue for the month
```

MRR components:
- **New MRR**: Revenue from new customers this month
- **Expansion MRR**: Revenue increase from existing customers (upgrades)
- **Contraction MRR**: Revenue decrease from existing customers (downgrades)
- **Churned MRR**: Revenue lost from cancelled customers
- **Net New MRR**: New + Expansion - Contraction - Churned

### Churn Rate

**Customer churn** (logo churn):
```
Customer Churn Rate = Customers Lost This Month / Customers at Start of Month
```

**Revenue churn** (dollar churn):
```
Revenue Churn Rate = MRR Lost This Month / MRR at Start of Month
```

**Net revenue churn** (includes expansion):
```
Net Revenue Churn = (Churned MRR - Expansion MRR) / MRR at Start of Month
```

Negative net revenue churn means expansion exceeds churn — the holy grail of SaaS.

### Activation Rate

```
Activation Rate = Users Who Complete Key Action / Total Signups
```

Define "key action" precisely. For Longtale.ai:
- **Minimum activation**: Connected at least one social account
- **Full activation**: Connected account + generated AI post + scheduled or published it

### Payback Period

```
CAC Payback Period (months) = CAC / (ARPU x Gross Margin %)
```

| Payback | Interpretation |
|---------|---------------|
| < 6 months | Excellent. Can grow aggressively. |
| 6-12 months | Good. Standard for B2B SaaS. |
| 12-18 months | Acceptable if retention is strong. |
| 18+ months | Risky. Need to improve CAC or ARPU. |

## Benchmarks by Stage

### Seed / Early Stage (< $1M ARR)

| Metric | Target |
|--------|--------|
| Monthly growth rate | 15-20% MoM |
| Customer churn | < 5% monthly |
| Activation rate | > 25% |
| CAC payback | < 12 months |
| LTV:CAC | > 3:1 |

### Growth Stage ($1M - $10M ARR)

| Metric | Target |
|--------|--------|
| Monthly growth rate | 10-15% MoM |
| Customer churn | < 3% monthly |
| Net revenue retention | > 100% |
| CAC payback | < 12 months |
| LTV:CAC | > 3:1 |
| Rule of 40 | Growth rate + profit margin > 40% |

### Scale Stage ($10M+ ARR)

| Metric | Target |
|--------|--------|
| Annual growth rate | 50-100% YoY |
| Customer churn | < 2% monthly |
| Net revenue retention | > 110% |
| CAC payback | < 18 months |
| Rule of 40 | > 40% |

## Metric Relationships

### The Growth Equation

```
MRR Growth = New MRR + Expansion MRR - Churned MRR - Contraction MRR
```

To grow faster, you can:
1. Acquire more customers (increase New MRR) — marketing/sales focus
2. Upsell existing customers (increase Expansion MRR) — product/CS focus
3. Reduce cancellations (decrease Churned MRR) — product/retention focus
4. Reduce downgrades (decrease Contraction MRR) — pricing/value focus

### Quick Ratio (SaaS)

```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
```

| Ratio | Interpretation |
|-------|---------------|
| < 1 | Shrinking. Losing more than gaining. |
| 1-2 | Growing slowly. Churn is a drag. |
| 2-4 | Healthy growth with manageable churn. |
| 4+ | Excellent. Efficient growth engine. |

## Tracking Implementation

### PostHog Events for Longtale.ai Metrics

```typescript
// Signup funnel
posthog.capture('signup_started', { source: 'landing-v5', utm_campaign: '...' })
posthog.capture('signup_completed', { plan: 'trial' })

// Activation
posthog.capture('account_connected', { platform: 'twitter', is_first: true })
posthog.capture('first_post_generated', { source: 'rss', platform: 'twitter' })
posthog.capture('first_post_scheduled', { platform: 'twitter' })
posthog.capture('activation_complete')  // all activation criteria met

// Engagement
posthog.capture('post_published', { platform: '...', source: 'ai' | 'manual' })
posthog.capture('analytics_viewed', { section: 'overview' | 'platform' | 'post' })

// Retention signals
posthog.capture('daily_active', {})  // fire once per day on first action
posthog.capture('feature_used', { feature: 'approval_workflow' | 'brand_voice' | '...' })

// Revenue
posthog.capture('plan_upgraded', { from: 'trial', to: 'pro', mrr: 50 })
posthog.capture('plan_downgraded', { from: 'enterprise', to: 'pro', mrr_lost: 100 })
posthog.capture('subscription_cancelled', { reason: '...', mrr_lost: 50 })
```

### Supabase Tables for Metric Tracking

Track subscription events in Supabase for server-side metric calculation:

```sql
-- Subscription events (for MRR calculation)
CREATE TABLE subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  event_type text NOT NULL, -- 'new', 'upgrade', 'downgrade', 'cancel', 'reactivate'
  mrr_change numeric NOT NULL, -- positive for new/upgrade, negative for downgrade/cancel
  plan text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Monthly metrics snapshots (calculated by cron)
CREATE TABLE monthly_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  total_mrr numeric,
  new_mrr numeric,
  expansion_mrr numeric,
  churned_mrr numeric,
  contraction_mrr numeric,
  total_customers integer,
  new_customers integer,
  churned_customers integer,
  activation_rate numeric,
  created_at timestamptz DEFAULT now()
);
```

## Longtale.ai Metric Definitions

Specific metric definitions for Longtale.ai's business model:

| Metric | Definition | How to Calculate |
|--------|-----------|-----------------|
| Active user | Logged in and performed at least 1 action in last 30 days | PostHog `daily_active` events |
| Activated user | Connected 1+ account AND scheduled/published 1+ post | PostHog `activation_complete` |
| Power user | Published 10+ posts in last 30 days | Supabase `posts` table |
| At-risk user | Active last month, no activity in last 14 days | Supabase `user_sessions` |
| Churned user | No login for 60+ days OR cancelled subscription | Supabase auth + subscription |
| ARPU | MRR / active paying companies | Subscription data |
| Brand density | Average connected social accounts per company | Supabase `social_accounts` |
| Content velocity | Posts published per company per week | Supabase `posts` table |
| AI adoption | % of published posts that were AI-generated | Supabase `posts.source` field |
