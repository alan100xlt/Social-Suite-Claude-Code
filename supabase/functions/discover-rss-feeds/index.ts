const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FeedMetadata { title: string; description?: string; itemCount: number; lastUpdated?: string; }

interface DiscoveredFeed {
  url: string; title: string; type: 'rss' | 'atom' | 'json';
  description?: string; itemCount?: number; lastUpdated?: string;
  score: number; source: 'direct' | 'html_link' | 'path_probe' | 'subdomain';
}

const FEED_PATHS = [
  '/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml',
  '/feed/rss', '/blog/feed', '/news/feed', '/index.xml',
  '/rss/feed', '/.rss', '/blog/rss', '/feed/atom',
  '/articles/feed', '/posts/feed', '/blog/rss.xml',
  '/news/rss.xml', '/articles/rss.xml', '/blog/atom.xml',
  '/category/news/feed', '/category/local/feed',
  '/feed/posts/default', '/feeds/posts/default',
  '/?feed=rss2', '/?feed=atom', '/?feed=rss',
  '/index.rss', '/index.atom', '/rss/news', '/rss/all',
  '/syndication.axd', '/rss/index.xml',
  '/podcast/feed', '/podcast.xml', '/podcast/rss',
  '/local/feed', '/community/feed', '/opinion/feed',
  '/sports/feed', '/business/feed', '/entertainment/feed',
  '/breaking/feed', '/latest/feed', '/headlines/feed',
  '/feed.json', '/feed/json', '/api/rss',
];

const CONTENT_SUBDOMAINS = ['www', 'blog', 'news', 'feed', 'rss'];
const SUBDOMAIN_FEED_PATHS = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml'];

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  return url;
}

function getBaseUrl(url: string): string {
  try { const p = new URL(url); return `${p.protocol}//${p.host}`; } catch { return url; }
}

function extractDomain(url: string) {
  try {
    const p = new URL(url);
    const parts = p.host.split('.');
    return { protocol: p.protocol, host: p.host, baseDomain: parts.length > 2 ? parts.slice(-2).join('.') : p.host };
  } catch { return null; }
}

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSDiscovery/2.0)', 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*' } });
    clearTimeout(id); return r;
  } catch (e) { clearTimeout(id); throw e; }
}

function isValidFeedContent(content: string): boolean {
  const lc = content.toLowerCase().trim();
  return lc.includes('<rss') || lc.includes('<feed') || lc.includes('<channel') || lc.includes('<rdf:rdf') ||
    (lc.includes('<?xml') && (lc.includes('<rss') || lc.includes('<feed') || lc.includes('<channel') || lc.includes('<item>') || lc.includes('<entry>'))) ||
    (lc.startsWith('{') && (lc.includes('"items"') || lc.includes('"feed"') || lc.includes('"entries"')));
}

function detectFeedType(content: string): 'rss' | 'atom' | 'json' {
  const l = content.toLowerCase();
  if (l.startsWith('{') || l.includes('"items"')) return 'json';
  if (l.includes('<feed') && l.includes('xmlns="http://www.w3.org/2005/atom"')) return 'atom';
  if (l.includes('<feed')) return 'atom';
  return 'rss';
}

interface FirstArticle {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
}

function extractFeedMetadata(content: string): FeedMetadata & { firstArticle?: FirstArticle; articles?: FirstArticle[] } {
  let title = 'RSS Feed';
  for (const p of [/<title>(?:<!\[CDATA\[)?\s*([^\]<]+?)\s*(?:\]\]>)?<\/title>/i, /<channel[^>]*>[\s\S]*?<title>([^<]+)<\/title>/i]) {
    const m = content.match(p); if (m?.[1]?.trim()) { title = m[1].trim(); break; }
  }
  let description: string | undefined;
  for (const p of [/<description>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/description>/i, /<subtitle>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/subtitle>/i]) {
    const m = content.match(p); if (m?.[1]?.trim()) { description = m[1].trim(); break; }
  }
  const itemCount = Math.max((content.match(/<item[\s>]/gi) || []).length, (content.match(/<entry[\s>]/gi) || []).length);
  let lastUpdated: string | undefined;
  for (const p of [/<lastBuildDate>([^<]+)<\/lastBuildDate>/i, /<updated>([^<]+)<\/updated>/i, /<pubDate>([^<]+)<\/pubDate>/i]) {
    const m = content.match(p); if (m?.[1]?.trim()) { lastUpdated = m[1].trim(); break; }
  }

  // Extract first article from the feed
  let firstArticle: FirstArticle | undefined;
  // Try RSS <item> format
  const itemMatch = content.match(/<item[\s>][\s\S]*?<\/item>/i);
  if (itemMatch) {
    const item = itemMatch[0];
    const artTitle = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const artDesc = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim();
    const artLink = item.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim();
    if (artTitle) {
      const artImage = item.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1]
        || item.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1]
        || item.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1]
        || item.match(/<image>(?:<!\[CDATA\[)?([^<\]]+)/i)?.[1]
        || item.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1];
      firstArticle = { title: artTitle, description: artDesc || '', link: artLink || '', imageUrl: artImage || undefined };
    }
  }
  // Try Atom <entry> format if no item found
  if (!firstArticle) {
    const entryMatch = content.match(/<entry[\s>][\s\S]*?<\/entry>/i);
    if (entryMatch) {
      const entry = entryMatch[0];
      const artTitle = entry.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
      const artDesc = (entry.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1] || entry.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1])?.trim();
      const artLink = entry.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim();
      if (artTitle) {
        const artImage = entry.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1]
          || entry.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1]
          || entry.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1];
        firstArticle = { title: artTitle, description: artDesc || '', link: artLink || '', imageUrl: artImage || undefined };
      }
    }
  }

  // Extract multiple articles
  const articles: FirstArticle[] = [];
  const itemMatches = content.matchAll(/<item[\s>][\s\S]*?<\/item>/gi);
  for (const m of itemMatches) {
    if (articles.length >= 5) break;
    const item = m[0];
    const artTitle = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const artDesc = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim();
    const artLink = item.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim();
    const artImage = item.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1]
      || item.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1]
      || item.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1]
      || item.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1];
    if (artTitle) articles.push({ title: artTitle, description: artDesc || '', link: artLink || '', imageUrl: artImage || undefined });
  }
  if (articles.length === 0) {
    // Try Atom entries
    const entryMatches = content.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi);
    for (const m of entryMatches) {
      if (articles.length >= 5) break;
      const entry = m[0];
      const artTitle = entry.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
      const artDesc = (entry.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1] || entry.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1])?.trim();
      const artLink = entry.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim();
      const artImage = entry.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1]
        || entry.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1];
      if (artTitle) articles.push({ title: artTitle, description: artDesc || '', link: artLink || '', imageUrl: artImage || undefined });
    }
  }

  return { title, description, itemCount, lastUpdated, firstArticle, articles: articles.length > 0 ? articles : undefined };
}

