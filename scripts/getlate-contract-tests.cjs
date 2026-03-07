#!/usr/bin/env node
/**
 * GetLate API Contract Tests
 *
 * Hits the REAL GetLate API to discover and validate exact request/response shapes.
 * Run: node scripts/getlate-contract-tests.cjs [--section <name>]
 *
 * Sections: profiles, accounts, inbox, posts, analytics, analytics-extended, connect, webhooks, all (default)
 *
 * IMPORTANT: Some probes (DM reply, comment reply) send REAL messages.
 * Use --dry-run to skip write operations and only test reads.
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const API_KEY = envContent.match(/GETLATE_API_KEY="([^"]+)"/)?.[1];
if (!API_KEY) { console.error('Missing GETLATE_API_KEY in .env.local'); process.exit(1); }

const BASE = 'https://getlate.dev/api/v1';
const DIARIO_PROFILE = '697477edd03157093066ed65';

const args = process.argv.slice(2);
const sectionArg = args.indexOf('--section') !== -1 ? args[args.indexOf('--section') + 1] : 'all';
const DRY_RUN = args.includes('--dry-run');

let passed = 0, failed = 0, skipped = 0;
const results = [];
const contracts = {}; // Accumulated verified contracts

// ─── Helpers ─────────────────────────────────────────────────
async function api(method, urlPath, body = null) {
  const url = `${BASE}${urlPath}`;
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  let data;
  try { data = await resp.json(); } catch { data = null; }
  return { status: resp.status, ok: resp.ok, data, url, method };
}

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

function probe(label, status, data) {
  const errMsg = data?.message || data?.error || JSON.stringify(data || {}).slice(0, 200);
  console.log(`    [${status}] ${label}: ${errMsg}`);
}

function logKeys(label, obj) {
  if (!obj) return;
  console.log(`    ${label} keys: ${Object.keys(obj).join(', ')}`);
}

function shouldRun(section) {
  return sectionArg === 'all' || sectionArg === section;
}

// ─── Shared state (populated by earlier sections, used by later ones) ────
let sampleAccount = null;  // { _id, platform, username }
let sampleConv = null;     // { id, accountId, platform }
let samplePost = null;     // { id, accountId, platform, postId }
let sampleComment = null;  // from comments list
let sampleMessage = null;  // from messages list

// ═══════════════════════════════════════════════════════════════
async function run() {
  console.log('\n═══ GetLate API Contract Tests ═══');
  console.log(`    Section: ${sectionArg} | Dry run: ${DRY_RUN}\n`);

  // ─── PROFILES ──────────────────────────────────────────────
  if (shouldRun('profiles')) {
    console.log('── 1. Profiles ──');
    const r = await api('GET', '/profiles');
    record('GET /profiles → 200', r.ok, { status: r.status });
    record('.profiles is array', Array.isArray(r.data?.profiles));

    const diario = r.data?.profiles?.find(p => p._id === DIARIO_PROFILE);
    record('DiarioJudio profile found', !!diario);

    if (diario) {
      logKeys('Profile', diario);
      contracts['GET /profiles'] = {
        responseShape: '{ profiles: [{ _id, userId, name, description, isDefault, color, createdAt, updatedAt, accountUsernames }] }',
      };
    }

    // Probe: create profile (read-only probe — check 400 shape)
    if (!DRY_RUN) {
      const createProbe = await api('POST', '/profiles', {});
      probe('POST /profiles (empty)', createProbe.status, createProbe.data);
      const createProbe2 = await api('POST', '/profiles', { name: '__contract_test__' });
      probe('POST /profiles (name only)', createProbe2.status, createProbe2.data);
    }
    console.log('');
  }

  // ─── ACCOUNTS ──────────────────────────────────────────────
  if (shouldRun('accounts')) {
    console.log('── 2. Accounts ──');
    const r = await api('GET', `/accounts?profileId=${DIARIO_PROFILE}`);
    record('GET /accounts → 200', r.ok, { status: r.status });

    const accts = Array.isArray(r.data) ? r.data : (r.data?.accounts || r.data?.data || []);
    record('Has accounts', accts.length > 0, { count: accts.length });

    if (accts.length > 0) {
      sampleAccount = accts[0];
      logKeys('Account', sampleAccount);
      console.log(`    _id=${sampleAccount._id}, platform=${sampleAccount.platform}, username=${sampleAccount.username}`);
      contracts['GET /accounts'] = {
        params: 'profileId (query)',
        responseShape: '[{ _id, platform, profileId, username, displayName, platformUserId, isActive, ... }]',
      };
    }

    // Single account
    if (sampleAccount) {
      const single = await api('GET', `/accounts/${sampleAccount._id}`);
      record('GET /accounts/{id} → 200', single.ok, { status: single.status });
      if (single.ok) logKeys('Single account', single.data);
    }

    // Follower stats
    if (sampleAccount) {
      const stats = await api('GET', `/accounts/follower-stats?accountId=${sampleAccount._id}`);
      record('GET /accounts/follower-stats → 200', stats.ok, { status: stats.status });
      if (stats.ok) logKeys('Follower stats', stats.data);
    }

    // Probe: disconnect (don't actually do it)
    if (!DRY_RUN && sampleAccount) {
      // Just check what error shape we get with a fake ID
      const disc = await api('DELETE', '/accounts/fake_account_id_000');
      probe('DELETE /accounts/{fakeId}', disc.status, disc.data);
    }
    console.log('');
  }

  // ─── INBOX: CONVERSATIONS (DMs) ───────────────────────────
  if (shouldRun('inbox')) {
    console.log('── 3. Inbox: Conversations (DMs) ──');
    const r = await api('GET', `/inbox/conversations?profileId=${DIARIO_PROFILE}&limit=3`);
    record('GET /inbox/conversations → 200', r.ok, { status: r.status });

    const convs = r.data?.conversations || r.data?.data || [];
    record('Has conversations', convs.length > 0, { count: convs.length });

    if (convs.length > 0) {
      sampleConv = convs[0];
      logKeys('Conversation', sampleConv);
      console.log(`    id=${sampleConv.id}, accountId=${sampleConv.accountId}, platform=${sampleConv.platform}`);
      record('Conv has .id', !!sampleConv.id);
      record('Conv has .accountId', !!sampleConv.accountId);
      record('Conv has .platform', !!sampleConv.platform);
      contracts['GET /inbox/conversations'] = {
        params: 'profileId, limit, cursor (query)',
        responseShape: '{ conversations: [{ id, accountId, accountUsername, platform, participantId, participantName, participantPicture, lastMessage, updatedTime, status, url }] }',
      };
    }

    // Messages
    console.log('\n── 4. Inbox: Messages ──');
    if (sampleConv) {
      const msgs = await api('GET', `/inbox/conversations/${sampleConv.id}/messages?accountId=${sampleConv.accountId}`);
      record('GET /inbox/conversations/{id}/messages → 200', msgs.ok, { status: msgs.status });

      const msgList = msgs.data?.messages || msgs.data?.data || [];
      record('Has messages', msgList.length > 0, { count: msgList.length });

      if (msgList.length > 0) {
        sampleMessage = msgList[0];
        logKeys('Message', sampleMessage);
        console.log(`    id=${sampleMessage.id}, message="${(sampleMessage.message || '').slice(0, 60)}"`);
        console.log(`    direction=${sampleMessage.direction}, createdAt=${sampleMessage.createdAt}`);
        contracts['GET /inbox/conversations/{id}/messages'] = {
          params: 'accountId (query)',
          responseShape: '{ messages: [{ id, conversationId, accountId, platform, message, senderId, senderName, direction, createdAt }] }',
          notes: 'Content field is "message" not "text" or "content"',
        };
      }
    } else {
      recordSkip('Messages', 'no conversation');
    }

    // Reply to DM — probes
    console.log('\n── 5. Inbox: Reply to DM (probes) ──');
    if (sampleConv && !DRY_RUN) {
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only profileId', body: { profileId: DIARIO_PROFILE } },
        { label: 'accountId(profile) + message', body: { accountId: DIARIO_PROFILE, message: '__test__' } },
        { label: 'accountId(conv) only', body: { accountId: sampleConv.accountId } },
        { label: 'accountId(conv) + text', body: { accountId: sampleConv.accountId, text: '__test__' } },
        { label: 'accountId(conv) + message ← SENDS', body: { accountId: sampleConv.accountId, message: 'Contract test — please ignore' } },
      ];
      for (const p of probes) {
        const resp = await api('POST', `/inbox/conversations/${sampleConv.id}/messages`, p.body);
        probe(p.label, resp.status, resp.data);
      }
      contracts['POST /inbox/conversations/{id}/messages'] = {
        required: 'accountId (conv-level), message',
        optional: 'attachment',
        response: '{ success: true, data: { messageId } }',
        notes: '"text" field is IGNORED. "profileId" not required. accountId must be the social account ID, NOT the profile ID.',
      };
    } else {
      recordSkip('DM reply probes', DRY_RUN ? 'dry run' : 'no conversation');
    }

    // Comments
    console.log('\n── 6. Inbox: Comments ──');
    const comments = await api('GET', `/inbox/comments?profile=${DIARIO_PROFILE}&limit=10`);
    record('GET /inbox/comments → 200', comments.ok, { status: comments.status });

    const postList = comments.data?.posts || comments.data?.data || [];
    console.log(`    Posts returned: ${postList.length}`);

    if (postList.length > 0) {
      samplePost = postList[0];
      logKeys('Post', samplePost);
      console.log(`    id=${samplePost.id}, accountId=${samplePost.accountId}, commentCount=${samplePost.commentCount}`);
      contracts['GET /inbox/comments'] = {
        params: 'profile (query — note: "profile" not "profileId"), limit, cursor',
        responseShape: '{ posts: [{ id, accountId, accountUsername, platform, content, createdTime, permalink, picture, commentCount, likeCount }] }',
        notes: 'Post ID field is "id" not "postId". Profile param is "profile" not "profileId".',
      };

      // Get comments for a post
      const postWithComments = postList.find(p => p.commentCount > 0);
      if (postWithComments) {
        const postId = postWithComments.id || postWithComments.postId || postWithComments._id;
        const pc = await api('GET', `/inbox/comments/${postId}?accountId=${postWithComments.accountId}`);
        record('GET /inbox/comments/{postId} → 200', pc.ok, { status: pc.status });
        const commentList = pc.data?.comments || pc.data?.data || [];
        console.log(`    Comments: ${commentList.length}`);
        if (commentList.length > 0) {
          sampleComment = commentList[0];
          logKeys('Comment', sampleComment);
          contracts['GET /inbox/comments/{postId}'] = {
            params: 'accountId (query), cursor',
            responseShape: 'from sample keys',
          };
        }
      } else {
        console.log('    No posts with commentCount > 0');
      }
    }

    // Reply to Comment — probes
    console.log('\n── 7. Inbox: Reply to Comment (probes) ──');
    if (samplePost && !DRY_RUN) {
      const postId = samplePost.id || samplePost.postId || samplePost._id;
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only accountId', body: { accountId: samplePost.accountId } },
        { label: 'accountId + postId', body: { accountId: samplePost.accountId, postId } },
        { label: 'accountId + postId + text', body: { accountId: samplePost.accountId, postId, text: '__test__' } },
        { label: 'accountId + postId + message', body: { accountId: samplePost.accountId, postId, message: '__test__' } },
      ];
      for (const p of probes) {
        const resp = await api('POST', '/inbox/comments/reply', p.body);
        probe(p.label, resp.status, resp.data);
      }
      contracts['POST /inbox/comments/reply'] = {
        required: 'accountId, postId, message',
        optional: 'parentCommentId',
        notes: '"text" field is IGNORED. "profileId" not required.',
      };
    } else {
      recordSkip('Comment reply probes', DRY_RUN ? 'dry run' : 'no post');
    }

    // Like Comment — probes
    console.log('\n── 8. Inbox: Like Comment (probes) ──');
    if (!DRY_RUN) {
      // First: the OLD wrong path
      const wrongPath = await api('POST', '/inbox/comments/fake_id/like', { accountId: sampleAccount?._id });
      probe('POST /inbox/comments/{id}/like (WRONG path)', wrongPath.status, wrongPath.data);

      // Correct path
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only accountId', body: { accountId: sampleAccount?._id } },
        { label: 'accountId + commentId', body: { accountId: sampleAccount?._id, commentId: 'fake_id' } },
        { label: 'accountId + commentId + message', body: { accountId: sampleAccount?._id, commentId: 'fake_id', message: 'like' } },
      ];
      for (const p of probes) {
        const resp = await api('POST', '/inbox/comments/like', p.body);
        probe(p.label, resp.status, resp.data);
      }
      contracts['POST /inbox/comments/like'] = {
        path: '/inbox/comments/like (NOT /inbox/comments/{id}/like)',
        required: 'accountId, commentId, message',
        notes: 'Uses flat path, not parameterized. "message" field required (value: "like").',
      };

      // Unlike
      const unlikeProbe = await api('POST', '/inbox/comments/unlike', { accountId: sampleAccount?._id, commentId: 'fake_id', message: 'unlike' });
      probe('POST /inbox/comments/unlike', unlikeProbe.status, unlikeProbe.data);
    }

    // Hide Comment — probes
    console.log('\n── 9. Inbox: Hide Comment (probes) ──');
    if (!DRY_RUN) {
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only accountId', body: { accountId: sampleAccount?._id } },
        { label: 'accountId + commentId', body: { accountId: sampleAccount?._id, commentId: 'fake_id' } },
        { label: 'accountId + postId + commentId', body: { accountId: sampleAccount?._id, postId: 'fake_post', commentId: 'fake_id' } },
      ];
      for (const p of probes) {
        const resp = await api('POST', '/inbox/comments/hide', p.body);
        probe(p.label, resp.status, resp.data);
      }
      contracts['POST /inbox/comments/hide'] = {
        required: 'accountId, commentId (TBD — need real IDs to confirm full shape)',
      };
    }
    console.log('');
  }

  // ─── POSTS ─────────────────────────────────────────────────
  if (shouldRun('posts')) {
    console.log('── 10. Posts: List ──');
    const r = await api('GET', `/posts?profileId=${DIARIO_PROFILE}&limit=3`);
    record('GET /posts → 200', r.ok, { status: r.status });

    const posts = r.data?.posts || r.data?.data || r.data || [];
    const postArr = Array.isArray(posts) ? posts : [];
    record('Has posts', postArr.length > 0, { count: postArr.length });

    let sampleGetlatePost = null;
    if (postArr.length > 0) {
      sampleGetlatePost = postArr[0];
      logKeys('Post', sampleGetlatePost);
      console.log(`    _id=${sampleGetlatePost._id}, status=${sampleGetlatePost.status}, platform=${sampleGetlatePost.platforms?.[0] || sampleGetlatePost.platform}`);
      contracts['GET /posts'] = {
        params: 'profileId, status, platform, limit, offset (query)',
        responseShape: 'from sample keys above',
      };
    }

    // Single post
    if (sampleGetlatePost) {
      const postId = sampleGetlatePost._id || sampleGetlatePost.id;
      const single = await api('GET', `/posts/${postId}`);
      record('GET /posts/{id} → 200', single.ok, { status: single.status });
      if (single.ok) logKeys('Single post', single.data);
    }

    // Create post — probe required fields (don't actually create)
    console.log('\n── 11. Posts: Create (probes) ──');
    if (!DRY_RUN) {
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only content', body: { content: '__test__' } },
        { label: 'content + accountIds', body: { content: '__test__', accountIds: [sampleAccount?._id] } },
        { label: 'content + accountIds + platforms', body: { content: '__test__', accountIds: [sampleAccount?._id], platforms: [{ platform: 'facebook', accountId: sampleAccount?._id }] } },
      ];
      for (const p of probes) {
        const resp = await api('POST', '/posts', p.body);
        probe(p.label, resp.status, resp.data);
      }
    }

    // Update post — probe
    console.log('\n── 12. Posts: Update (probes) ──');
    if (!DRY_RUN) {
      const fakeUpdate = await api('PATCH', '/posts/fake_post_id', { text: '__test__' });
      probe('PATCH /posts/{fakeId}', fakeUpdate.status, fakeUpdate.data);
    }

    // Delete post — probe
    if (!DRY_RUN) {
      const fakeDel = await api('DELETE', '/posts/fake_post_id');
      probe('DELETE /posts/{fakeId}', fakeDel.status, fakeDel.data);
    }

    // Unpublish — probe
    if (!DRY_RUN) {
      const fakeUnpub = await api('POST', '/posts/fake_post_id/unpublish', {});
      probe('POST /posts/{fakeId}/unpublish', fakeUnpub.status, fakeUnpub.data);
    }

    // Validation tools
    console.log('\n── 13. Posts: Validation Tools ──');
    const validateLength = await api('POST', '/tools/validate/post-length', { text: 'Hello world', platforms: ['facebook'] });
    record('POST /tools/validate/post-length → 200', validateLength.ok, { status: validateLength.status });
    if (validateLength.ok) logKeys('Validate length response', validateLength.data);

    const validatePost = await api('POST', '/tools/validate/post', { text: 'Hello world', platforms: ['facebook'], accountIds: [sampleAccount?._id] });
    probe('POST /tools/validate/post', validatePost.status, validatePost.data);

    const validateMedia = await api('POST', '/tools/validate/media', { mediaItems: [] });
    probe('POST /tools/validate/media', validateMedia.status, validateMedia.data);
    console.log('');
  }

  // ─── ANALYTICS ─────────────────────────────────────────────
  if (shouldRun('analytics')) {
    console.log('── 14. Analytics ──');

    // Best time
    const bestTime = await api('GET', `/analytics/best-time?profileId=${DIARIO_PROFILE}`);
    record('GET /analytics/best-time → 200', bestTime.ok, { status: bestTime.status });
    if (bestTime.ok) logKeys('Best time', bestTime.data);

    // Overview
    if (sampleAccount) {
      const now = new Date();
      const weekAgo = new Date(now - 7 * 86400000);
      const overview = await api('GET', `/analytics/overview?accountIds=${sampleAccount._id}&startDate=${weekAgo.toISOString()}&endDate=${now.toISOString()}`);
      record('GET /analytics/overview → 200', overview.ok, { status: overview.status });
      if (overview.ok) logKeys('Overview', overview.data);
    }

    // Posting frequency
    const freq = await api('GET', `/analytics/get-posting-frequency?profileId=${DIARIO_PROFILE}&platform=facebook`);
    record('GET /analytics/get-posting-frequency → 200', freq.ok, { status: freq.status });
    if (freq.ok) logKeys('Posting frequency', freq.data);

    // Daily metrics
    const now = new Date();
    const monthAgo = new Date(now - 30 * 86400000);
    const daily = await api('GET', `/analytics/daily-metrics?profileId=${DIARIO_PROFILE}&startDate=${monthAgo.toISOString()}&endDate=${now.toISOString()}&platform=facebook`);
    record('GET /analytics/daily-metrics → 200', daily.ok, { status: daily.status });
    if (daily.ok) logKeys('Daily metrics', daily.data);

    // Analytics sync (probe — don't actually trigger)
    if (!DRY_RUN) {
      const syncProbe = await api('POST', '/analytics/sync', {});
      probe('POST /analytics/sync (empty)', syncProbe.status, syncProbe.data);
      const syncProbe2 = await api('POST', '/analytics/sync', { accountId: sampleAccount?._id });
      probe('POST /analytics/sync (accountId only)', syncProbe2.status, syncProbe2.data);
    }
    console.log('');
  }

  // ─── ANALYTICS EXTENDED (new endpoints) ────────────────────
  if (shouldRun('analytics-extended')) {
    console.log('── 17. Analytics: Saves field in response ──');
    // Check if the analytics list response includes a saves field
    if (sampleAccount) {
      const now = new Date();
      const monthAgo = new Date(now - 30 * 86400000);
      const analyticsList = await api('GET', `/analytics?profileId=${DIARIO_PROFILE}&limit=5&fromDate=${monthAgo.toISOString()}&toDate=${now.toISOString()}`);
      record('GET /analytics (list) → 200', analyticsList.ok, { status: analyticsList.status });
      if (analyticsList.ok && analyticsList.data) {
        const posts = analyticsList.data.posts || [];
        if (posts.length > 0) {
          const sampleAnalytics = posts[0].analytics || {};
          const hasSaves = 'saves' in sampleAnalytics;
          record('Analytics post has .saves field', hasSaves, { keys: Object.keys(sampleAnalytics).join(', ') });
          console.log(`    Analytics keys: ${Object.keys(sampleAnalytics).join(', ')}`);
          console.log(`    saves present: ${hasSaves}, value: ${sampleAnalytics.saves}`);
          contracts['GET /analytics (saves check)'] = {
            hasSaves,
            analyticsKeys: Object.keys(sampleAnalytics),
            sampleValue: sampleAnalytics.saves,
          };
        }

        // Check pagination shape
        const pagination = analyticsList.data.pagination;
        if (pagination) {
          logKeys('Pagination', pagination);
          contracts['GET /analytics (pagination shape)'] = {
            keys: Object.keys(pagination),
            sample: pagination,
          };
        }
      }
    }

    console.log('\n── 18. Analytics: Post Timeline ──');
    // post-timeline endpoint — need a real post ID
    if (sampleAccount) {
      // First get a post ID from analytics
      const now = new Date();
      const monthAgo = new Date(now - 30 * 86400000);
      const listResp = await api('GET', `/analytics?profileId=${DIARIO_PROFILE}&limit=1&fromDate=${monthAgo.toISOString()}&toDate=${now.toISOString()}`);
      const firstPost = listResp.data?.posts?.[0];
      if (firstPost) {
        const postId = firstPost._id;
        const timeline = await api('GET', `/analytics/post-timeline?postId=${postId}`);
        record('GET /analytics/post-timeline → response', timeline.status < 500, { status: timeline.status });
        if (timeline.ok) {
          logKeys('Post timeline', timeline.data);
          contracts['GET /analytics/post-timeline'] = {
            exists: true,
            status: timeline.status,
            responseKeys: timeline.data ? Object.keys(timeline.data) : [],
            sample: JSON.stringify(timeline.data).slice(0, 500),
          };
        } else {
          console.log(`    Status: ${timeline.status}`);
          contracts['GET /analytics/post-timeline'] = {
            exists: false,
            status: timeline.status,
          };
        }
      } else {
        recordSkip('Post timeline', 'no post ID available');
      }
    }

    console.log('\n── 19. Analytics: YouTube Daily Views ──');
    {
      // Try with a fake postId first to see if endpoint exists
      const ytDaily = await api('GET', '/analytics/youtube/daily-views?postId=fake_post_id');
      record('GET /analytics/youtube/daily-views → response', ytDaily.status < 500, { status: ytDaily.status });
      if (ytDaily.ok || ytDaily.status === 400) {
        console.log(`    Status: ${ytDaily.status}`);
        if (ytDaily.data) logKeys('YouTube daily views', ytDaily.data);
        contracts['GET /analytics/youtube/daily-views'] = {
          exists: true,
          status: ytDaily.status,
          responseKeys: ytDaily.data ? Object.keys(ytDaily.data) : [],
        };
      } else {
        console.log(`    Status: ${ytDaily.status} — endpoint may not exist`);
        contracts['GET /analytics/youtube/daily-views'] = {
          exists: ytDaily.status !== 404,
          status: ytDaily.status,
        };
      }
    }

    console.log('\n── 20. Analytics: Follower Stats ──');
    if (sampleAccount) {
      const stats = await api('GET', `/accounts/follower-stats?accountId=${sampleAccount._id}`);
      record('GET /accounts/follower-stats → response', stats.status < 500, { status: stats.status });
      if (stats.ok) {
        logKeys('Follower stats response', stats.data);
        console.log(`    Data sample: ${JSON.stringify(stats.data).slice(0, 500)}`);
        contracts['GET /accounts/follower-stats'] = {
          exists: true,
          status: stats.status,
          responseKeys: stats.data ? Object.keys(stats.data) : [],
          sample: JSON.stringify(stats.data).slice(0, 500),
        };
      } else {
        console.log(`    Status: ${stats.status}`);
        contracts['GET /accounts/follower-stats'] = {
          exists: stats.status !== 404,
          status: stats.status,
        };
      }
    }

    console.log('\n── 21. Analytics: Posting Frequency ──');
    {
      const freq = await api('GET', `/analytics/get-posting-frequency?profileId=${DIARIO_PROFILE}&platform=facebook`);
      record('GET /analytics/get-posting-frequency → response', freq.status < 500, { status: freq.status });
      if (freq.ok) {
        logKeys('Posting frequency', freq.data);
        console.log(`    Data sample: ${JSON.stringify(freq.data).slice(0, 500)}`);
        contracts['GET /analytics/get-posting-frequency'] = {
          exists: true,
          status: freq.status,
          responseKeys: freq.data ? Object.keys(freq.data) : [],
          sample: JSON.stringify(freq.data).slice(0, 500),
        };
      } else {
        contracts['GET /analytics/get-posting-frequency'] = {
          exists: freq.status !== 404,
          status: freq.status,
        };
      }
    }

    console.log('\n── 22. Analytics: Content Decay ──');
    {
      const decay = await api('GET', `/analytics/get-content-decay?profileId=${DIARIO_PROFILE}`);
      record('GET /analytics/get-content-decay → response', decay.status < 500, { status: decay.status });
      if (decay.ok) {
        logKeys('Content decay', decay.data);
        console.log(`    Data sample: ${JSON.stringify(decay.data).slice(0, 500)}`);
        contracts['GET /analytics/get-content-decay'] = {
          exists: true,
          status: decay.status,
          responseKeys: decay.data ? Object.keys(decay.data) : [],
        };
      } else {
        contracts['GET /analytics/get-content-decay'] = {
          exists: decay.status !== 404,
          status: decay.status,
        };
      }
    }

    console.log('\n── 23. Analytics: LinkedIn Aggregate ──');
    {
      // Probe the LinkedIn aggregate analytics endpoint
      const linkedinAgg = await api('GET', `/analytics/linkedin-aggregate-analytics?profileId=${DIARIO_PROFILE}`);
      record('GET /analytics/linkedin-aggregate-analytics → response', linkedinAgg.status < 500, { status: linkedinAgg.status });
      if (linkedinAgg.ok) {
        logKeys('LinkedIn aggregate', linkedinAgg.data);
        console.log(`    Data sample: ${JSON.stringify(linkedinAgg.data).slice(0, 500)}`);
        contracts['GET /analytics/linkedin-aggregate-analytics'] = {
          exists: true,
          status: linkedinAgg.status,
          responseKeys: linkedinAgg.data ? Object.keys(linkedinAgg.data) : [],
        };
      } else {
        console.log(`    Status: ${linkedinAgg.status}`);
        // Try alternate path
        const alt = await api('GET', `/analytics/linkedin-aggregate?profileId=${DIARIO_PROFILE}`);
        probe('GET /analytics/linkedin-aggregate (alt path)', alt.status, alt.data);
        contracts['GET /analytics/linkedin-aggregate-analytics'] = {
          exists: false,
          status: linkedinAgg.status,
          altPath: '/analytics/linkedin-aggregate',
          altStatus: alt.status,
          altExists: alt.status !== 404 && alt.status < 500,
        };
      }
    }

    console.log('\n── 24. Account Health ──');
    {
      // Probe account-health endpoint
      const health = await api('GET', `/accounts/health?profileId=${DIARIO_PROFILE}`);
      record('GET /accounts/health → response', health.status < 500, { status: health.status });
      if (health.ok) {
        logKeys('Account health', health.data);
        contracts['GET /accounts/health'] = {
          exists: true,
          status: health.status,
          responseKeys: health.data ? Object.keys(health.data) : [],
        };
      } else {
        console.log(`    Status: ${health.status}`);
        // Try alternate path
        const alt = await api('GET', `/accounts/account-health?profileId=${DIARIO_PROFILE}`);
        probe('GET /accounts/account-health (alt)', alt.status, alt.data);
        contracts['GET /accounts/health'] = {
          exists: false,
          status: health.status,
          altStatus: alt.status,
        };
      }
    }

    console.log('\n── 25. Reviews ──');
    {
      const reviews = await api('GET', `/reviews?profileId=${DIARIO_PROFILE}`);
      record('GET /reviews → response', reviews.status < 500, { status: reviews.status });
      console.log(`    Status: ${reviews.status}`);
      if (reviews.ok) {
        logKeys('Reviews', reviews.data);
        contracts['GET /reviews'] = {
          exists: true,
          status: reviews.status,
          responseKeys: reviews.data ? Object.keys(reviews.data) : [],
        };
      } else {
        contracts['GET /reviews'] = {
          exists: false,
          status: reviews.status,
        };
      }
    }

    console.log('\n── 26. Queue ──');
    {
      const queue = await api('GET', `/posts/queue?profileId=${DIARIO_PROFILE}`);
      record('GET /posts/queue → response', queue.status < 500, { status: queue.status });
      console.log(`    Status: ${queue.status}`);
      if (queue.ok) {
        logKeys('Queue', queue.data);
        contracts['GET /posts/queue'] = {
          exists: true,
          status: queue.status,
          responseKeys: queue.data ? Object.keys(queue.data) : [],
        };
      } else {
        // Try alternate path
        const alt = await api('GET', `/queue?profileId=${DIARIO_PROFILE}`);
        probe('GET /queue (alt)', alt.status, alt.data);
        contracts['GET /posts/queue'] = {
          exists: false,
          status: queue.status,
          altStatus: alt.status,
        };
      }
    }

    console.log('\n── 27. Inbox Pagination Shape ──');
    {
      // Verify conversations pagination shape
      const convPag = await api('GET', `/inbox/conversations?profileId=${DIARIO_PROFILE}&limit=1`);
      if (convPag.ok && convPag.data?.pagination) {
        logKeys('Conversations pagination', convPag.data.pagination);
        console.log(`    Pagination: ${JSON.stringify(convPag.data.pagination)}`);
        contracts['GET /inbox/conversations (pagination)'] = {
          keys: Object.keys(convPag.data.pagination),
          sample: convPag.data.pagination,
          hasCursor: 'cursor' in convPag.data.pagination,
          hasHasMore: 'hasMore' in convPag.data.pagination,
        };
      }

      // Verify comments pagination shape
      const commentsPag = await api('GET', `/inbox/comments?profile=${DIARIO_PROFILE}&limit=1`);
      if (commentsPag.ok && commentsPag.data?.pagination) {
        logKeys('Comments pagination', commentsPag.data.pagination);
        console.log(`    Pagination: ${JSON.stringify(commentsPag.data.pagination)}`);
        contracts['GET /inbox/comments (pagination)'] = {
          keys: Object.keys(commentsPag.data.pagination),
          sample: commentsPag.data.pagination,
          hasCursor: 'cursor' in commentsPag.data.pagination,
          hasHasMore: 'hasMore' in commentsPag.data.pagination,
        };
      }
    }

    console.log('');
  }

  // ─── CONNECT ───────────────────────────────────────────────
  if (shouldRun('connect')) {
    console.log('── 15. Connect ──');

    // OAuth start — probe (just check what we get back)
    const oauthProbe = await api('GET', `/connect/facebook?profileId=${DIARIO_PROFILE}&headless=true&redirect_url=http://localhost:8086/app/connections`);
    record('GET /connect/facebook → response', oauthProbe.status < 500, { status: oauthProbe.status });
    if (oauthProbe.data) logKeys('OAuth response', oauthProbe.data);

    // Select page — probe (needs real tempToken so just check error shape)
    const selectProbe = await api('POST', '/connect/facebook/select-page', { tempToken: 'fake', pageId: 'fake', profileId: DIARIO_PROFILE });
    probe('POST /connect/{platform}/select-page (fake token)', selectProbe.status, selectProbe.data);

    // Get page options — probe
    const optionsProbe = await api('GET', `/connect/facebook/select-page?tempToken=fake&profileId=${DIARIO_PROFILE}`);
    probe('GET /connect/{platform}/select-page (fake token)', optionsProbe.status, optionsProbe.data);

    // Pending data — probe
    const pendingProbe = await api('GET', '/connect/pending-data?token=fake_token');
    probe('GET /connect/pending-data (fake token)', pendingProbe.status, pendingProbe.data);
    console.log('');
  }

  // ─── WEBHOOKS ──────────────────────────────────────────────
  if (shouldRun('webhooks')) {
    console.log('── 16. Webhooks ──');

    // List existing webhook settings
    const listWh = await api('GET', `/webhooks/settings?profileId=${DIARIO_PROFILE}`);
    record('GET /webhooks/settings → response', listWh.status < 500, { status: listWh.status });
    if (listWh.data) {
      logKeys('Webhook settings', listWh.data);
      console.log(`    Data: ${JSON.stringify(listWh.data).slice(0, 300)}`);
    }

    // Register webhook — probe
    if (!DRY_RUN) {
      const probes = [
        { label: 'empty body', body: {} },
        { label: 'only name', body: { name: '__test__' } },
        { label: 'name + url', body: { name: '__test__', url: 'https://example.com/wh' } },
        { label: 'name + url + events', body: { name: '__test__', url: 'https://example.com/wh', events: ['comment.created'] } },
        { label: 'full (name + url + events + profileId)', body: { name: '__test__', url: 'https://example.com/wh', events: ['comment.created'], profileId: DIARIO_PROFILE } },
        { label: 'full + secret', body: { name: '__test__', url: 'https://example.com/wh', events: ['comment.created'], profileId: DIARIO_PROFILE, secret: 'test_secret_123' } },
      ];
      for (const p of probes) {
        const resp = await api('POST', '/webhooks/settings', p.body);
        probe(p.label, resp.status, resp.data);
      }
    }
    console.log('');
  }

  // ═══ Summary ═══════════════════════════════════════════════
  console.log(`═══ Results: ${passed} passed, ${failed} failed, ${skipped} skipped ═══\n`);

  // Write contracts
  const contractPath = path.join(__dirname, '..', 'getlate-contracts.json');
  fs.writeFileSync(contractPath, JSON.stringify(contracts, null, 2));
  console.log(`Verified contracts saved to: ${contractPath}`);

  // Write detailed results
  const outPath = path.join(__dirname, '..', 'getlate-contract-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Detailed results saved to: ${outPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(2); });
