# Growth Channels Reference

Channel selection, prioritization, and execution frameworks. Read this when choosing marketing channels or planning growth experiments.

## Table of Contents
- Channel Recommendations by Business Type
- ICE Prioritization Framework
- Paid vs Unpaid Channels
- Persistence vs Hit-or-Miss Channels
- Paid Acquisition Economics
- Channel Playbooks for Longtale.ai

## Channel Recommendations by Business Type

Longtale.ai is a **B2B SaaS with medium ARPU** (targeting $50-500/month per company).

**Most likely to work:**
- Content marketing and SEO
- Product-led growth (user invitations via team collaboration)
- LinkedIn Ads (media professionals are active on LinkedIn)
- Google Ads (high-intent searches like "social media tool for publishers")
- Partnerships with media industry tools (CMS, analytics, ad platforms)

**Worth testing:**
- Industry conferences and events (media/journalism conferences)
- Guest content in media industry newsletters
- Community building (Slack/Discord for media social managers)
- Webinars on social media strategy for publishers

**Unlikely to work at scale:**
- Facebook/Instagram ads (audience targeting too broad for niche B2B)
- Cold outreach/sales (ARPU likely too low to justify dedicated sales team until enterprise tier)
- TV/radio/print (wrong medium for this audience)

## ICE Prioritization Framework

Rate each channel 1-10 on three dimensions, then average:

```
ICE Score = (Impact + Confidence + Ease) / 3
```

- **Impact**: How much growth would this channel produce if successful?
- **Confidence**: How confident are you it will work? (Based on data, competitors, or expert input)
- **Ease**: How quickly and cheaply can you test it?

### Example ICE Scoring for Longtale.ai

| Channel | Impact | Confidence | Ease | ICE Score |
|---------|--------|------------|------|-----------|
| SEO / Blog content | 8 | 7 | 6 | 7.0 |
| Product-led (team invites) | 9 | 8 | 5 | 7.3 |
| LinkedIn Ads | 7 | 6 | 8 | 7.0 |
| Google Ads (search) | 7 | 7 | 8 | 7.3 |
| Media industry partnerships | 8 | 5 | 4 | 5.7 |
| Conference speaking | 6 | 5 | 3 | 4.7 |
| Cold email outreach | 5 | 4 | 7 | 5.3 |
| Product Hunt launch | 7 | 4 | 7 | 6.0 |

### How to Use ICE

