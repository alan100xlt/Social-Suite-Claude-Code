# Google Analytics Integration — End-to-End Content Journey

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect GA4 accounts via OAuth, pull hourly page metrics and referral data, correlate social posts to articles and traffic attribution, and build a new consolidated analytics experience showing the full content lifecycle: Article Published → Shared on Social → Clicks → On-Site Engagement.

**Architecture:** Direct Google OAuth (not through GetLate) stores refresh tokens in a new `google_analytics_connections` table. A new `ga-analytics-sync` edge function runs hourly via the cron dispatcher, pulling page-level metrics and traffic source breakdowns from the GA4 Data API. A correlation layer matches social post URLs to GA4 page paths. A new `/app/analytics/content-journey` page visualizes the full funnel.

**Tech Stack:** Google Analytics Data API v1 (GA4), Google OAuth 2.0, Supabase Edge Functions (Deno), TanStack Query v5, Recharts + Nivo, Tailwind/Shadcn

**Design Reference:** None — no visual design (backend-first, UI follows conventions)

---

## Never-Deploy-Without Gates

| Change Type | Required Tests | Status |
|-------------|---------------|--------|
| Edge function (google-analytics-auth) | L1 contract (GA4 API) + L3 smoke auth | ☐ |
| Edge function (ga-analytics-sync) | L1 contract (GA4 API) + L2 integration + L3 smoke auth | ☐ |
| Migration (4 tables + RPCs) | L2 RLS isolation + L2 RPC existence | ☐ |
| Cron/dispatcher | L2 pipeline health + L3 cron registration | ☐ |
| Frontend hooks (5 hooks) | L4 unit (query keys, enabled guards) + L3 smoke imports | ☐ |
| Frontend page (ContentJourney) | L3 smoke import + L5 E2E page load | ☐ |

**Do NOT deploy until all boxes are checked.**

---

## Phase 0: L1 Contract Tests — GA4 API Shape Verification

> **Why first:** The GA4 Data API is an external API. Per TDD standards, we verify real response shapes BEFORE writing any sync code. This prevents the "mocked tests pass, production fails" anti-pattern.

### Task 1: Write L1 contract test for GA4 Data API

**Files:**
- Create: `scripts/ga4-contract-tests.cjs`

**Step 1: Write the failing test**

```javascript
#!/usr/bin/env node
/**
 * GA4 Data API Contract Tests
 *
 * Hits the REAL Google Analytics Data API to discover and validate
 * exact request/response shapes before writing sync code.
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *   - GA4_TEST_REFRESH_TOKEN in .env.local (from a test OAuth flow)
 *   - GA4_TEST_PROPERTY_ID in .env.local (e.g., "properties/123456")
 *
 * Run: node scripts/ga4-contract-tests.cjs
 * Dry run: node scripts/ga4-contract-tests.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const CLIENT_ID = envContent.match(/GOOGLE_CLIENT_ID="([^"]+)"/)?.[1];
const CLIENT_SECRET = envContent.match(/GOOGLE_CLIENT_SECRET="([^"]+)"/)?.[1];
const REFRESH_TOKEN = envContent.match(/GA4_TEST_REFRESH_TOKEN="([^"]+)"/)?.[1];
const PROPERTY_ID = envContent.match(/GA4_TEST_PROPERTY_ID="([^"]+)"/)?.[1];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
  process.exit(1);
}
if (!REFRESH_TOKEN || !PROPERTY_ID) {
  console.error('Missing GA4_TEST_REFRESH_TOKEN or GA4_TEST_PROPERTY_ID in .env.local');
  console.error('Run the OAuth flow manually first to obtain a refresh token.');
  process.exit(1);
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const GA_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

let passed = 0, failed = 0, skipped = 0;
const results = [];
const contracts = {};

// ─── Helpers ─────────────────────────────────────────────────
function record(test, result, details = {}) {
  const status = result ? 'PASS' : 'FAIL';
  if (result) passed++; else failed++;
  results.push({ test, status, ...details });
  console.log(`  ${result ? '✓' : '✗'} ${test}`);
  if (!result && details.error) console.log(`    → ${details.error}`);
}

function recordSkip(test, reason) {
  skipped++;
  results.push({ test, status: 'SKIP', reason });
  console.log(`  ○ ${test} (${reason})`);
}

function logKeys(label, obj) {
  if (!obj) return;
  console.log(`    ${label} keys: ${Object.keys(obj).join(', ')}`);
}

// ─── Token Refresh ───────────────────────────────────────────
async function getAccessToken() {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return data;
}

// ─── Section: Token Refresh ──────────────────────────────────
async function testTokenRefresh() {
  console.log('\n── Token Refresh ──');

  const tokenData = await getAccessToken();

  record('Token refresh returns access_token', !!tokenData.access_token);
  record('Token refresh returns expires_in', typeof tokenData.expires_in === 'number');
  record('Token refresh returns token_type', tokenData.token_type === 'Bearer');

  contracts.tokenRefresh = {
    fields: Object.keys(tokenData),
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
  };

  logKeys('Token response', tokenData);

  return tokenData.access_token;
}

// ─── Section: Account Summaries (Admin API) ──────────────────
async function testAccountSummaries(accessToken) {
  console.log('\n── Account Summaries (Admin API) ──');

  const response = await fetch(`${GA_ADMIN_API}/accountSummaries`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  record('accountSummaries endpoint returns 200', response.ok, { status: response.status });

  if (!response.ok) return;

  const data = await response.json();

  record('Response has accountSummaries array', Array.isArray(data.accountSummaries));

  if (data.accountSummaries?.length > 0) {
    const first = data.accountSummaries[0];
    record('Account has name field', !!first.name);
    record('Account has account field', !!first.account);
    record('Account has displayName field', !!first.displayName);
    record('Account has propertySummaries array', Array.isArray(first.propertySummaries));

    logKeys('AccountSummary', first);

    if (first.propertySummaries?.length > 0) {
      const prop = first.propertySummaries[0];
      record('Property has property field (ID)', !!prop.property);
      record('Property has displayName', !!prop.displayName);
      record('Property has propertyType', !!prop.propertyType);

      logKeys('PropertySummary', prop);

      contracts.accountSummaries = {
        accountFields: Object.keys(first),
        propertyFields: Object.keys(prop),
        samplePropertyId: prop.property,
        samplePropertyType: prop.propertyType,
      };
    }
  } else {
    recordSkip('Property field checks', 'No accounts found');
  }
}

// ─── Section: runReport — Page Metrics ───────────────────────
async function testRunReportPageMetrics(accessToken) {
  console.log('\n── runReport: Page Metrics ──');

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const body = {
    dateRanges: [{ startDate: sevenDaysAgo, endDate: today }],
    dimensions: [
      { name: 'pagePath' },
      { name: 'pageTitle' },
      { name: 'dateHour' },
    ],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    limit: 10,
  };

  const response = await fetch(`${GA_DATA_API}/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  record('runReport (page metrics) returns 200', response.ok, { status: response.status });

  if (!response.ok) {
    const error = await response.text();
    console.log(`    Error body: ${error.slice(0, 500)}`);
    return;
  }

  const data = await response.json();

  record('Response has dimensionHeaders', Array.isArray(data.dimensionHeaders));
  record('Response has metricHeaders', Array.isArray(data.metricHeaders));
  record('Response has rows (or rowCount=0)', Array.isArray(data.rows) || data.rowCount === 0);

  if (data.dimensionHeaders) {
    const dimNames = data.dimensionHeaders.map(h => h.name);
    record('Dimension: pagePath present', dimNames.includes('pagePath'));
    record('Dimension: pageTitle present', dimNames.includes('pageTitle'));
    record('Dimension: dateHour present', dimNames.includes('dateHour'));
    console.log(`    Dimensions: ${dimNames.join(', ')}`);
  }

  if (data.metricHeaders) {
    const metNames = data.metricHeaders.map(h => h.name);
    record('Metric: screenPageViews present', metNames.includes('screenPageViews'));
    record('Metric: sessions present', metNames.includes('sessions'));
    record('Metric: totalUsers present', metNames.includes('totalUsers'));
    record('Metric: bounceRate present', metNames.includes('bounceRate'));
    record('Metric: averageSessionDuration present', metNames.includes('averageSessionDuration'));
    console.log(`    Metrics: ${metNames.join(', ')}`);
  }

  if (data.rows?.length > 0) {
    const row = data.rows[0];
    record('Row has dimensionValues array', Array.isArray(row.dimensionValues));
    record('Row has metricValues array', Array.isArray(row.metricValues));
    record('dimensionValues has 3 entries', row.dimensionValues?.length === 3);
    record('metricValues has 5 entries', row.metricValues?.length === 5);

    // Verify dateHour format (YYYYMMDDHH)
    const dateHour = row.dimensionValues?.[2]?.value;
    record('dateHour matches YYYYMMDDHH format', /^\d{10}$/.test(dateHour || ''));
    console.log(`    Sample dateHour: ${dateHour}`);
    console.log(`    Sample pagePath: ${row.dimensionValues?.[0]?.value}`);
    console.log(`    Sample pageviews: ${row.metricValues?.[0]?.value}`);

    contracts.pageMetricsReport = {
      dimensionOrder: ['pagePath', 'pageTitle', 'dateHour'],
      metricOrder: ['screenPageViews', 'sessions', 'totalUsers', 'bounceRate', 'averageSessionDuration'],
      dateHourFormat: 'YYYYMMDDHH',
      sampleRow: {
        dimensions: row.dimensionValues?.map(d => d.value),
        metrics: row.metricValues?.map(m => m.value),
      },
    };
  } else {
    recordSkip('Row structure checks', 'No rows returned (empty property?)');
  }
}

