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
 * Run: node scripts/ga4-contract-tests.cjs [--section <name>]
 * Dry run: node scripts/ga4-contract-tests.cjs --dry-run
 *
 * Sections: token, summaries, page-metrics, traffic-sources, userinfo, all (default)
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch {
  console.error('Missing .env.local file');
  process.exit(1);
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}="([^"]+)"`));
  return match?.[1] || null;
};

const CLIENT_ID = getEnv('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET');
const REFRESH_TOKEN = getEnv('GA4_TEST_REFRESH_TOKEN');
const PROPERTY_ID = getEnv('GA4_TEST_PROPERTY_ID');

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
const sectionArg = args.indexOf('--section') !== -1 ? args[args.indexOf('--section') + 1] : 'all';
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

function shouldRun(section) {
  return sectionArg === 'all' || sectionArg === section;
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

  return await response.json();
}

// ─── Section: Token Refresh ──────────────────────────────────
async function testTokenRefresh() {
  if (!shouldRun('token')) return null;
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
  if (!shouldRun('summaries')) return;
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
  if (!shouldRun('page-metrics')) return;
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
  if (!shouldRun('traffic-sources')) return;
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
      sampleRow: { source, medium, campaign },
    };
  } else {
    recordSkip('Traffic source row checks', 'No rows returned');
  }
}

// ─── Section: OAuth Scopes ───────────────────────────────────
async function testUserInfo(accessToken) {
  if (!shouldRun('userinfo')) return;
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
  console.log(`Section: ${sectionArg}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('═'.repeat(60));

  try {
    const accessToken = await testTokenRefresh();
    if (!accessToken) {
      // Token section skipped, get a token anyway for other sections
      const tokenData = await getAccessToken();
      await testAccountSummaries(tokenData.access_token);
      await testRunReportPageMetrics(tokenData.access_token);
      await testRunReportTrafficSources(tokenData.access_token);
      await testUserInfo(tokenData.access_token);
    } else {
      await testAccountSummaries(accessToken);
      await testRunReportPageMetrics(accessToken);
      await testRunReportTrafficSources(accessToken);
      await testUserInfo(accessToken);
    }
  } catch (err) {
    console.error('\nFATAL:', err.message);
    failed++;
  }

  // ─── Summary ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  // Write contracts to file for reference by unit tests
  if (Object.keys(contracts).length > 0) {
    const contractsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });
    const contractsPath = path.join(contractsDir, 'ga4-api-contracts.json');
    fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
    console.log(`Contracts written to: ${contractsPath}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