1. List all candidate channels
2. Score each independently (don't compare while scoring)
3. Sort by ICE score
4. Test the top 2-3 channels simultaneously
5. Kill channels that don't show signal within 2-4 weeks
6. Double down on channels showing positive signal
7. Re-score quarterly as conditions change

## Paid vs Unpaid Channels

### Paid Channel Economics

```
CPA = Cost Per Click / Conversion Rate
Profitable if: LTV > CPA + Cost to Serve
```

**Example for Longtale.ai:**
- Google Ads CPC for "social media management tool": ~$8-15
- Landing page conversion rate: ~3% (signup)
- Trial-to-paid conversion: ~10%
- Effective CPA: $12 / 0.03 / 0.10 = **$4,000 per paying customer**
- This only works if ARPU is $200+/month and retention is 20+ months

**Implication**: Paid channels require either high ARPU or strong product-led acquisition to justify costs. Focus on reducing CPA through:
1. Better landing page conversion (see landing-pages.md)
2. Better trial-to-paid conversion (see email-sequences.md)
3. Strong word-of-mouth multiplier (each paid customer brings 2-3 organic ones)

### Unpaid Channel Priority

1. **Product-led acquisition** — Embed growth into the product itself (team invites, shared reports, "Powered by" branding)
2. **Content + SEO** — Compound returns over time, defensible
3. **Word of mouth** — Earned through product quality, amplified by referral programs
4. **Community** — Slack groups, forums, meetups for media professionals
5. **Partnerships** — Co-marketing with complementary tools

## Persistence vs Hit-or-Miss Channels

### Persistence Channels (prioritize these)

Growth compounds over time. Past effort increases future returns.

| Channel | Why It Compounds |
|---------|-----------------|
| SEO / Blog | Content ranks and generates traffic indefinitely |
| LinkedIn organic | Followers see future posts, each post builds audience |
| YouTube | Videos rank in search, subscribers see new content |
| Email list | Each subscriber receives all future emails |
| Community | Members invite others, content accumulates |

### Hit-or-Miss Channels (use as amplifiers)

No compounding. Each attempt is independent.

| Channel | Why It Doesn't Compound |
|---------|------------------------|
| Product Hunt | One launch, one day of attention |
| Hacker News | Front page is random, no follower graph |
| Reddit | Post success is independent of past posts |
| PR / Press | One article, one spike, then gone |
| Conferences | One talk, one audience, then over |

**Strategy**: Create content on persistence channels first. When something breaks out, cross-post to hit-or-miss channels for amplification.

## Channel Playbooks for Longtale.ai

### SEO / Content Marketing Playbook

**Target keywords** (see SKILL.md for full list):
- "social media management for publishers" (primary)
- "multi-brand social media tool" (primary)
- "automate social posts from RSS" (long-tail)

**Content calendar** (monthly):
- 2 SEO blog posts (targeting specific keywords)
- 1 data-driven analysis (using aggregated platform data)
- 1 customer story or case study
- 4 LinkedIn posts (condensed versions of blog content)

**SEO execution**:
1. Research keywords with search volume + low competition
2. Write comprehensive posts (2,000+ words for primary keywords)
3. Include screenshots, data, and actionable templates
4. Internal link to product pages and other blog posts
5. Build backlinks through guest posts and partnerships
6. Track rankings weekly, update content quarterly

### LinkedIn Organic Playbook

**Post types** (rotate weekly):
1. **Data insight**: "We analyzed X posts from media companies..."
2. **How-to thread**: Step-by-step guide for a specific tactic
3. **Contrarian take**: Challenge conventional wisdom about social media for publishers
4. **Customer story**: Brief case study with permission
5. **Behind the scenes**: Product development updates, team culture

**Rules**:
- Post Tuesday-Thursday, 8-10am EST
- No external links in post body (LinkedIn suppresses them)
- Put links in first comment
- Use 3-5 relevant hashtags at the bottom
- First 2 lines must hook — they're all that's visible before "see more"
- Engage with comments within first hour (algorithm boost)

### Product-Led Growth Playbook

**Team invitations** (highest priority):
- When admin creates a company, prompt them to invite team members
- When editor assigns a post for approval, reviewer must have an account
- When sharing analytics reports, recipients see "Powered by Longtale.ai" with signup link

**Billboarding opportunities**:
- "Published with Longtale.ai" footer option on social posts (opt-in)
- Branded analytics report PDFs
- Shared content calendar links
- Approval request emails to external stakeholders

**Referral program** (lower priority than natural PLA):
- Offer 1 month free for referrer and referee
- Only promote to activated users (not new signups)
- Track referral source through PostHog

### Google Ads Playbook

**Campaign structure**:
- Campaign 1: Brand terms ("longtale.ai", "longtale social media")
- Campaign 2: Competitor terms ("buffer alternative for publishers", "hootsuite for media")
- Campaign 3: High-intent terms ("social media management tool for news", "multi-brand social scheduling")
- Campaign 4: Problem-aware terms ("manage social media multiple brands", "automate social posts RSS")

**Ad copy formula**:
- Headline 1: Specific value prop (matches search intent)
- Headline 2: Differentiator (AI-powered, built for media companies)
- Headline 3: CTA (Start free trial, See demo)
- Description: Expand on value prop + address top objection

**Landing page rules**:
- Each campaign should link to a dedicated landing page (not homepage)
- Landing page headline should match the ad headline
- Include the search term in the page's H1 when possible
- One CTA per page, matching the ad's promise
