const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/GETLATE_API_KEY="([^"]+)"/)?.[1] || env.match(/GETLATE_API_KEY=([^\n\r]+)/)?.[1];
if (!key) { console.error('No GETLATE_API_KEY found'); process.exit(1); }

const PROFILE_ID = '697477edd03157093066ed65';
const FB_ACCOUNT = '6994d1b48ab8ae478b33f8aa';
const YT_ACCOUNT = '699119a4fd3d49fbfa3f94ba';
const BASE = 'https://getlate.dev/api/v1';

async function api(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  return { status: res.status, ok: res.ok, data: await res.json().catch(() => null) };
}

async function main() {
  console.log('=== Deep Inbox Investigation ===\n');

  // 1. Check if older FB posts have comments - use 'since' param with old date
  console.log('1. FB COMMENTS with since=2020-01-01 (deep history):');
  const oldComments = await api(`/inbox/comments?accountId=${FB_ACCOUNT}&since=2020-01-01T00:00:00Z&limit=100&sortBy=comments&sortOrder=desc`);
  if (oldComments.ok) {
    const items = oldComments.data?.data || [];
    const withComments = items.filter(p => p.commentCount > 0);
    console.log(`   Posts returned: ${items.length}, hasMore: ${oldComments.data?.pagination?.hasMore}`);
    console.log(`   Posts with comments > 0: ${withComments.length}`);
    withComments.forEach(p => {
      console.log(`     - comments=${p.commentCount} "${(p.content || '').slice(0, 60)}..." (${p.createdTime})`);
    });
    if (items.length > 0) {
      const oldest = items.reduce((a, b) => new Date(a.createdTime) < new Date(b.createdTime) ? a : b);
      const newest = items.reduce((a, b) => new Date(a.createdTime) > new Date(b.createdTime) ? a : b);
      console.log(`   Date range: ${oldest.createdTime} → ${newest.createdTime}`);
    }
  }

  // 2. Paginate through ALL comment pages
  console.log('\n2. PAGINATE ALL FB COMMENT PAGES:');
  let cursor = null;
  let page = 0;
  let totalPosts = 0;
  let totalWithComments = 0;
  do {
    page++;
    const params = `accountId=${FB_ACCOUNT}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const result = await api(`/inbox/comments?${params}`);
    if (!result.ok) { console.log(`   ERROR: ${result.status}`); break; }
    const items = result.data?.data || [];
    totalPosts += items.length;
    totalWithComments += items.filter(p => p.commentCount > 0).length;
    cursor = result.data?.pagination?.nextCursor;
    const hasMore = result.data?.pagination?.hasMore;
    console.log(`   Page ${page}: ${items.length} posts, withComments=${items.filter(p => p.commentCount > 0).length}, hasMore=${hasMore}`);
    if (!hasMore || items.length === 0) break;
  } while (page < 50);
  console.log(`   FB TOTAL: ${totalPosts} posts, ${totalWithComments} with comments\n`);

  // 3. Same for YouTube
  console.log('3. PAGINATE ALL YT COMMENT PAGES:');
  cursor = null;
  page = 0;
  totalPosts = 0;
  totalWithComments = 0;
  do {
    page++;
    const params = `accountId=${YT_ACCOUNT}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const result = await api(`/inbox/comments?${params}`);
    if (!result.ok) { console.log(`   ERROR: ${result.status}`); break; }
    const items = result.data?.data || [];
    totalPosts += items.length;
    totalWithComments += items.filter(p => p.commentCount > 0).length;
    cursor = result.data?.pagination?.nextCursor;
    const hasMore = result.data?.pagination?.hasMore;
    console.log(`   Page ${page}: ${items.length} posts, withComments=${items.filter(p => p.commentCount > 0).length}, hasMore=${hasMore}`);
    if (!hasMore || items.length === 0) break;
  } while (page < 50);
  console.log(`   YT TOTAL: ${totalPosts} posts, ${totalWithComments} with comments\n`);

  // 4. Check DM pagination exhaustively
  console.log('4. PAGINATE ALL DM PAGES:');
  cursor = null;
  page = 0;
  let totalDMs = 0;
  do {
    page++;
    const params = `accountId=${FB_ACCOUNT}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const result = await api(`/inbox/conversations?${params}`);
    if (!result.ok) { console.log(`   ERROR: ${result.status}`); break; }
    const items = result.data?.data || [];
    totalDMs += items.length;
    cursor = result.data?.pagination?.nextCursor;
    const hasMore = result.data?.pagination?.hasMore;
    console.log(`   Page ${page}: ${items.length} conversations, hasMore=${hasMore}, cursor=${cursor ? cursor.slice(0, 20) + '...' : 'null'}`);
    if (page === 1 && items.length > 0) {
      const oldest = items.reduce((a, b) => new Date(a.updatedTime) < new Date(b.updatedTime) ? a : b);
      const newest = items.reduce((a, b) => new Date(a.updatedTime) > new Date(b.updatedTime) ? a : b);
      console.log(`   Date range: ${oldest.updatedTime} → ${newest.updatedTime}`);
    }
    if (!hasMore || items.length === 0) break;
  } while (page < 50);
  console.log(`   TOTAL DM conversations: ${totalDMs}\n`);

  // 5. Check the GetLate plan/pricing - maybe inbox is limited by plan
  console.log('5. PLAN & USAGE:');
  const usage = await api('/usage');
  if (usage.ok) {
    console.log('   Usage:', JSON.stringify(usage.data, null, 2).slice(0, 1000));
  } else {
    console.log(`   Usage ERROR: ${usage.status}`, JSON.stringify(usage.data).slice(0, 200));
  }

  // 6. Check if there's a way to fetch all historical DMs
  console.log('\n6. DM conversations with sortOrder=asc (oldest first):');
  const oldestDMs = await api(`/inbox/conversations?accountId=${FB_ACCOUNT}&limit=100&sortOrder=asc`);
  if (oldestDMs.ok) {
    const items = oldestDMs.data?.data || [];
    console.log(`   Count: ${items.length}, hasMore: ${oldestDMs.data?.pagination?.hasMore}`);
    if (items.length > 0) {
      console.log(`   Oldest: ${items[0].participantName} - ${items[0].updatedTime}`);
      console.log(`   Newest: ${items[items.length - 1].participantName} - ${items[items.length - 1].updatedTime}`);
    }
  }
}

main().catch(console.error);