function scoreFeed(m: FeedMetadata): number {
  let score = Math.min(m.itemCount * 2, 50);
  if (m.lastUpdated) {
    try {
      const days = (Date.now() - new Date(m.lastUpdated).getTime()) / 86400000;
      if (days < 1) score += 50; else if (days < 7) score += 30; else if (days < 30) score += 15; else if (days < 90) score += 5;
    } catch {}
  }
  if (m.description) score += 5;
  return score;
}

async function validateFeed(url: string, source: DiscoveredFeed['source']): Promise<(DiscoveredFeed & { firstArticle?: FirstArticle; articles?: FirstArticle[] }) | null> {
  try {
    const r = await fetchWithTimeout(url, 5000);
    if (!r.ok) return null;
    const content = await r.text();
    if (!isValidFeedContent(content)) return null;
    const meta = extractFeedMetadata(content);
    if (meta.itemCount === 0 && source !== 'html_link') return null;
    return { url, title: meta.title, type: detectFeedType(content), description: meta.description, itemCount: meta.itemCount, lastUpdated: meta.lastUpdated, score: scoreFeed(meta), source, firstArticle: meta.firstArticle, articles: meta.articles };
  } catch { return null; }
}

async function discoverFromHtml(html: string, baseUrl: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  const seenUrls = new Set<string>();
  const allMatches: string[] = [];
  for (const p of [/<link[^>]*rel=["']?alternate["']?[^>]*>/gi, /<link[^>]*type=["']?application\/(rss|atom)\+xml["']?[^>]*>/gi, /<link[^>]*type=["']?text\/xml["']?[^>]*>/gi]) {
    allMatches.push(...(html.match(p) || []));
  }
  let anchorMatch;
  const anchorPattern = /<a[^>]*href=["']([^"']*(?:feed|rss|atom)[^"']*)["'][^>]*>/gi;
  while ((anchorMatch = anchorPattern.exec(html)) !== null) {
    if (anchorMatch[1]) allMatches.push(`<link href="${anchorMatch[1]}" type="application/rss+xml">`);
  }
  const promises: Promise<DiscoveredFeed | null>[] = [];
  for (const match of allMatches) {
    const hrefMatch = match.match(/href=["']?([^"'\s>]+)["']?/i);
    if (!hrefMatch) continue;
    let feedUrl = hrefMatch[1];
    if (feedUrl.startsWith('/')) feedUrl = baseUrl + feedUrl;
    else if (!feedUrl.startsWith('http')) feedUrl = baseUrl + '/' + feedUrl;
    const norm = feedUrl.toLowerCase().replace(/\/$/, '');
    if (seenUrls.has(norm)) continue;
    seenUrls.add(norm);
    promises.push(validateFeed(feedUrl, 'html_link'));
  }
  for (const r of await Promise.allSettled(promises)) {
    if (r.status === 'fulfilled' && r.value) feeds.push(r.value);
  }
  return feeds;
}

async function probePaths(baseUrl: string, fastMode = false): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  const paths = fastMode ? FEED_PATHS.slice(0, 10) : FEED_PATHS;
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(p => validateFeed(baseUrl + p, 'path_probe')));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        feeds.push(r.value);
        if (fastMode && r.value.itemCount && r.value.itemCount > 0) return feeds;
      }
    }
  }
  return feeds;
}

