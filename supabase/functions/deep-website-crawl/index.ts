const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Firecrawl helpers ──

async function firecrawlScrape(
  url: string,
  formats: string[],
  apiKey: string,
  options: { onlyMainContent?: boolean; waitFor?: number; skipTlsVerification?: boolean } = {}
): Promise<any> {
  console.log(`Firecrawl scraping ${url} with formats:`, formats);
  const body: Record<string, unknown> = {
    url,
    formats,
    onlyMainContent: options.onlyMainContent ?? false,
  };
  // Only add waitFor if explicitly set — omitting it lets Firecrawl skip JS rendering for speed
  if (options.waitFor !== undefined) body.waitFor = options.waitFor;
  if (options.skipTlsVerification) body.skipTlsVerification = true;
  // Use timeout header for faster failure
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Firecrawl scrape failed for ${url}:`, data);
    throw new Error(data.error || `Failed with status ${response.status}`);
  }
  return data.data || data;
}

async function firecrawlMap(url: string, apiKey: string, limit = 100): Promise<string[]> {
  console.log(`Firecrawl mapping ${url}`);
  const response = await fetch('https://api.firecrawl.dev/v1/map', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, limit, includeSubdomains: false }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Firecrawl map failed for ${url}:`, data);
    return [];
  }
  return data.links || [];
}

// ── Social channel extraction ──

interface SocialChannel {
  platform: string;
  url: string;
  username?: string;
}

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /(?:facebook\.com|fb\.com)\/(?!sharer|share|login|dialog|plugins|policies|help|events|groups)([a-zA-Z0-9._-]+)/i,
  twitter: /(?:twitter\.com|x\.com)\/(?!intent|share|search|i\/|hashtag)([a-zA-Z0-9_]+)/i,
  instagram: /instagram\.com\/(?!p\/|explore|accounts|reel\/|stories)([a-zA-Z0-9._]+)/i,
  linkedin: /linkedin\.com\/(?:company|in|school)\/([a-zA-Z0-9_-]+)/i,
  youtube: /youtube\.com\/(?:@|channel\/|c\/|user\/)?([a-zA-Z0-9_@-]+)/i,
  tiktok: /tiktok\.com\/@?([a-zA-Z0-9._]+)/i,
  threads: /threads\.net\/@?([a-zA-Z0-9._]+)/i,
  pinterest: /pinterest\.com\/([a-zA-Z0-9_-]+)/i,
};

const EXCLUDE_USERNAMES = new Set([
  'share', 'sharer', 'intent', 'login', 'signup', 'help', 'settings',
  'explore', 'search', 'hashtag', 'p', 'reel', 'watch', 'video', 'videos',
  'about', 'privacy', 'terms', 'policy', 'legal', 'careers', 'jobs',
  'feed', 'home', 'notifications', 'messages', 'events', 'groups',
  'pages', 'business', 'ads', 'advertising', 'developers', 'api',
]);

