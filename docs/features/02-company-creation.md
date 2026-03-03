# Company Creation

## Paths

### Path A: Manual (SetupCompany page)
1. User enters company name on `/app/onboarding/setup`
2. Creates `companies` row (`created_by = auth.uid()`)
3. Creates `company_memberships` row (`role = owner`)
4. Updates `profiles.company_id` (fixed in platform restoration)
5. Creates default `automation_rules` entry (with empty `account_ids`)
6. Auto-creates a media company + child link + admin membership

### Path B: Discovery (Discover page)
1. User enters URL on `/discover`
2. `deep-website-crawl`: extracts branding, social channels, contact info
3. `discover-rss-feeds`: finds RSS feeds (parallel with crawl)
4. `create-discovery-company`: creates anonymous company + saves feeds
5. `claim-discovery-company`: assigns ownership, creates membership, creates media company hierarchy

### Path C: Invitation
1. User receives invitation email with link
2. Validates: invitation token, email match (verified server-side), expiry
3. Creates `company_memberships` row with the invited role

## Key Tables

- `companies` — core company entity
- `company_memberships` — user ↔ company with role
- `company_invitations` — pending invitations with token + expiry
- `automation_rules` — default rule created on company setup
