const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/GETLATE_API_KEY="([^"]+)"/)?.[1] || env.match(/GETLATE_API_KEY=([^\n\r]+)/)?.[1];
if (!key) { console.error('No GETLATE_API_KEY found in .env.local'); process.exit(1); }

const PROFILE_ID = '6766fc1d2dc49f6cf3a32cf0';

async function api(method, path) {
  const url = `https://getlate.dev/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  return { status: res.status, ok: res.ok, data: await res.json().catch(() => null) };
}

async function main() {
  console.log('=== GetLate Account Check ===\n');

  // 1. List accounts
  console.log('1. Accounts:');
  const accounts = await api('GET', `/accounts?profileId=${PROFILE_ID}`);
  console.log(`   Status: ${accounts.status}`);
  if (accounts.ok && accounts.data) {
    const list = accounts.data.accounts || accounts.data.data || accounts.data;
    if (Array.isArray(list)) {
      list.forEach(a => {
        console.log(`   - ${a.platform || a.type || '?'}: ${a.name || a.username || a.id} (id: ${a.id || a._id})`);
      });
    } else {
      console.log('   Response keys:', Object.keys(accounts.data));
      console.log('   Data:', JSON.stringify(accounts.data).slice(0, 500));
    }
  }

  // 2. List conversations (first page)
  console.log('\n2. Inbox conversations:');
  const convs = await api('GET', `/inbox/conversations?profileId=${PROFILE_ID}&limit=50`);
  console.log(`   Status: ${convs.status}`);
  if (convs.ok && convs.data) {
    const list = convs.data.conversations || convs.data.data || [];
    console.log(`   Total: ${list.length}`);
    // Count by platform
    const platforms = {};
    list.forEach(c => { platforms[c.platform] = (platforms[c.platform] || 0) + 1; });
    console.log('   By platform:', platforms);
    // Count by type if available
    const types = {};
    list.forEach(c => { types[c.type || 'unknown'] = (types[c.type || 'unknown'] || 0) + 1; });
    console.log('   By type:', types);
  }

  // 3. Check reviews endpoint
  console.log('\n3. Reviews:');
  const reviews = await api('GET', `/reviews?profileId=${PROFILE_ID}`);
  console.log(`   Status: ${reviews.status}`);
  if (reviews.ok && reviews.data) {
    const list = reviews.data.reviews || reviews.data.data || reviews.data;
    if (Array.isArray(list)) {
      console.log(`   Total: ${list.length}`);
      list.slice(0, 3).forEach(r => {
        console.log(`   - ${r.platform || '?'}: "${(r.text || r.content || '').slice(0, 80)}..." (${r.rating || 'no rating'})`);
      });
    } else {
      console.log('   Response:', JSON.stringify(reviews.data).slice(0, 500));
    }
  }

  // 4. Check mentions endpoint
  console.log('\n4. Mentions:');
  const mentions = await api('GET', `/mentions?profileId=${PROFILE_ID}`);
  console.log(`   Status: ${mentions.status}`);
  if (mentions.ok && mentions.data) {
    console.log('   Response:', JSON.stringify(mentions.data).slice(0, 500));
  }
}

main().catch(console.error);
