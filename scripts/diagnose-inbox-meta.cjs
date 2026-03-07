const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/GETLATE_API_KEY="([^"]+)"/)?.[1] || env.match(/GETLATE_API_KEY=([^\n\r]+)/)?.[1];
if (!key) { console.error('No GETLATE_API_KEY found'); process.exit(1); }

const PROFILE_ID = '697477edd03157093066ed65';
const FB_ACCOUNT = '6994d1b48ab8ae478b33f8aa';
const YT_ACCOUNT = '699119a4fd3d49fbfa3f94ba';
const BASE = 'https://getlate.dev/api/v1';

async function api(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...opts.headers },
  });
  return { status: res.status, ok: res.ok, data: await res.json().catch(() => null), headers: Object.fromEntries(res.headers) };
}

async function main() {
  console.log('=== GetLate Meta Investigation ===\n');

  // 1. Check our GetLate plan/usage
  console.log('1. PLAN & USAGE:');
  const usage = await api('/usage');
  console.log(`   Status: ${usage.status}`);
  if (usage.ok) {
    console.log('   Data:', JSON.stringify(usage.data, null, 2).slice(0, 1000));
  } else {
    console.log('   Error:', JSON.stringify(usage.data).slice(0, 300));
  }

  // 2. Check account details
  console.log('\n2. ACCOUNT DETAILS:');
  for (const accId of [FB_ACCOUNT, YT_ACCOUNT]) {
    const acc = await api(`/accounts/${accId}`);
    console.log(`\n   Account ${accId}:`);
    console.log(`   Status: ${acc.status}`);
    if (acc.ok) {
      const d = acc.data;
      console.log(`   Platform: ${d.platform}`);
      console.log(`   Username: ${d.username || d.displayName}`);
      console.log(`   Is Active: ${d.isActive}`);
      console.log(`   Has Analytics: ${d.hasAnalyticsAccess}`);
      console.log(`   Connected at: ${d.createdAt || d.connectedAt}`);
      // Check for any inbox-related fields
      const keys = Object.keys(d);
      console.log(`   All fields: ${keys.join(', ')}`);
    }
  }

  // 3. Check if meta.failedAccounts is populated
  console.log('\n3. META.FAILED ACCOUNTS (from conversation list):');
  const convs = await api(`/inbox/conversations?profileId=${PROFILE_ID}&limit=1`);
  if (convs.ok) {
    console.log(`   accountsQueried: ${convs.data?.meta?.accountsQueried}`);
    console.log(`   accountsFailed: ${convs.data?.meta?.accountsFailed}`);
    if (convs.data?.meta?.failedAccounts?.length > 0) {
      console.log('   FAILED:', JSON.stringify(convs.data.meta.failedAccounts, null, 2));
    }
    console.log(`   lastUpdated: ${convs.data?.meta?.lastUpdated}`);
  }

  // 4. Check meta for comments
  console.log('\n4. META.FAILED ACCOUNTS (from comments list):');
  const cmts = await api(`/inbox/comments?profileId=${PROFILE_ID}&limit=1`);
  if (cmts.ok) {
    console.log(`   accountsQueried: ${cmts.data?.meta?.accountsQueried}`);
    console.log(`   accountsFailed: ${cmts.data?.meta?.accountsFailed}`);
    if (cmts.data?.meta?.failedAccounts?.length > 0) {
      console.log('   FAILED:', JSON.stringify(cmts.data.meta.failedAccounts, null, 2));
    }
    console.log(`   lastUpdated: ${cmts.data?.meta?.lastUpdated}`);
  }

  // 5. Check analytics external posts to see if GetLate sees older posts
  console.log('\n5. ANALYTICS (external posts - to verify GetLate sees all posts):');
  const analytics = await api(`/analytics?profileId=${PROFILE_ID}&source=external&limit=10`);
  if (analytics.ok) {
    const posts = analytics.data?.data || analytics.data?.posts || analytics.data?.analytics || [];
    console.log(`   Status: ${analytics.status}, posts returned: ${Array.isArray(posts) ? posts.length : 'N/A'}`);
    if (Array.isArray(posts)) {
      posts.slice(0, 5).forEach(p => {
        console.log(`   - ${p.platform} "${(p.content || p.title || '').slice(0, 50)}..." comments=${p.comments || p.commentCount || '?'} (${p.createdAt || p.created || '?'})`);
      });
    } else {
      console.log('   Response keys:', Object.keys(analytics.data || {}));
      console.log('   Response:', JSON.stringify(analytics.data).slice(0, 500));
    }
  } else {
    console.log(`   ERROR: ${analytics.status}`, JSON.stringify(analytics.data).slice(0, 300));
  }

  // 6. Try fetching older FB comments by passing since parameter with old dates
  console.log('\n6. COMMENTS with various date ranges:');
  for (const since of ['2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z', '2025-06-01T00:00:00Z', '2025-12-01T00:00:00Z']) {
    const result = await api(`/inbox/comments?accountId=${FB_ACCOUNT}&since=${since}&limit=5&sortBy=comments&sortOrder=desc`);
    if (result.ok) {
      const items = result.data?.data || [];
      const withComments = items.filter(p => p.commentCount > 0);
      const oldest = items.length > 0 ? items.reduce((a, b) => a.createdTime < b.createdTime ? a : b).createdTime : 'N/A';
      console.log(`   since=${since.slice(0,10)}: ${items.length} posts, ${withComments.length} with comments, oldest=${oldest}`);
    }
  }

  // 7. Check response headers for rate limits or plan info
  console.log('\n7. RESPONSE HEADERS (from conversations):');
  const headerCheck = await api(`/inbox/conversations?profileId=${PROFILE_ID}&limit=1`);
  const relevantHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-plan', 'x-inbox'];
  for (const [k, v] of Object.entries(headerCheck.headers)) {
    if (k.startsWith('x-') || k === 'retry-after') {
      console.log(`   ${k}: ${v}`);
    }
  }

  // 8. Check if GetLate has an external posts sync endpoint
  console.log('\n8. POSTS (GetLate knows about):');
  const posts = await api(`/posts?profileId=${PROFILE_ID}&limit=10`);
  if (posts.ok) {
    const list = posts.data?.data || posts.data?.posts || [];
    console.log(`   Posts returned: ${Array.isArray(list) ? list.length : 'N/A'}`);
    if (Array.isArray(list)) {
      list.slice(0, 5).forEach(p => {
        console.log(`   - ${p.status} "${(p.content || '').slice(0, 50)}..." platforms=${JSON.stringify(p.platforms?.map(pp => pp.platform))}`);
      });
    }
  } else {
    console.log(`   ERROR: ${posts.status}`);
  }

  // 9. Check external post search
  console.log('\n9. SEARCH EXTERNAL POSTS:');
  const search = await api(`/posts/search?profileId=${PROFILE_ID}&source=external&limit=10`);
  console.log(`   Status: ${search.status}`);
  if (search.ok) {
    console.log('   Data:', JSON.stringify(search.data).slice(0, 500));
  } else {
    console.log('   Error:', JSON.stringify(search.data).slice(0, 300));
  }
}

main().catch(console.error);
