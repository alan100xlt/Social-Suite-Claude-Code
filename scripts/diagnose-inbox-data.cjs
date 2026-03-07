const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/GETLATE_API_KEY="([^"]+)"/)?.[1] || env.match(/GETLATE_API_KEY=([^\n\r]+)/)?.[1];
if (!key) { console.error('No GETLATE_API_KEY found in .env.local'); process.exit(1); }

const PROFILE_ID = '697477edd03157093066ed65';
const BASE = 'https://getlate.dev/api/v1';

async function api(path) {
  const url = `${BASE}${path}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('=== GetLate Inbox Data Diagnosis ===\n');

  // 1. List conversations (DMs) - check pagination
  console.log('1. CONVERSATIONS (DMs):');
  let totalConvs = 0;
  let cursor = null;
  let page = 0;
  do {
    page++;
    const params = `profileId=${PROFILE_ID}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const result = await api(`/inbox/conversations?${params}`);
    if (!result.ok) {
      console.log(`   ERROR: ${result.status}`, JSON.stringify(result.data).slice(0, 300));
      break;
    }
    const items = result.data?.data || [];
    totalConvs += items.length;
    cursor = result.data?.pagination?.nextCursor;
    const hasMore = result.data?.pagination?.hasMore;
    console.log(`   Page ${page}: ${items.length} items, hasMore=${hasMore}, cursor=${cursor || 'null'}`);

    // Show meta info on first page
    if (page === 1) {
      console.log(`   Meta: accountsQueried=${result.data?.meta?.accountsQueried}, accountsFailed=${result.data?.meta?.accountsFailed}`);
      if (result.data?.meta?.failedAccounts?.length > 0) {
        console.log('   Failed accounts:', JSON.stringify(result.data.meta.failedAccounts));
      }
      // Show platforms breakdown
      const platforms = {};
      items.forEach(c => { platforms[c.platform] = (platforms[c.platform] || 0) + 1; });
      console.log('   Platforms:', platforms);
    }
    if (!hasMore) break;
  } while (cursor && page < 20);
  console.log(`   TOTAL DM conversations: ${totalConvs}\n`);

  // 2. List conversations with status=archived
  console.log('2. ARCHIVED CONVERSATIONS:');
  const archived = await api(`/inbox/conversations?profileId=${PROFILE_ID}&status=archived&limit=100`);
  if (archived.ok) {
    const items = archived.data?.data || [];
    console.log(`   Archived count: ${items.length}, hasMore: ${archived.data?.pagination?.hasMore}`);
  } else {
    console.log(`   ERROR: ${archived.status}`);
  }

  // 3. List comments - check all posts with comments
  console.log('\n3. COMMENTS (posts with comments):');
  let totalPosts = 0;
  let totalComments = 0;
  cursor = null;
  page = 0;
  do {
    page++;
    const params = `profileId=${PROFILE_ID}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const result = await api(`/inbox/comments?${params}`);
    if (!result.ok) {
      console.log(`   ERROR: ${result.status}`, JSON.stringify(result.data).slice(0, 300));
      break;
    }
    const items = result.data?.data || [];
    totalPosts += items.length;
    items.forEach(p => { totalComments += (p.commentCount || 0); });
    cursor = result.data?.pagination?.nextCursor;
    const hasMore = result.data?.pagination?.hasMore;
    console.log(`   Page ${page}: ${items.length} posts, hasMore=${hasMore}`);

    if (page === 1) {
      console.log(`   Meta: accountsQueried=${result.data?.meta?.accountsQueried}, accountsFailed=${result.data?.meta?.accountsFailed}`);
      if (result.data?.meta?.failedAccounts?.length > 0) {
        console.log('   Failed accounts:', JSON.stringify(result.data.meta.failedAccounts));
      }
      const platforms = {};
      items.forEach(p => { platforms[p.platform] = (platforms[p.platform] || 0) + 1; });
      console.log('   Platforms:', platforms);
      // Show top 5 posts with most comments
      const withComments = items.filter(p => p.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount);
      console.log(`   Posts with comments > 0: ${withComments.length}`);
      withComments.slice(0, 5).forEach(p => {
        console.log(`     - ${p.platform} "${(p.content || '').slice(0, 60)}..." comments=${p.commentCount}`);
      });
    }
    if (!hasMore) break;
  } while (cursor && page < 20);
  console.log(`   TOTAL posts: ${totalPosts}, TOTAL comments across all: ${totalComments}\n`);

  // 4. Try comments with minComments=0 (maybe the filter is excluding?)
  console.log('4. COMMENTS with minComments=0:');
  const commentsMin0 = await api(`/inbox/comments?profileId=${PROFILE_ID}&minComments=0&limit=100`);
  if (commentsMin0.ok) {
    const items = commentsMin0.data?.data || [];
    const withComments = items.filter(p => p.commentCount > 0);
    console.log(`   Total posts: ${items.length}, with comments>0: ${withComments.length}`);
  }

  // 5. Try comments sorted by comments count
  console.log('\n5. COMMENTS sorted by comment count (desc):');
  const commentsSorted = await api(`/inbox/comments?profileId=${PROFILE_ID}&sortBy=comments&sortOrder=desc&limit=10`);
  if (commentsSorted.ok) {
    const items = commentsSorted.data?.data || [];
    items.forEach(p => {
      console.log(`   - ${p.platform} [${p.accountUsername}] comments=${p.commentCount} "${(p.content || '').slice(0, 50)}..."`);
    });
  }

  // 6. Fetch actual comments for a post that has commentCount > 0
  console.log('\n6. FETCHING ACTUAL COMMENTS for posts with commentCount > 0:');
  const allPosts = commentsMin0.ok ? (commentsMin0.data?.data || []) : [];
  const postsWithComments = allPosts.filter(p => p.commentCount > 0).slice(0, 3);
  for (const post of postsWithComments) {
    const comments = await api(`/inbox/comments/${post.id}?accountId=${post.accountId}`);
    if (comments.ok) {
      const items = comments.data?.data || comments.data?.comments || [];
      console.log(`   Post "${(post.content || '').slice(0, 40)}..." (${post.platform}): ${items.length} comments fetched`);
    } else {
      console.log(`   Post ${post.id} ERROR: ${comments.status}`, JSON.stringify(comments.data).slice(0, 200));
    }
  }

  // 7. List reviews
  console.log('\n7. REVIEWS:');
  const reviews = await api(`/inbox/reviews?profileId=${PROFILE_ID}&limit=50`);
  if (reviews.ok) {
    const items = reviews.data?.data || [];
    console.log(`   Reviews count: ${items.length}, hasMore: ${reviews.data?.pagination?.hasMore}`);
    console.log(`   Summary: ${JSON.stringify(reviews.data?.summary)}`);
    console.log(`   Meta: accountsQueried=${reviews.data?.meta?.accountsQueried}, accountsFailed=${reviews.data?.meta?.accountsFailed}`);
    if (reviews.data?.meta?.failedAccounts?.length > 0) {
      console.log('   Failed accounts:', JSON.stringify(reviews.data.meta.failedAccounts));
    }
    items.slice(0, 5).forEach(r => {
      console.log(`   - ${r.platform} [${r.accountUsername}] rating=${r.rating} "${(r.text || '').slice(0, 60)}..." by ${r.reviewer?.name}`);
    });
  } else {
    console.log(`   ERROR: ${reviews.status}`, JSON.stringify(reviews.data).slice(0, 300));
  }

  // 8. Check per-account - maybe YouTube has different data
  console.log('\n8. PER-ACCOUNT CHECK:');
  const accounts = await api(`/accounts?profileId=${PROFILE_ID}`);
  if (accounts.ok) {
    const list = accounts.data?.data || accounts.data?.accounts || (Array.isArray(accounts.data) ? accounts.data : []);
    for (const acc of list) {
      const id = acc._id || acc.id;
      const name = acc.username || acc.name || id;
      const platform = acc.platform || acc.type || '?';
      console.log(`\n   Account: ${platform} - ${name} (${id})`);

      // Check DMs for this account
      const dms = await api(`/inbox/conversations?accountId=${id}&limit=5`);
      if (dms.ok) {
        console.log(`     DMs: ${(dms.data?.data || []).length} (hasMore: ${dms.data?.pagination?.hasMore})`);
      }

      // Check comments for this account
      const cmts = await api(`/inbox/comments?accountId=${id}&limit=5`);
      if (cmts.ok) {
        const items = cmts.data?.data || [];
        const withCmts = items.filter(p => p.commentCount > 0);
        console.log(`     Comments: ${items.length} posts, ${withCmts.length} with comments>0`);
      }
    }
  }
}

main().catch(console.error);