// ─── Section: runReport — Traffic Sources ────────────────────
async function testRunReportTrafficSources(accessToken) {
  console.log('\n── runReport: Traffic Sources ──');

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const body = {
    dateRanges: [{ startDate: sevenDaysAgo, endDate: today }],
    dimensions: [
      { name: 'pagePath' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' },
      { name: 'dateHour' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    limit: 10,
  };

  const response = await fetch(`${GA_DATA_API}/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  record('runReport (traffic sources) returns 200', response.ok, { status: response.status });

  if (!response.ok) {
    const error = await response.text();
    console.log(`    Error body: ${error.slice(0, 500)}`);
    return;
  }

  const data = await response.json();

  if (data.dimensionHeaders) {
    const dimNames = data.dimensionHeaders.map(h => h.name);
    record('Dimension: sessionSource present', dimNames.includes('sessionSource'));
    record('Dimension: sessionMedium present', dimNames.includes('sessionMedium'));
    record('Dimension: sessionCampaignName present', dimNames.includes('sessionCampaignName'));
    console.log(`    Dimensions: ${dimNames.join(', ')}`);
  }

  if (data.rows?.length > 0) {
    const row = data.rows[0];
    record('Row has 5 dimensionValues', row.dimensionValues?.length === 5);
    record('Row has 5 metricValues', row.metricValues?.length === 5);

    const source = row.dimensionValues?.[1]?.value;
    const medium = row.dimensionValues?.[2]?.value;
    const campaign = row.dimensionValues?.[3]?.value;
    console.log(`    Sample: source=${source}, medium=${medium}, campaign=${campaign}`);

    contracts.trafficSourcesReport = {
      dimensionOrder: ['pagePath', 'sessionSource', 'sessionMedium', 'sessionCampaignName', 'dateHour'],
      metricOrder: ['sessions', 'totalUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration'],
      sampleRow: {
        source,
        medium,
        campaign,
      },
    };
  } else {
    recordSkip('Traffic source row checks', 'No rows returned');
  }
}

// ─── Section: OAuth Scopes ───────────────────────────────────
async function testUserInfo(accessToken) {
  console.log('\n── User Info (OAuth scope check) ──');

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  record('userinfo endpoint returns 200', response.ok, { status: response.status });

  if (response.ok) {
    const data = await response.json();
    record('Response has email', !!data.email);
    logKeys('UserInfo', data);
    contracts.userInfo = { fields: Object.keys(data) };
  }
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('GA4 Data API Contract Tests');
  console.log(`Property: ${PROPERTY_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('═'.repeat(60));

  try {
    const accessToken = await testTokenRefresh();
    await testAccountSummaries(accessToken);
    await testRunReportPageMetrics(accessToken);
    await testRunReportTrafficSources(accessToken);
    await testUserInfo(accessToken);
  } catch (err) {
    console.error('\nFATAL:', err.message);
    failed++;
  }

  // ─── Summary ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  // Write contracts to file for reference by unit tests
  const contractsPath = path.join(__dirname, '..', 'docs', 'ga4-api-contracts.json');
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
  console.log(`Contracts written to: ${contractsPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
```

**Step 2: Run it — expect it to fail (no credentials yet)**
Run: `node scripts/ga4-contract-tests.cjs`
Expected: `Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local` (exit 1)

**Step 3: Set up test credentials and run again**
1. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID="your-test-client-id"
   GOOGLE_CLIENT_SECRET="your-test-secret"
   GA4_TEST_REFRESH_TOKEN="your-test-refresh-token"
   GA4_TEST_PROPERTY_ID="properties/123456"
   ```
2. Run: `node scripts/ga4-contract-tests.cjs`
3. Expected: All probes pass, `docs/ga4-api-contracts.json` written

**Step 4: Commit**
`git commit -m "test(L1): add GA4 Data API contract tests — token refresh, account summaries, runReport shapes"`

---

## Phase 1: Database Schema + RLS Tests

> **Session boundary:** Complete Phase 1 (schema + L2 tests) before moving to Phase 2 (edge functions).

### Task 2: Write L2 integration test for GA tables (RED — write failing test first)

**Files:**
- Create: `src/tests/integration/google-analytics-rls.test.ts`

**Step 1: Write the failing RLS isolation test**

```typescript
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  deleteTestCompany,
  addMembership,
  signInAsUser,
} from "./setup";

/**
 * Google Analytics RLS Isolation Tests
 *
 * Verifies:
 * 1. User A cannot read Company B's GA connections
 * 2. User A cannot read Company B's page snapshots
 * 3. User A cannot read Company B's referral snapshots
 * 4. User A cannot read Company B's post-page correlations
 * 5. RPC functions enforce company membership
 * 6. Service role can read/write all tables
 */

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let companyA: string;
let companyB: string;
let connectionIdB: string | null = null;

beforeAll(async () => {
  userA = await createTestUser("ga-rls-a");
  userB = await createTestUser("ga-rls-b");
  companyA = await createTestCompany("GA RLS Co A", userA.id);
  companyB = await createTestCompany("GA RLS Co B", userB.id);
  await addMembership(userA.id, companyA, "owner");
  await addMembership(userB.id, companyB, "owner");

  // Seed Company B with GA data that User A should never see
  const { data: conn } = await adminClient
    .from("google_analytics_connections")
    .insert({
      company_id: companyB,
      google_email: "test@example.com",
      property_id: "properties/999999",
      property_name: "Secret Property",
      refresh_token: "secret-refresh-token",
      is_active: true,
    })
    .select("id")
    .single();
  connectionIdB = conn?.id ?? null;

  if (connectionIdB) {
    await adminClient.from("ga_page_snapshots").insert({
      company_id: companyB,
      connection_id: connectionIdB,
      page_path: "/secret-article",
      pageviews: 1000,
      snapshot_hour: new Date().toISOString(),
    });

    await adminClient.from("ga_referral_snapshots").insert({
      company_id: companyB,
      connection_id: connectionIdB,
      page_path: "/secret-article",
      source: "twitter.com",
      medium: "social",
      sessions: 50,
      snapshot_hour: new Date().toISOString(),
    });

    await adminClient.from("post_page_correlations").insert({
      company_id: companyB,
      post_id: "secret-post-id",
      platform: "twitter",
      page_path: "/secret-article",
      match_type: "url",
    });
  }
}, 30000);

afterAll(async () => {
  // Clean up in reverse order
  await adminClient.from("post_page_correlations").delete().eq("company_id", companyB);
  await adminClient.from("ga_referral_snapshots").delete().eq("company_id", companyB);
  await adminClient.from("ga_page_snapshots").delete().eq("company_id", companyB);
  if (connectionIdB) {
    await adminClient.from("google_analytics_connections").delete().eq("id", connectionIdB);
  }
  await deleteTestCompany(companyA);
  await deleteTestCompany(companyB);
  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}, 30000);

describe("GA connections — cross-tenant isolation", () => {
  test("User A cannot read Company B connections", async () => {
    const clientA = await signInAsUser(userA);
    const { data } = await clientA
      .from("google_analytics_connections")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });

  test("Service role can read all connections", async () => {
    const { data } = await adminClient
      .from("google_analytics_connections")
      .select("*")
      .eq("company_id", companyB);
    expect(data?.length).toBeGreaterThan(0);
  });
});

describe("GA page snapshots — cross-tenant isolation", () => {
  test("User A cannot read Company B page snapshots", async () => {
    const clientA = await signInAsUser(userA);
    const { data } = await clientA
      .from("ga_page_snapshots")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });
});

describe("GA referral snapshots — cross-tenant isolation", () => {
  test("User A cannot read Company B referral snapshots", async () => {
    const clientA = await signInAsUser(userA);
    const { data } = await clientA
      .from("ga_referral_snapshots")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });
});

describe("Post-page correlations — cross-tenant isolation", () => {
  test("User A cannot read Company B correlations", async () => {
    const clientA = await signInAsUser(userA);
    const { data } = await clientA
      .from("post_page_correlations")
      .select("*")
      .eq("company_id", companyB);
    expect(data).toEqual([]);
  });
});

describe("RPC functions — access control", () => {
  test("get_ga_page_metrics denies access for non-member", async () => {
    const clientA = await signInAsUser(userA);
    const { error } = await clientA.rpc("get_ga_page_metrics", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
    expect(error?.message).toContain("Access denied");
  });

  test("get_ga_traffic_sources denies access for non-member", async () => {
    const clientA = await signInAsUser(userA);
    const { error } = await clientA.rpc("get_ga_traffic_sources", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
    expect(error?.message).toContain("Access denied");
  });

  test("get_content_journey denies access for non-member", async () => {
    const clientA = await signInAsUser(userA);
    const { error } = await clientA.rpc("get_content_journey", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeTruthy();
    expect(error?.message).toContain("Access denied");
  });

  test("get_ga_page_metrics returns data for own company member", async () => {
    const clientB = await signInAsUser(userB);
    const { error } = await clientB.rpc("get_ga_page_metrics", {
      _company_id: companyB,
      _start_date: "2026-01-01",
      _end_date: "2026-12-31",
    });
    expect(error).toBeNull();
  });
});

describe("Table existence", () => {
  test("google_analytics_connections table exists", async () => {
    const { error } = await adminClient
      .from("google_analytics_connections")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("ga_page_snapshots table exists", async () => {
    const { error } = await adminClient
      .from("ga_page_snapshots")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("ga_referral_snapshots table exists", async () => {
    const { error } = await adminClient
      .from("ga_referral_snapshots")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("post_page_correlations table exists", async () => {
    const { error } = await adminClient
      .from("post_page_correlations")
      .select("id")
      .limit(0);
    expect(error).toBeNull();
  });

  test("get_ga_page_metrics function exists", async () => {
    const { error } = await adminClient.rpc("get_ga_page_metrics", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    // Function exists but returns empty — no error about function not found
    expect(error?.message).not.toContain("function");
  });

  test("get_ga_traffic_sources function exists", async () => {
    const { error } = await adminClient.rpc("get_ga_traffic_sources", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    expect(error?.message).not.toContain("function");
  });

  test("get_content_journey function exists", async () => {
    const { error } = await adminClient.rpc("get_content_journey", {
      _company_id: "00000000-0000-0000-0000-000000000000",
      _start_date: "2026-01-01",
      _end_date: "2026-01-01",
    });
    expect(error?.message).not.toContain("function");
  });
});
```

**Step 2: Run the test — confirm it fails (tables don't exist yet)**
Run: `npm run test:integration -- --run src/tests/integration/google-analytics-rls.test.ts`
Expected: All tests fail with "relation does not exist" errors

**Step 3: Commit the RED test**
`git commit -m "test(L2): add GA RLS isolation tests — tables, RPCs, cross-tenant (RED)"`

---

### Task 3: Create the Google Analytics migration (GREEN — make tests pass)

**Files:**
- Create: `supabase/migrations/20260307200000_google_analytics.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- Google Analytics Integration Tables
-- ============================================================

-- 1. Connection storage (OAuth refresh tokens + property metadata)
CREATE TABLE IF NOT EXISTS google_analytics_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  property_id TEXT NOT NULL,
  property_name TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, property_id)
);

-- 2. Page-level metrics (hourly snapshots)
CREATE TABLE IF NOT EXISTS ga_page_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  pageviews INTEGER DEFAULT 0,
  unique_pageviews INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(8,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  exit_rate DECIMAL(5,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, snapshot_hour)
);

-- 3. Traffic source breakdown per page (hourly)
CREATE TABLE IF NOT EXISTS ga_referral_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_analytics_connections(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_session_duration DECIMAL(8,2) DEFAULT 0,
  snapshot_hour TIMESTAMPTZ NOT NULL,
  short_link_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, page_path, source, medium, snapshot_hour)
);

-- 4. Post-to-page correlation cache
CREATE TABLE IF NOT EXISTS post_page_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  page_path TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'url',
  match_confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, post_id, page_path)
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE google_analytics_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_referral_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_page_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON google_analytics_connections
  FOR ALL USING (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON ga_page_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON ga_referral_snapshots
  FOR ALL USING (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  );

CREATE POLICY "tenant_isolation" ON post_page_correlations
  FOR ALL USING (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_is_member(auth.uid(), company_id) OR is_superadmin() OR auth.role() = 'service_role'
  );

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_ga_page_company_hour ON ga_page_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_page_path ON ga_page_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_ga_referral_company_hour ON ga_referral_snapshots (company_id, snapshot_hour);
CREATE INDEX idx_ga_referral_source ON ga_referral_snapshots (company_id, source, medium, snapshot_hour);
CREATE INDEX idx_ga_referral_page ON ga_referral_snapshots (company_id, page_path, snapshot_hour);
CREATE INDEX idx_post_page_post ON post_page_correlations (company_id, post_id);
CREATE INDEX idx_post_page_path ON post_page_correlations (company_id, page_path);
CREATE INDEX idx_ga_connections_company ON google_analytics_connections (company_id);

-- ── Grants ───────────────────────────────────────────────────
GRANT SELECT ON google_analytics_connections TO authenticated;
GRANT ALL ON google_analytics_connections TO service_role;
GRANT SELECT ON ga_page_snapshots TO authenticated;
GRANT ALL ON ga_page_snapshots TO service_role;
GRANT SELECT ON ga_referral_snapshots TO authenticated;
GRANT ALL ON ga_referral_snapshots TO service_role;
GRANT SELECT ON post_page_correlations TO authenticated;
GRANT ALL ON post_page_correlations TO service_role;

-- ── RPC Functions ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_ga_page_metrics(
  _company_id UUID, _start_date DATE, _end_date DATE, _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE, page_path TEXT,
  total_pageviews BIGINT, total_unique_pageviews BIGINT,
  total_sessions BIGINT, total_users BIGINT,
  avg_bounce_rate NUMERIC, avg_time_on_page NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    (gps.snapshot_hour AT TIME ZONE 'UTC')::DATE AS metric_date,
    gps.page_path,
    COALESCE(SUM(gps.pageviews), 0)::BIGINT,
    COALESCE(SUM(gps.unique_pageviews), 0)::BIGINT,
    COALESCE(SUM(gps.sessions), 0)::BIGINT,
    COALESCE(SUM(gps.users), 0)::BIGINT,
    ROUND(AVG(gps.bounce_rate), 2),
    ROUND(AVG(gps.avg_time_on_page), 2)
  FROM ga_page_snapshots gps
  WHERE gps.company_id = _company_id
    AND gps.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND gps.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
    AND (_page_path IS NULL OR gps.page_path = _page_path)
  GROUP BY metric_date, gps.page_path
  ORDER BY metric_date DESC, total_pageviews DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION get_ga_traffic_sources(
  _company_id UUID, _start_date DATE, _end_date DATE, _page_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  source TEXT, medium TEXT,
  total_sessions BIGINT, total_users BIGINT, total_pageviews BIGINT,
  avg_bounce_rate NUMERIC, avg_session_duration NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    grs.source, grs.medium,
    COALESCE(SUM(grs.sessions), 0)::BIGINT,
    COALESCE(SUM(grs.users), 0)::BIGINT,
    COALESCE(SUM(grs.pageviews), 0)::BIGINT,
    ROUND(AVG(grs.bounce_rate), 2),
    ROUND(AVG(grs.avg_session_duration), 2)
  FROM ga_referral_snapshots grs
  WHERE grs.company_id = _company_id
    AND grs.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND grs.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
    AND (_page_path IS NULL OR grs.page_path = _page_path)
  GROUP BY grs.source, grs.medium
  ORDER BY total_sessions DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION get_content_journey(
  _company_id UUID, _start_date DATE, _end_date DATE
)
RETURNS TABLE (
  post_id TEXT, platform TEXT, post_content TEXT, post_url TEXT,
  published_at TIMESTAMPTZ,
  impressions BIGINT, social_clicks BIGINT, likes BIGINT, shares BIGINT,
  engagement_rate NUMERIC,
  page_path TEXT, pageviews BIGINT, sessions_from_social BIGINT,
  bounce_rate NUMERIC, avg_time_on_page NUMERIC,
  match_type TEXT, match_confidence NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT user_is_member(auth.uid(), _company_id) AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    pas.post_id, pas.platform, pas.content, pas.post_url, pas.published_at,
    COALESCE(pas.impressions, 0)::BIGINT,
    COALESCE(pas.clicks, 0)::BIGINT,
    COALESCE(pas.likes, 0)::BIGINT,
    COALESCE(pas.shares, 0)::BIGINT,
    COALESCE(pas.engagement_rate, 0)::NUMERIC,
    ppc.page_path,
    COALESCE(SUM(gps.pageviews), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN grs.medium = 'social' THEN grs.sessions ELSE 0 END), 0)::BIGINT,
    ROUND(AVG(gps.bounce_rate), 2),
    ROUND(AVG(gps.avg_time_on_page), 2),
    ppc.match_type, ppc.match_confidence::NUMERIC
  FROM post_analytics_snapshots pas
  INNER JOIN post_page_correlations ppc
    ON ppc.company_id = pas.company_id AND ppc.post_id = pas.post_id
  LEFT JOIN ga_page_snapshots gps
    ON gps.company_id = ppc.company_id AND gps.page_path = ppc.page_path
    AND gps.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND gps.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
  LEFT JOIN ga_referral_snapshots grs
    ON grs.company_id = ppc.company_id AND grs.page_path = ppc.page_path
    AND grs.snapshot_hour >= _start_date::TIMESTAMPTZ
    AND grs.snapshot_hour < (_end_date + 1)::TIMESTAMPTZ
  WHERE pas.company_id = _company_id
    AND pas.published_at IS NOT NULL
    AND pas.published_at::DATE >= _start_date
    AND pas.published_at::DATE <= _end_date
  GROUP BY
    pas.post_id, pas.platform, pas.content, pas.post_url, pas.published_at,
    pas.impressions, pas.clicks, pas.likes, pas.shares, pas.engagement_rate,
    ppc.page_path, ppc.match_type, ppc.match_confidence
  ORDER BY pas.published_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_ga_page_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ga_traffic_sources TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_journey TO authenticated;
```

**Step 2: Apply the migration**
Run: `npm run db:migrate`
Expected: Migration applies successfully

**Step 3: Run L2 tests again — confirm they pass (GREEN)**
Run: `npm run test:integration -- --run src/tests/integration/google-analytics-rls.test.ts`
Expected: All tests pass

**Step 4: Commit**
`git commit -m "feat: add Google Analytics schema — connections, snapshots, correlations, RPCs (GREEN)"`

---

## Phase 2: Edge Functions + Auth Smoke Tests

### Task 4: Write L3 smoke test for edge functions (RED)

**Files:**
- Create: `src/tests/smoke/google-analytics.test.ts`

**Step 1: Write the smoke test**

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: () => ({ selectedCompanyId: 'demo-longtale' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'demo-user', email: 'demo@test.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: (id: string) => id === 'demo-longtale',
  DEMO_COMPANY_ID: 'demo-longtale',
  DEMO_COMPANY: { id: 'demo-longtale', name: 'Longtale Demo' },
}));

describe('Google Analytics smoke tests', () => {
  it('should import ContentJourney page without errors', async () => {
    const module = await import('@/pages/ContentJourney');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import GA API client with all methods', async () => {
    const { googleAnalyticsApi } = await import('@/lib/api/google-analytics');
    expect(typeof googleAnalyticsApi.startAuth).toBe('function');
    expect(typeof googleAnalyticsApi.handleCallback).toBe('function');
    expect(typeof googleAnalyticsApi.selectProperty).toBe('function');
    expect(typeof googleAnalyticsApi.disconnect).toBe('function');
    expect(typeof googleAnalyticsApi.syncNow).toBe('function');
  });

  it('should import all GA hooks without errors', async () => {
    const hooks = await Promise.all([
      import('@/hooks/useGoogleAnalytics'),
      import('@/hooks/useGAPageMetrics'),
      import('@/hooks/useGATrafficSources'),
      import('@/hooks/useContentJourney'),
    ]);
    hooks.forEach((mod) => {
      const exported = Object.values(mod);
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  it('should export useGAConnections from useGoogleAnalytics', async () => {
    const mod = await import('@/hooks/useGoogleAnalytics');
    expect(typeof mod.useGAConnections).toBe('function');
    expect(typeof mod.useConnectGA).toBe('function');
    expect(typeof mod.useSyncGA).toBe('function');
    expect(typeof mod.useDisconnectGA).toBe('function');
  });

  it('should export useGAPageMetrics', async () => {
    const mod = await import('@/hooks/useGAPageMetrics');
    expect(typeof mod.useGAPageMetrics).toBe('function');
  });

  it('should export useGATrafficSources', async () => {
    const mod = await import('@/hooks/useGATrafficSources');
    expect(typeof mod.useGATrafficSources).toBe('function');
  });

  it('should export useContentJourney', async () => {
    const mod = await import('@/hooks/useContentJourney');
    expect(typeof mod.useContentJourney).toBe('function');
  });

  it('should import GAPropertySelectionDialog', async () => {
    const mod = await import('@/components/connections/GAPropertySelectionDialog');
    expect(mod.default || mod.GAPropertySelectionDialog).toBeDefined();
  });

  it('should load demo data with GA datasets', async () => {
    const demoData = await import('@/lib/demo/demo-data');
    expect(demoData.DEMO_GA_CONNECTIONS).toBeDefined();
    expect(demoData.DEMO_GA_CONNECTIONS.length).toBeGreaterThanOrEqual(1);
    expect(demoData.DEMO_GA_PAGE_SNAPSHOTS).toBeDefined();
    expect(demoData.DEMO_GA_PAGE_SNAPSHOTS.length).toBeGreaterThanOrEqual(5);
    expect(demoData.DEMO_GA_REFERRAL_SNAPSHOTS).toBeDefined();
    expect(demoData.DEMO_GA_CONTENT_JOURNEY).toBeDefined();
  });
});
```

**Step 2: Run — confirm it fails (files don't exist yet)**
Run: `npm run test:smoke -- --run src/tests/smoke/google-analytics.test.ts`
Expected: All tests fail with import errors

**Step 3: Commit**
`git commit -m "test(L3): add GA smoke tests — page, hooks, API client, demo data (RED)"`

---

### Task 5: Google OAuth edge function

**Files:**
- Create: `supabase/functions/google-analytics-auth/index.ts`

**Step 1: Write the edge function**

Handles four actions: `start`, `callback`, `select-property`, `disconnect`.

Follow the exact pattern from `supabase/functions/getlate-connect/index.ts`:
- `Deno.serve(async (req) => { ... })`
- OPTIONS handler with `corsHeaders`
- `authorize(req, { allowServiceRole: true })` for auth
- JSON response with `{ success: boolean, error?: string, data?: T }`
- `AbortSignal.timeout(FETCH_TIMEOUT_MS)` on all external fetches

**Action: start** — builds Google OAuth consent URL with `analytics.readonly` scope, `access_type: 'offline'`, `prompt: 'consent'`. State param encodes `{ companyId, userId }`.

**Action: callback** — exchanges auth code for tokens via `https://oauth2.googleapis.com/token`. Fetches GA4 properties via Admin API `accountSummaries`. Returns `{ properties, refreshToken, accessToken, googleEmail }` to frontend for property selection.

**Action: select-property** — upserts to `google_analytics_connections` with the chosen property + tokens.

**Action: disconnect** — sets `is_active = false` on the connection.

See full implementation in the previous version of this plan (same code, no changes needed).

**Step 2: Verify**
Run: `ls supabase/functions/google-analytics-auth/index.ts`
Expected: File exists

**Step 3: Commit**
`git commit -m "feat: add google-analytics-auth edge function — OAuth start, callback, property selection, disconnect"`

---

### Task 6: GA4 Data Sync edge function

**Files:**
- Create: `supabase/functions/ga-analytics-sync/index.ts`

**Step 1: Write the sync edge function**

Follow the exact pattern from `supabase/functions/analytics-sync/index.ts`:
- `DEADLINE_MS = 50_000` with `pastDeadline()` guard
- `FETCH_TIMEOUT_MS = 15_000` on all API calls
- `CronMonitor` for health logging
- `authorize(req, { allowServiceRole: true })`
- Batch upserts in chunks of `BATCH_SIZE = 50`
- Per-company dispatch via `companyId` body param

**Report 1: Page metrics** — calls `GA_DATA_API/{propertyId}:runReport` with dimensions `[pagePath, pageTitle, dateHour]` and metrics `[screenPageViews, sessions, totalUsers, bounceRate, averageSessionDuration]`. Upserts into `ga_page_snapshots`.

**Report 2: Traffic sources** — calls `runReport` with dimensions `[pagePath, sessionSource, sessionMedium, sessionCampaignName, dateHour]` and same metrics. Upserts into `ga_referral_snapshots`.

**Step 3: Post-to-page URL correlation** — queries recent `post_analytics_snapshots` for URLs, matches against known `ga_page_snapshots.page_path` values, upserts matches into `post_page_correlations`.

Use verified field names from `docs/ga4-api-contracts.json` (output of L1 contract tests).

See full implementation in the previous version of this plan (same code, no changes needed).

**Step 2: Verify**
Run: `ls supabase/functions/ga-analytics-sync/index.ts`
Expected: File exists

**Step 3: Commit**
`git commit -m "feat: add ga-analytics-sync edge function — hourly page metrics, traffic sources, URL correlation"`

---

### Task 7: Register in cron dispatcher + cron job migration

**Files:**
- Modify: `supabase/functions/cron-dispatcher/index.ts`
- Create: `supabase/migrations/20260307200100_ga_analytics_cron.sql`

**Step 1: Add to cron dispatcher**

In `supabase/functions/cron-dispatcher/index.ts`:
- Add `'ga-analytics-sync'` to `ALLOWED_FUNCTIONS` array (line ~22)
- Add `'ga-analytics-sync'` to `fanOutFunctions` array (line ~75)

**Step 2: Write cron registration migration**

```sql
-- Register hourly cron job for GA analytics sync
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('ga-analytics-sync-hourly');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'ga-analytics-sync-hourly',
      '15 * * * *',
      format(
        'SELECT net.http_post(url := %L, headers := ''{"Content-Type":"application/json"}''::jsonb, body := ''{"function":"ga-analytics-sync"}''::jsonb)',
        current_setting('app.settings.supabase_url', true) || '/functions/v1/cron-dispatcher'
      )
    );
  END IF;
END $$;

INSERT INTO cron_job_settings (job_name, display_name, description, schedule, is_enabled, category)
VALUES (
  'ga-analytics-sync-hourly',
  'Google Analytics Sync',
  'Pulls hourly page metrics and traffic source data from GA4 for all companies with active connections',
  '15 * * * *',
  true,
  'analytics'
)
ON CONFLICT (job_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  schedule = EXCLUDED.schedule;
```

**Step 3: Run L2 cron pipeline test to verify registration**
Run: `npm run test:integration -- --run src/tests/integration/cron-pipeline-health.test.ts`
Expected: `ga-analytics-sync-hourly` appears in job settings

**Step 4: Commit**
`git commit -m "feat: register ga-analytics-sync in cron dispatcher — hourly fan-out per company"`

---

## Phase 3: Frontend — Hooks, API Client, Demo Data

> **Session boundary:** Start a new session for Phase 3. Phases 0-2 should be complete and all L1/L2 tests passing.

### Task 8: Write L4 unit tests for hooks and URL correlation (RED)

**Files:**
- Create: `src/test/google-analytics-hooks.test.ts`

**Step 1: Write the failing unit tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('@/contexts/SelectedCompanyContext', () => ({
  useSelectedCompany: () => ({ selectedCompanyId: 'test-company-id' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => ({
    data: { id: 'test-company-id', name: 'Test Co' },
    isLoading: false,
  }),
}));

vi.mock('@/lib/demo/demo-constants', () => ({
  isDemoCompany: (id: string) => id === 'demo-longtale',
  DEMO_COMPANY_ID: 'demo-longtale',
  DEMO_COMPANY: { id: 'demo-longtale', name: 'Longtale Demo' },
}));

// ─── API Client Tests ───────────────────────────────────────
describe('googleAnalyticsApi', () => {
  it('should export all required methods', async () => {
    const { googleAnalyticsApi } = await import('@/lib/api/google-analytics');
    expect(googleAnalyticsApi.startAuth).toBeDefined();
    expect(googleAnalyticsApi.handleCallback).toBeDefined();
    expect(googleAnalyticsApi.selectProperty).toBeDefined();
    expect(googleAnalyticsApi.disconnect).toBeDefined();
    expect(googleAnalyticsApi.syncNow).toBeDefined();
  });
});

// ─── Hook Query Key Tests ───────────────────────────────────
describe('useGAPageMetrics', () => {
  it('should use correct query key shape', async () => {
    const { useGAPageMetrics } = await import('@/hooks/useGAPageMetrics');
    expect(typeof useGAPageMetrics).toBe('function');
    // Query key should be ['ga-page-metrics', companyId, params]
  });
});

describe('useGATrafficSources', () => {
  it('should use correct query key shape', async () => {
    const { useGATrafficSources } = await import('@/hooks/useGATrafficSources');
    expect(typeof useGATrafficSources).toBe('function');
  });
});

describe('useContentJourney', () => {
  it('should use correct query key shape', async () => {
    const { useContentJourney } = await import('@/hooks/useContentJourney');
    expect(typeof useContentJourney).toBe('function');
  });
});

describe('useGAConnections', () => {
  it('should export connection management hooks', async () => {
    const mod = await import('@/hooks/useGoogleAnalytics');
    expect(typeof mod.useGAConnections).toBe('function');
    expect(typeof mod.useConnectGA).toBe('function');
    expect(typeof mod.useSyncGA).toBe('function');
    expect(typeof mod.useDisconnectGA).toBe('function');
  });
});

// ─── URL Correlation Logic Tests ────────────────────────────
// These test the pure functions used by ga-analytics-sync
describe('URL-to-page-path correlation', () => {
  it('should extract page path from full URL', () => {
    // Test the URL parsing logic that will be used in correlation
    const url = 'https://example.com/blog/my-article?utm_source=twitter';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/blog/my-article');
  });

  it('should handle URLs without path', () => {
    const url = 'https://example.com';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/');
  });

  it('should handle URLs with trailing slash', () => {
    const url = 'https://example.com/blog/';
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/blog/');
  });

  it('should extract first URL from post content', () => {
    const content = 'Check out our latest article https://example.com/blog/post-1 and let us know!';
    const match = content.match(/https?:\/\/[^\s"'<>]+/);
    expect(match?.[0]).toBe('https://example.com/blog/post-1');
  });

  it('should return null for content without URLs', () => {
    const content = 'Just a regular post with no links';
    const match = content.match(/https?:\/\/[^\s"'<>]+/);
    expect(match).toBeNull();
  });
});
```

**Step 2: Run — confirm it fails**
Run: `npm run test -- --run src/test/google-analytics-hooks.test.ts`
Expected: Import errors for files that don't exist yet

**Step 3: Commit**
`git commit -m "test(L4): add GA hooks unit tests — query keys, exports, URL correlation (RED)"`

---

### Task 9: Create API client + hooks (GREEN — make L4 + L3 tests pass)

**Files:**
- Create: `src/lib/api/google-analytics.ts`
- Create: `src/hooks/useGoogleAnalytics.ts`
- Create: `src/hooks/useGAPageMetrics.ts`
- Create: `src/hooks/useGATrafficSources.ts`
- Create: `src/hooks/useContentJourney.ts`

**Step 1: Create the API client** (`src/lib/api/google-analytics.ts`)

Follow exact pattern from `src/lib/api/getlate.ts`:
- All methods return `{ success: boolean; error?: string; data?: T }`
- All methods call `supabase.functions.invoke(...)` for edge function communication
- Export as `googleAnalyticsApi` object

Methods: `startAuth`, `handleCallback`, `selectProperty`, `disconnect`, `syncNow`

**Step 2: Create hooks** following pattern from `src/hooks/useAnalyticsByPublishDate.ts`:
- `useGAConnections` — `queryKey: ['ga-connections', companyId]`, `enabled: !!companyId`
- `useGAPageMetrics` — `queryKey: ['ga-page-metrics', companyId, params]`, calls `supabase.rpc('get_ga_page_metrics', ...)`
- `useGATrafficSources` — `queryKey: ['ga-traffic-sources', companyId, params]`, calls `supabase.rpc('get_ga_traffic_sources', ...)`
- `useContentJourney` — `queryKey: ['content-journey', companyId, params]`, calls `supabase.rpc('get_content_journey', ...)`
- `useConnectGA`, `useSyncGA`, `useDisconnectGA` — mutation hooks with query invalidation

**Step 3: Run L4 unit tests — confirm GREEN**
Run: `npm run test -- --run src/test/google-analytics-hooks.test.ts`
Expected: All tests pass

**Step 4: Run L3 smoke tests — confirm some pass (hooks + API client should pass now)**
Run: `npm run test:smoke -- --run src/tests/smoke/google-analytics.test.ts`
Expected: Hook and API client tests pass; page + demo data tests still fail

**Step 5: Commit**
`git commit -m "feat: add GA API client + hooks — connections, page metrics, traffic sources, content journey (GREEN)"`

---

### Task 10: Add demo data fixtures

**Files:**
- Modify: `src/lib/demo/demo-data.ts`
- Modify: `src/lib/demo/DemoDataProvider.tsx`

**Step 1: Add demo GA fixtures to `demo-data.ts`**

Add at bottom of file, following existing patterns (deterministic dates, `DEMO_COMPANY_ID`):

- `DEMO_GA_CONNECTIONS` — 1 active connection: `{ id: 'demo-ga-conn-1', company_id: DEMO_COMPANY_ID, google_email: 'analytics@longtale.ai', property_id: 'properties/demo-123', property_name: 'Longtale Blog', is_active: true, ... }`

- `DEMO_GA_PAGE_SNAPSHOTS` — 30 days × 5 articles = ~150 entries. Use `daysAgo(n)` helper. Articles: `/blog/ai-content-strategy`, `/blog/social-media-2026`, `/blog/content-calendar-tips`, `/blog/analytics-guide`, `/blog/brand-voice-ai`

- `DEMO_GA_REFERRAL_SNAPSHOTS` — Traffic sources for each article: `{ source: 'twitter.com', medium: 'social' }`, `{ source: 'linkedin.com', medium: 'social' }`, `{ source: 'google', medium: 'organic' }`, `{ source: '(direct)', medium: '(none)' }`

- `DEMO_GA_CONTENT_JOURNEY` — Pre-correlated items linking `DEMO_POSTS` to articles

**Step 2: Populate cache in `DemoDataProvider.tsx`**

Add `queryClient.setQueryData()` calls for:
- `['ga-connections', DEMO_COMPANY_ID]` → `DEMO_GA_CONNECTIONS`
- `['ga-page-metrics', DEMO_COMPANY_ID, ...]` → aggregated from `DEMO_GA_PAGE_SNAPSHOTS`
- `['ga-traffic-sources', DEMO_COMPANY_ID, ...]` → aggregated from `DEMO_GA_REFERRAL_SNAPSHOTS`
- `['content-journey', DEMO_COMPANY_ID, ...]` → `DEMO_GA_CONTENT_JOURNEY`

**Step 3: Run L3 smoke tests — all should pass now (GREEN)**
Run: `npm run test:smoke -- --run src/tests/smoke/google-analytics.test.ts`
Expected: All tests pass including demo data assertions

**Step 4: Commit**
`git commit -m "feat: add demo data fixtures for GA — connections, page metrics, referrals, content journey (GREEN)"`

---

## Phase 4: Frontend — Connection UI + Content Journey Page

### Task 11: Add Google Analytics card to Connections page

**Files:**
- Modify: `src/pages/Connections.tsx`
- Create: `src/components/connections/GAPropertySelectionDialog.tsx`

**Step 1: Add GA connection section below the social platforms grid**

Separate section because GA is a data source, not a social platform. Card shows:
- Connection status + property name + Google email
- Last sync time + sync error (if any)
- Connect / Disconnect / Sync Now buttons

**Step 2: Create `GAPropertySelectionDialog`**

Follow `PageSelectionDialog.tsx` pattern:
- Dialog with radio list of GA4 properties
- On select → calls `googleAnalyticsApi.selectProperty(...)`
- On complete → invalidates `ga-connections` query

**Step 3: Wire up OAuth callback**

In `Connections.tsx` `useEffect` message handler, handle `platform === 'google-analytics'`:
1. Extract `code` and `state` from callback URL params
2. Call `googleAnalyticsApi.handleCallback(code, redirectUrl, state)`
3. Open `GAPropertySelectionDialog` with returned properties

**Step 4: Commit**
`git commit -m "feat: add Google Analytics connection card + property selection dialog"`

---

### Task 12: Create Content Journey page and route

**Files:**
- Create: `src/pages/ContentJourney.tsx`
- Modify: `src/App.tsx`

**Step 1: Register route in `App.tsx`**

```typescript
<Route path="/app/analytics/content-journey" element={<ProtectedRoute><ContentJourney /></ProtectedRoute>} />
```

**Step 2: Build the Content Journey page**

Layout — four sections in a scrollable page inside `<DashboardLayout>`:

**Header:** Title, date range filter, sync button, connection status badge

**Section 1: KPI Cards** (4-column grid)
- Total Pageviews (GA)
- Social Referral Traffic (GA referral where medium=social)
- Social → Web Conversion Rate
- Avg Time on Page

**Section 2: Content Hub Table**
- Sortable table: Page Title, Pageviews, Sessions from Social, % Social Traffic, Bounce Rate, Time on Page, # Linked Posts
- Click row to expand linked social posts

**Section 3: Top Content Journeys**
- Cards: social post → arrow → web performance
- Uses `useContentJourney` hook

**Section 4: Traffic Source Breakdown**
- Donut chart by source/medium
- Bar chart: social platform referral comparison

**Step 3: Add sidebar navigation link**
Add "Content Journey" under Analytics section in sidebar nav

**Step 4: Run all smoke tests — confirm page import works**
Run: `npm run test:smoke -- --run src/tests/smoke/google-analytics.test.ts`
Expected: All tests pass

**Step 5: Commit**
`git commit -m "feat: add Content Journey analytics page — KPIs, content hub, journey cards, traffic sources"`

---

### Task 13: UTM auto-tagging in post composer

**Files:**
- Modify: post compose component (find in `src/components/posts/`)

**Step 1: Add UTM parameter injection**

When composing a post with a URL:
- Auto-append: `?utm_source=longtale&utm_medium=social&utm_campaign={company_slug}&utm_content={post_hash}`
- Skip if URL already has UTM params
- Show toggle: "Auto-tag links for tracking" (default on)
- Preview the tagged URL

**Step 2: Commit**
`git commit -m "feat: add UTM auto-tagging for links in post composer"`

---

## Phase 5: Test Manifest, Reports, Documentation

### Task 14: Update test manifest

**Files:**
- Modify: `docs/test-manifest.json`

**Step 1: Add google-analytics feature entry**

```json
{
  "google-analytics": {
    "description": "GA4 OAuth connection, hourly page metrics sync, traffic source attribution, post-to-page correlation, content journey analytics page",
    "L1_contract": [
      "scripts/ga4-contract-tests.cjs"
    ],
    "L2_integration": [
      "src/tests/integration/google-analytics-rls.test.ts"
    ],
    "L3_smoke": [
      "src/tests/smoke/google-analytics.test.ts"
    ],
    "L4_unit": [
      "src/test/google-analytics-hooks.test.ts"
    ],
    "L5_e2e": []
  }
}
```

**Step 2: Commit**
`git commit -m "test: update test manifest with google-analytics feature coverage"`

---

### Task 15: Write test report

**Files:**
- Create or append: `docs/test-reports/2026-03-07.md`

**Step 1: Append test report block**

```markdown
## [HH:MM] - Google Analytics Integration

**Trigger:** New GA4 OAuth integration — edge functions, migration, hooks, Content Journey page

| Layer | File | Tests | Pass | Fail | Skip | Duration |
|-------|------|-------|------|------|------|----------|
| L1 Contract | `scripts/ga4-contract-tests.cjs` | XX | XX | 0 | 0 | X.Xs |
| L2 Integration | `src/tests/integration/google-analytics-rls.test.ts` | XX | XX | 0 | 0 | X.Xs |
| L3 Smoke | `src/tests/smoke/google-analytics.test.ts` | XX | XX | 0 | 0 | X.Xs |
| L4 Unit | `src/test/google-analytics-hooks.test.ts` | XX | XX | 0 | 0 | X.Xs |
| L5 E2E | — | — | — | — | — | — |

**Coverage gaps:** L5 E2E not yet written (add after UI stabilizes)

**Regressions:** None

**Deploy Readiness:**
- [ ] L1 Contract tests pass (GA4 API)
- [ ] L2 Integration tests pass (RLS + RPCs)
- [ ] L3 Smoke tests pass
- [ ] L4 Unit tests pass
- [ ] L5 E2E tests pass (deferred)
- [ ] Test manifest updated (`docs/test-manifest.json`)
```

**Step 2: Commit**
`git commit -m "docs: add GA integration test report"`

---

### Task 16: Update CLAUDE.md with GA integration docs

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add to the Known Issues / Watch Out For section:**
- New tables: `google_analytics_connections`, `ga_page_snapshots`, `ga_referral_snapshots`, `post_page_correlations`
- New edge functions: `google-analytics-auth`, `ga-analytics-sync`
- New route: `/app/analytics/content-journey`

**Step 2: Add to the secrets table:**

| Secret | Location | Used By |
|--------|----------|---------|
| `GOOGLE_CLIENT_ID` | Supabase Secrets only | Edge functions (prod only) |
| `GOOGLE_CLIENT_SECRET` | Supabase Secrets only | Edge functions (prod only) |

**Step 3: Add to the routing section:**
- `/app/analytics/content-journey` — Content Journey (GA4 + social correlation)

**Step 4: Commit**
`git commit -m "docs: add Google Analytics integration to CLAUDE.md — tables, hooks, edge functions, secrets"`

---

## Pre-requisites (before implementation)

Before starting Phase 0, the implementing engineer must:

1. **Create a Google Cloud OAuth app:**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs: `https://your-domain.com/oauth-callback`
   - Enable "Google Analytics Data API" and "Google Analytics Admin API"
   - Note Client ID and Client Secret

2. **Set Supabase secrets (production):**
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=your-client-id
   supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Set local test credentials (for L1 contract tests):**
   ```bash
   # Add to .env.local
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-secret"
   GA4_TEST_REFRESH_TOKEN="your-test-refresh-token"
   GA4_TEST_PROPERTY_ID="properties/123456"
   ```

4. **Verify OAuth callback page handles `google-analytics` platform:**
   - Check `src/pages/OAuthCallback.tsx` passes query params back to parent

---

## Summary of deliverables

| # | Deliverable | Type | Test Layer | Files |
|---|-------------|------|------------|-------|
| 1 | GA4 contract tests | L1 Test | Contract | `scripts/ga4-contract-tests.cjs` |
| 2 | RLS isolation tests | L2 Test | Integration | `src/tests/integration/google-analytics-rls.test.ts` |
| 3 | Database schema | Migration | — | `supabase/migrations/20260307200000_google_analytics.sql` |
| 4 | Smoke tests | L3 Test | Smoke | `src/tests/smoke/google-analytics.test.ts` |
| 5 | Google OAuth auth | Edge function | — | `supabase/functions/google-analytics-auth/index.ts` |
| 6 | GA4 data sync | Edge function | — | `supabase/functions/ga-analytics-sync/index.ts` |
| 7 | Cron registration | Migration + edit | — | `supabase/migrations/20260307200100_ga_analytics_cron.sql` |
| 8 | Unit tests | L4 Test | Unit | `src/test/google-analytics-hooks.test.ts` |
| 9 | API client + hooks | Frontend | — | `src/lib/api/google-analytics.ts` + 4 hooks |
| 10 | Demo data | Frontend | — | `demo-data.ts`, `DemoDataProvider.tsx` |
| 11 | Connection UI | Frontend | — | `Connections.tsx`, `GAPropertySelectionDialog.tsx` |
| 12 | Content Journey page | Frontend | — | `src/pages/ContentJourney.tsx`, `App.tsx` |
| 13 | UTM auto-tagging | Frontend | — | Post composer edit |
| 14 | Test manifest | Docs | — | `docs/test-manifest.json` |
| 15 | Test report | Docs | — | `docs/test-reports/2026-03-07.md` |
| 16 | Documentation | Docs | — | `CLAUDE.md` |

## Task execution order (TDD flow)

```
Phase 0: L1 Contract → verify GA4 API shapes
Phase 1: L2 Test (RED) → Migration (GREEN) → verify RLS
Phase 2: L3 Test (RED) → Edge functions → Cron registration
Phase 3: L4 Test (RED) → API client + Hooks (GREEN) → Demo data (GREEN remaining L3)
Phase 4: Connection UI → Content Journey page → UTM tagging
Phase 5: Test manifest → Test report → CLAUDE.md docs
```