function extractSocialChannels(links: string[], markdown: string): SocialChannel[] {
  const channels: SocialChannel[] = [];
  const seenPlatforms = new Set<string>();
  const allLinks = [...new Set([...links, ...(markdown.match(/https?:\/\/[^\s)>\]"']+/g) || [])])];

  for (const link of allLinks) {
    for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
      if (seenPlatforms.has(platform)) continue;
      const match = link.match(regex);
      if (match?.[1]) {
        const username = match[1].toLowerCase();
        if (EXCLUDE_USERNAMES.has(username) || username.length < 2) continue;
        channels.push({ platform, url: link.split('?')[0], username: match[1] });
        seenPlatforms.add(platform);
      }
    }
  }
  return channels;
}

// ── Priority pages ──

const PRIORITY_PATHS = ['', '/about', '/about-us', '/services', '/products', '/blog'];

// ── AI analysis types ──

interface AIAnalysisResult {
  businessName: string;
  businessType: string;
  offerings: string[];
  blogThemes: string[];
  location?: string;
  valuePropositions: string[];
  competitiveDifferentiators: string[];
  contentOpportunities: string[];
}

interface CrawlResult {
  businessName: string;
  businessType: string;
  industry?: string;
  description?: string;
  offerings: string[];
  blogThemes: string[];
  branding: {
    logo?: string;
    colors?: string[];
    fonts?: string[];
    primaryColor?: string;
    secondaryColor?: string;
  };
  contact?: { email?: string; phone?: string; address?: string };
  location?: string;
  valuePropositions: string[];
  competitiveDifferentiators: string[];
  contentOpportunities: string[];
  pageContents: { url: string; title: string; contentSummary: string }[];
  websiteImages: string[];
  screenshotUrl?: string;
  socialChannels?: SocialChannel[];
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mode = 'fast' } = await req.json();
    const fastMode = mode === 'fast';

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const t0 = performance.now();
    const timer = (label: string) => console.log(`⏱ [${label}] ${(performance.now() - t0).toFixed(0)}ms`);
    console.log('Starting deep website crawl for:', url, fastMode ? '(FAST)' : '(FULL)');

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) throw new Error('FIRECRAWL_API_KEY is not configured');

    // Resolve the working URL by trying all protocol/www variations
    async function testUrl(testUrl: string, timeout = 6000): Promise<boolean> {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), timeout);
        const r = await fetch(testUrl, { method: 'HEAD', signal: c.signal, redirect: 'follow' });
        clearTimeout(t);
        return r.ok || r.status < 500;
      } catch { return false; }
    }

    // Strip any existing protocol and www prefix to get the bare domain
    const bareDomain = url.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');

    // Generate all variations and race them in parallel
    const candidates = [
      `https://${bareDomain}`,
      `https://www.${bareDomain}`,
      `http://${bareDomain}`,
      `http://www.${bareDomain}`,
    ];

    let workingUrl = candidates[0]; // default fallback
    console.log('Racing all URL variants in parallel...');
    const raceResults = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const ok = await testUrl(candidate, 4000);
        if (ok) return candidate;
        throw new Error('not reachable');
      })
    );
    for (const r of raceResults) {
      if (r.status === 'fulfilled') {
        workingUrl = r.value;
        console.log(`Resolved working URL: ${workingUrl}`);
        break;
      }
    }
    timer('url-resolution');

    // Step 1: Map website (skip in fast mode)
    let discoveredUrls: string[] = [];
    if (!fastMode) {
      try {
        discoveredUrls = await firecrawlMap(workingUrl, firecrawlApiKey, 100);
        timer('map');
        console.log(`Discovered ${discoveredUrls.length} URLs`);
      } catch (e) { console.log('Map failed:', e); }
    }

    // Step 2: Determine pages to scrape
    const baseUrl = new URL(workingUrl);
    const priorityUrls = PRIORITY_PATHS.map(p => new URL(p, baseUrl.origin).toString().replace(/\/$/, ''));

    const urlsToScrape = fastMode
      ? [workingUrl]
      : priorityUrls
          .filter(pu => discoveredUrls.length === 0 || discoveredUrls.some(d => d.replace(/\/$/, '').toLowerCase() === pu.toLowerCase()))
          .slice(0, 6);

    console.log('URLs to scrape:', urlsToScrape);

    // Step 3: Scrape pages
    const pageContents: CrawlResult['pageContents'] = [];
    let combinedMarkdown = '';
    let brandingData: CrawlResult['branding'] = {};
    let homepageBrandingExtracted = false;
    const websiteImages: string[] = [];
    let screenshotUrl: string | undefined;

    for (const pageUrl of urlsToScrape) {
      try {
        const isHomepage = pageUrl === urlsToScrape[0];
        // Skip branding in fast mode to save ~2-3s
        const formats = isHomepage && !fastMode
          ? ['markdown', 'branding', 'links']
          : ['markdown', 'links'];
        const scrapeResult = await firecrawlScrape(pageUrl, formats, firecrawlApiKey);

        const markdown = scrapeResult.markdown || '';
        const title = scrapeResult.metadata?.title || pageUrl;

        if (scrapeResult.links && Array.isArray(scrapeResult.links)) {
          discoveredUrls.push(...scrapeResult.links);
        }

        pageContents.push({ url: pageUrl, title, contentSummary: markdown.substring(0, 500) });
        combinedMarkdown += `\n\n--- PAGE: ${title} (${pageUrl}) ---\n\n${markdown}`;

        // Extract images
        for (const match of markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)) {
          const imgUrl = match[1];
          if (imgUrl && !websiteImages.includes(imgUrl) && isValidImageUrl(imgUrl)) {
            websiteImages.push(imgUrl);
          }
        }
        if (scrapeResult.metadata?.ogImage) websiteImages.push(scrapeResult.metadata.ogImage);

        // Extract branding from homepage
        if (isHomepage && !homepageBrandingExtracted) {
          const b = scrapeResult.branding || {};
          const meta = scrapeResult.metadata || {};

          // Logo detection cascade: branding logo → favicon → apple-touch-icon → ogImage
          let logo = b.logo || b.images?.logo;
          if (!logo && b.images?.favicon) logo = b.images.favicon;
          if (!logo && meta.favicon) logo = meta.favicon;
          // Try to find apple-touch-icon from links in markdown
          if (!logo) {
            const appleTouchMatch = markdown.match(/apple-touch-icon[^"]*"?\s*href=["']([^"']+)/i);
            if (appleTouchMatch?.[1]) logo = appleTouchMatch[1];
          }
          // Build absolute URL for apple-touch-icon common path
          if (!logo) {
            const commonIconPaths = ['/apple-touch-icon.png', '/favicon-32x32.png', '/favicon.ico'];
            for (const iconPath of commonIconPaths) {
              const candidate = new URL(iconPath, baseUrl.origin).toString();
              // We'll include this as the logo - it's a best-effort fallback
              logo = candidate;
              break;
            }
          }
          // Last resort: use ogImage as logo (often a brand image)
          if ((!logo || logo.includes('favicon.ico')) && (meta.ogImage || b.images?.ogImage)) {
            logo = meta.ogImage || b.images?.ogImage;
          }

          console.log('Logo detection result:', logo);

          const colors = [b.colors?.primary, b.colors?.secondary, b.colors?.accent, b.colors?.background, b.colors?.textPrimary, b.colors?.textSecondary].filter(Boolean) as string[];
          const fonts = b.fonts?.map((f: any) => f.family || f).filter(Boolean) as string[] || [];
          if (fonts.length === 0 && b.typography?.fontFamilies) {
            const ff = b.typography.fontFamilies;
            if (ff.primary) fonts.push(ff.primary);
            if (ff.heading && ff.heading !== ff.primary) fonts.push(ff.heading);
          }
          brandingData = { logo, colors, fonts, primaryColor: b.colors?.primary, secondaryColor: b.colors?.secondary };
          homepageBrandingExtracted = true;
          if (logo) websiteImages.unshift(logo);
          if (b.images?.favicon && !websiteImages.includes(b.images.favicon)) websiteImages.push(b.images.favicon);
          if (b.images?.ogImage && !websiteImages.includes(b.images.ogImage)) websiteImages.push(b.images.ogImage);
          if (meta.ogImage && !websiteImages.includes(meta.ogImage)) websiteImages.push(meta.ogImage);
          // Use ogImage as fast screenshot fallback
          if (meta.ogImage) {
            screenshotUrl = meta.ogImage;
            console.log('Using ogImage as preview:', screenshotUrl);
          }
          if (scrapeResult.screenshot) {
            screenshotUrl = scrapeResult.screenshot;
            console.log('Screenshot captured from scrape');
          }
        }
      } catch (scrapeError) {
        timer(`scrape-fail:${pageUrl}`);
        console.log(`Failed to scrape ${pageUrl}:`, scrapeError);
        // Retry homepage with longer wait — skip in fast mode to save ~3s
        if (!fastMode && pageUrl === urlsToScrape[0] && !homepageBrandingExtracted) {
          try {
            const retry = await firecrawlScrape(pageUrl, ['markdown', 'branding'], firecrawlApiKey, { waitFor: 3000 });
            if (retry.branding) {
              const b = retry.branding;
              brandingData = {
                logo: b.logo || b.images?.logo,
                colors: [b.colors?.primary, b.colors?.secondary, b.colors?.accent].filter(Boolean) as string[],
                fonts: b.fonts?.map((f: any) => f.family || f).filter(Boolean) as string[] || [],
                primaryColor: b.colors?.primary,
                secondaryColor: b.colors?.secondary,
              };
              homepageBrandingExtracted = true;
              if (brandingData.logo) websiteImages.unshift(brandingData.logo);
            }
          } catch (retryErr) { console.log('Retry also failed:', retryErr); }
        }
      }
    }

    timer('scrape-all');

    // Step 4: Kick off screenshot in parallel if we don't have one yet
    const screenshotPromise = !screenshotUrl
      ? firecrawlScrape(workingUrl, ['screenshot'], firecrawlApiKey)
          .then(r => { if (r.screenshot) screenshotUrl = r.screenshot; console.log('Async screenshot captured'); })
          .catch(e => console.log('Screenshot capture failed:', e))
      : Promise.resolve();

    // Step 5: Extract social channels (while screenshot fetches in parallel)
    const socialChannels = extractSocialChannels(discoveredUrls, combinedMarkdown);
    console.log(`Discovered ${socialChannels.length} social channels`);

    // Step 5: AI analysis (use AI even in fast mode for better results)
    let aiAnalysis: AIAnalysisResult;
    if (combinedMarkdown.length > 100) {
      aiAnalysis = await analyzeWithAI(combinedMarkdown, workingUrl);
    } else {
      aiAnalysis = fallbackAnalysis(combinedMarkdown, workingUrl);
    }
    timer('ai-analysis');

    // Extract contact info
    const contactInfo = extractContactInfo(combinedMarkdown);

    // Wait for screenshot to finish (was running in parallel with AI analysis)
    await screenshotPromise;
    timer('total');

    const result: CrawlResult = {
      businessName: aiAnalysis.businessName || extractBusinessName(combinedMarkdown, url),
      businessType: aiAnalysis.businessType,
      industry: aiAnalysis.businessType,
      description: aiAnalysis.valuePropositions?.[0],
      offerings: aiAnalysis.offerings,
      blogThemes: aiAnalysis.blogThemes,
      branding: brandingData,
      contact: contactInfo,
      location: aiAnalysis.location || extractLocation(combinedMarkdown),
      valuePropositions: aiAnalysis.valuePropositions,
      competitiveDifferentiators: aiAnalysis.competitiveDifferentiators,
      contentOpportunities: aiAnalysis.contentOpportunities,
      pageContents,
      websiteImages: websiteImages.slice(0, 10),
      screenshotUrl,
      socialChannels,
    };

    console.log('Deep crawl complete. Business:', result.businessName);

    return new Response(
      JSON.stringify({
        success: true,
        businessName: result.businessName,
        description: result.description,
        logoUrl: result.branding?.logo,
        primaryColor: result.branding?.primaryColor,
        secondaryColor: result.branding?.secondaryColor,
        industry: result.industry,
        location: result.location,
        screenshotUrl: result.screenshotUrl,
        pageContents: result.pageContents,
        socialChannels: result.socialChannels,
        contact: result.contact,
        data: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in deep-website-crawl:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── AI analysis ──

async function analyzeWithAI(markdown: string, url: string): Promise<AIAnalysisResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return fallbackAnalysis(markdown, url);

  try {
    const contentForAI = markdown.substring(0, 8000);
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a business analyst expert. Analyze website content to extract detailed business intelligence. Be specific and accurate based only on the content provided.' },
          { role: 'user', content: `Analyze this website content and extract business intelligence:\n\nURL: ${url}\n\nWEBSITE CONTENT:\n${contentForAI}\n\nExtract:\n1. Business name (exact name)\n2. Business type\n3. Main offerings (up to 8)\n4. Blog themes\n5. Location (city, state)\n6. Value propositions\n7. Competitive differentiators\n8. Content opportunities` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_business_intelligence',
            description: 'Extract business intelligence from website content',
            parameters: {
              type: 'object',
              properties: {
                businessName: { type: 'string' },
                businessType: { type: 'string' },
                offerings: { type: 'array', items: { type: 'string' } },
                blogThemes: { type: 'array', items: { type: 'string' } },
                location: { type: 'string' },
                valuePropositions: { type: 'array', items: { type: 'string' } },
                competitiveDifferentiators: { type: 'array', items: { type: 'string' } },
                contentOpportunities: { type: 'array', items: { type: 'string' } },
              },
              required: ['businessName', 'businessType', 'offerings', 'valuePropositions'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_business_intelligence' } },
      }),
    });

    if (!response.ok) return fallbackAnalysis(markdown, url);

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return fallbackAnalysis(markdown, url);

    const r = JSON.parse(toolCall.function.arguments);
    return {
      businessName: r.businessName || '',
      businessType: r.businessType || 'General Business',
      offerings: r.offerings || [],
      blogThemes: r.blogThemes || [],
      location: r.location,
      valuePropositions: r.valuePropositions || [],
      competitiveDifferentiators: r.competitiveDifferentiators || [],
      contentOpportunities: r.contentOpportunities || [],
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return fallbackAnalysis(markdown, url);
  }
}

function fallbackAnalysis(markdown: string, url: string): AIAnalysisResult {
  const lower = markdown.toLowerCase();
  let businessType = 'General Business';
  const indicators: Record<string, string[]> = {
    'B2B SaaS': ['saas', 'software', 'platform', 'enterprise', 'api'],
    'E-commerce': ['shop', 'cart', 'checkout', 'products', 'buy now'],
    'Healthcare': ['health', 'medical', 'clinic', 'patient', 'wellness'],
    'Local Service': ['local', 'serving', 'community', 'appointment'],
    'Professional Services': ['consulting', 'advisory', 'solutions', 'expertise'],
    'Media/Publishing': ['news', 'article', 'reporter', 'editor', 'breaking', 'opinion'],
    'Nonprofit': ['nonprofit', 'donate', 'mission', 'impact', 'volunteer'],
  };
  let maxScore = 0;
  for (const [type, kws] of Object.entries(indicators)) {
    const score = kws.filter(k => lower.includes(k)).length;
    if (score > maxScore) { maxScore = score; businessType = type; }
  }
  return {
    businessName: extractBusinessName(markdown, url),
    businessType, offerings: [], blogThemes: [],
    valuePropositions: [], competitiveDifferentiators: [], contentOpportunities: [],
  };
}

function extractBusinessName(markdown: string, url: string): string {
  const m = markdown.match(/^#\s+(.+?)(?:\n|$)/m);
  if (m) return m[1].trim();
  try { return new URL(url).hostname.replace('www.', '').split('.')[0]; } catch { return 'Unknown'; }
}

function extractLocation(markdown: string): string | undefined {
  const patterns = [
    /(?:located in|based in|serving|headquarters in)\s+([A-Z][a-z]+(?:,?\s+[A-Z]{2})?)/i,
    /([A-Z][a-z]+,\s*(?:MN|CA|NY|TX|FL|IL|PA|OH|GA|NC|MI|WA|AZ|MA|TN|IN|MO|MD|WI|CO|AL|SC|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|DC|WY))/,
  ];
  for (const p of patterns) { const m = markdown.match(p); if (m) return m[1] || m[0]; }
  return undefined;
}

function isValidImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'].some(ext => lower.includes(ext))
    || ['/images/', '/img/', '/media/'].some(seg => lower.includes(seg));
}

function extractContactInfo(markdown: string): { email?: string; phone?: string; address?: string } {
  const contact: { email?: string; phone?: string; address?: string } = {};
  const emailMatch = markdown.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contact.email = emailMatch[0];
  const phoneMatch = markdown.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) contact.phone = phoneMatch[0];
  return contact;
}