async function probeSubdomains(url: string): Promise<DiscoveredFeed[]> {
  const d = extractDomain(url);
  if (!d) return [];
  const feeds: DiscoveredFeed[] = [];
  const promises: Promise<DiscoveredFeed | null>[] = [];
  for (const sub of CONTENT_SUBDOMAINS) {
    if (d.host.startsWith(sub + '.')) continue;
    for (const p of SUBDOMAIN_FEED_PATHS) {
      promises.push(validateFeed(`${d.protocol}//${sub}.${d.baseDomain}${p}`, 'subdomain'));
    }
  }
  for (const r of await Promise.allSettled(promises)) {
    if (r.status === 'fulfilled' && r.value) feeds.push(r.value);
  }
  return feeds;
}

function deduplicateFeeds(feeds: DiscoveredFeed[]): DiscoveredFeed[] {
  const seen = new Map<string, DiscoveredFeed>();
  for (const f of feeds) {
    const norm = f.url.toLowerCase().replace(/\/$/, '');
    if (!seen.has(norm) || seen.get(norm)!.score < f.score) seen.set(norm, f);
  }
  return Array.from(seen.values());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url, fastMode = false } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedUrl = normalizeUrl(url);
    const baseUrl = getBaseUrl(normalizedUrl);
    const allFeeds: DiscoveredFeed[] = [];
    const t0 = performance.now();
    const timer = (label: string) => console.log(`⏱ [${label}] ${(performance.now() - t0).toFixed(0)}ms`);

    console.log('RSS discovery for:', normalizedUrl, fastMode ? '(FAST)' : '');

    // Direct feed check
    let directFeed = await validateFeed(normalizedUrl, 'direct');
    if (!directFeed && !normalizedUrl.includes('://www.')) {
      const d = extractDomain(normalizedUrl);
      if (d) {
        try {
          const path = new URL(normalizedUrl).pathname;
          directFeed = await validateFeed(`${d.protocol}//www.${d.host}${path}`, 'direct');
        } catch {}
      }
    }
    if (directFeed) {
      timer('direct-feed-check');
      const firstArticle = directFeed.firstArticle;
      const articles = directFeed.articles || (firstArticle ? [firstArticle] : []);
      return new Response(JSON.stringify({ success: true, isDirectFeed: true, feeds: [directFeed], firstArticle, articles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch page HTML
    let htmlContent = '';
    let workingBaseUrl = baseUrl;
    try {
      const r = await fetchWithTimeout(normalizedUrl, 5000);
      if (r.ok) htmlContent = await r.text();
    } catch {
      timer('html-fetch-primary-fail');
      const d = extractDomain(normalizedUrl);
      if (d && !d.host.startsWith('www.')) {
        try {
          const r = await fetchWithTimeout(`${d.protocol}//www.${d.host}`, 5000);
          if (r.ok) { htmlContent = await r.text(); workingBaseUrl = `${d.protocol}//www.${d.host}`; }
        } catch {}
      }
    }

    // HTML link discovery — return immediately if we find good feeds (skip expensive path probing)
    if (htmlContent) {
      timer('html-fetch');
      const htmlFeeds = await discoverFromHtml(htmlContent, workingBaseUrl);
      timer('html-link-discovery');
      allFeeds.push(...htmlFeeds);
      // Early exit: if any HTML-discovered feed has articles, return right away
      if (htmlFeeds.length > 0 && htmlFeeds.some(f => f.itemCount && f.itemCount > 0)) {
        const unique = deduplicateFeeds(allFeeds).sort((a, b) => b.score - a.score);
        const bestFeed = (unique as any[]).find(f => f.articles?.length > 0 || f.firstArticle);
        const firstArticle = bestFeed?.firstArticle;
        const articles = bestFeed?.articles || (firstArticle ? [firstArticle] : []);
        console.log('Early exit: found', unique.length, 'feeds from HTML links');
        return new Response(JSON.stringify({ success: true, isDirectFeed: false, feeds: unique, firstArticle, articles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Path probing + subdomain probing (only reached if HTML discovery found nothing)
    const [pathFeeds, subdomainFeeds] = await Promise.all([
      probePaths(workingBaseUrl, fastMode),
      fastMode ? Promise.resolve([]) : probeSubdomains(workingBaseUrl),
    ]);
    allFeeds.push(...pathFeeds, ...subdomainFeeds);
    timer('path-subdomain-probing');

    const uniqueFeeds = deduplicateFeeds(allFeeds).sort((a, b) => b.score - a.score);
    const bestFeed = (uniqueFeeds as any[]).find(f => f.articles?.length > 0 || f.firstArticle);
    const firstArticle = bestFeed?.firstArticle;
    const articles = bestFeed?.articles || (firstArticle ? [firstArticle] : []);
    console.log('Total unique feeds:', uniqueFeeds.length, firstArticle ? `First article: ${firstArticle.title}` : 'No article found', `Articles: ${articles.length}`);
    timer('total');

    return new Response(JSON.stringify({ success: true, isDirectFeed: false, feeds: uniqueFeeds, firstArticle, articles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error discovering RSS feeds:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
