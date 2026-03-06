import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from 'npm:@imagemagick/magick-wasm@0.0.30'
import { authorize, corsHeaders as authCorsHeaders } from '../_shared/authorize.ts'
import { CronMonitor } from '../_shared/cron-monitor.ts'

// Initialize ImageMagick WASM
const wasmBytes = await Deno.readFile(
  new URL(
    'magick.wasm',
    import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.30'),
  ),
)
await initializeImageMagick(wasmBytes)

const corsHeaders = authCorsHeaders

interface RssItem {
  title: string
  link: string
  description: string
  guid: string
  pubDate: string
  imageUrl: string | null
}

function extractImageUrl(itemXml: string): string | null {
  // 1. <media:content url="..."> or <media:thumbnail url="...">
  const mediaMatch = /<media:(content|thumbnail)[^>]+url=["']([^"']+)["']/i.exec(itemXml)
  if (mediaMatch) return mediaMatch[2]

  // 2. <enclosure url="..." type="image/...">
  const enclosureMatch = /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i.exec(itemXml)
  if (enclosureMatch) return enclosureMatch[1]
  // Also check enclosure with type before url
  const enclosureMatch2 = /<enclosure[^>]+type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/i.exec(itemXml)
  if (enclosureMatch2) return enclosureMatch2[1]

  // 3. <image><url>...</url></image> (item-level)
  const imageUrlMatch = /<image>\s*<url>([^<]+)<\/url>/i.exec(itemXml)
  if (imageUrlMatch) return imageUrlMatch[1].trim()

  // 4. First <img src="..."> in description/content:encoded
  const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(itemXml)
  if (imgMatch) return imgMatch[1]

  return null
}

/**
 * Crawl a URL using Firecrawl and extract only article-specific content
 * using AI to filter out navigation, sidebars, ads, etc.
 * Returns clean article content or null on failure.
 */
async function crawlArticleContent(url: string, articleTitle: string): Promise<string | null> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!firecrawlKey || !url) return null

  try {
    console.log(`Crawling article content: ${url}`)
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })

    if (!response.ok) {
      console.error(`Firecrawl scrape failed (${response.status}) for ${url}`)
      return null
    }

    const data = await response.json()
    const rawMarkdown = data?.data?.markdown || data?.markdown || null
    if (!rawMarkdown) return null
    console.log(`Crawled ${rawMarkdown.length} raw chars from ${url}`)

    // Use AI to extract only article content if we have the key
    if (geminiKey && rawMarkdown.length > 200) {
      try {
        const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${geminiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
                content: `You are a content extractor. Given raw scraped markdown from a web page, extract ONLY the article content. Return a clean version with:
- Article title (as heading)
- Subtitle/byline if present
- Author and date if present
- The full article body text
- Any relevant image descriptions mentioned in the text

EXCLUDE: navigation menus, sidebars, ads, footer links, related articles, comments, social share buttons, cookie notices, subscription prompts, and any other non-article content.

Return clean, readable plain text (not markdown). Preserve paragraph breaks.`
              },
              {
                role: 'user',
                content: `Extract the article content from this scraped page. The article title should be "${articleTitle}".\n\n---\n\n${rawMarkdown.substring(0, 15000)}`
              }
            ],
          }),
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          const cleaned = aiData.choices?.[0]?.message?.content?.trim()
          if (cleaned && cleaned.length > 50) {
            console.log(`AI extracted ${cleaned.length} chars of article content`)
            return cleaned
          }
        } else {
          console.error(`AI extraction failed (${aiResponse.status}), using raw markdown`)
        }
      } catch (aiErr) {
        console.error(`AI extraction error, using raw markdown:`, aiErr)
      }
    }

    return rawMarkdown
  } catch (err) {
    console.error(`Error crawling article: ${err}`)
    return null
  }
}

/**
 * Check if an RSS item has thin/missing content that would benefit from crawling.
 */
function needsCrawl(item: RssItem): boolean {
  const desc = item.description?.trim() || ''
  // Thin if no description or very short (< 100 chars)
  return desc.length < 100
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const getTag = (tag: string): string => {
      // Handle CDATA sections
      const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
      const cdataMatch = cdataRegex.exec(itemXml)
      if (cdataMatch) return cdataMatch[1].trim()

      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
      const m = regex.exec(itemXml)
      return m ? m[1].trim() : ''
    }

    const guid = getTag('guid') || getTag('link') || getTag('title')
    if (!guid) continue

    items.push({
      title: getTag('title'),
      link: getTag('link'),
      description: getTag('description').replace(/<[^>]*>/g, '').substring(0, 500),
      guid,
      pubDate: getTag('pubDate'),
      imageUrl: extractImageUrl(itemXml),
    })
  }

  return items
}

/**
 * Download an image from a URL and upload it to the post-images storage bucket.
 * Returns the public URL of the uploaded image, or null on failure.
 */
async function downloadAndUploadImage(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  imageUrl: string,
  feedId: string,
  itemGuid: string,
): Promise<string | null> {
  try {
    console.log(`Downloading image: ${imageUrl}`)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'GetLate RSS Reader/1.0',
        'Accept': 'image/jpeg, image/png, image/gif, image/*;q=0.8',
      },
    })

    if (!response.ok) {
      console.error(`Failed to download image (${response.status}): ${imageUrl}`)
      return null
    }

    let imageData = new Uint8Array(await response.arrayBuffer())
    let finalContentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()

    // Convert WebP to JPEG since social channels often don't support WebP
    const isWebp = finalContentType === 'image/webp' || imageUrl.toLowerCase().endsWith('.webp')
    if (isWebp) {
      try {
        console.log('Converting WebP image to JPEG...')
        const jpegData = ImageMagick.read(imageData, (img): Uint8Array => {
          return img.write(MagickFormat.Jpeg, (data) => new Uint8Array(data))
        })
        imageData = jpegData
        finalContentType = 'image/jpeg'
        console.log('WebP→JPEG conversion successful')
      } catch (convErr) {
        console.error('WebP conversion failed, uploading as-is:', convErr)
      }
    }

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }
    const ext = extMap[finalContentType] || 'jpg'

    // Create a unique path: rss/{feedId}/{hash}.{ext}
    const hashSource = itemGuid + imageUrl
    let hash = 0
    for (let i = 0; i < hashSource.length; i++) {
      const char = hashSource.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    const hashStr = Math.abs(hash).toString(36)
    const path = `rss/${feedId}/${hashStr}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, imageData, {
        contentType: finalContentType,
        upsert: true,
      })

    if (uploadError) {
      console.error(`Failed to upload image to storage: ${uploadError.message}`)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(path)

    console.log(`Image uploaded successfully: ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error(`Error downloading/uploading image: ${err}`)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate: require valid JWT or service role (for cron)
    try {
      await authorize(req, { allowServiceRole: true })
    } catch (authError) {
      if (authError instanceof Response) return authError
      throw authError
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const monitor = new CronMonitor('rss-poll-every-5-min', supabase)
    await monitor.start()

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty body for cron calls */ }

    const { feedId, backfillImages } = body as { feedId?: string; backfillImages?: boolean }

    // If no feedId, poll ALL active feeds (used by cron)
    if (!feedId) {
      const { data: feeds, error: feedsError } = await supabase
        .from('rss_feeds')
        .select('id')
        .eq('is_active', true)

      if (feedsError || !feeds?.length) {
        await monitor.success({ message: 'No active feeds to poll', feedsPolled: 0 })
        return new Response(
          JSON.stringify({ success: true, message: 'No active feeds to poll', feedsPolled: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const results = []
      for (const feed of feeds) {
        try {
          const result = await pollSingleFeed(supabase, supabaseUrl, feed.id, false)
          results.push({ feedId: feed.id, ...result })
        } catch (err) {
          results.push({ feedId: feed.id, success: false, error: String(err) })
        }
      }

      await monitor.success({ feedsPolled: feeds.length, results })
      return new Response(
        JSON.stringify({ success: true, feedsPolled: feeds.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single feed poll
    const result = await pollSingleFeed(supabase, supabaseUrl, feedId, backfillImages ?? false)

    if (result.success) {
      await monitor.success(result)
    } else {
      await monitor.error(result.error || 'Unknown error', result)
    }

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in rss-poll:', error)
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      const errorMonitor = new CronMonitor('rss-poll-every-5-min', supabase)
      await errorMonitor.error(error instanceof Error ? error : String(error))
    } catch (monitorErr) {
      console.error('Failed to log error to monitor:', monitorErr)
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function pollSingleFeed(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  feedId: string,
  backfillImages: boolean,
) {
  // Get the feed
  const { data: feed, error: feedError } = await supabase
    .from('rss_feeds')
    .select('*')
    .eq('id', feedId)
    .single()

  if (feedError || !feed) {
    return { success: false, error: 'Feed not found' }
  }

  // Always do a full fetch — many RSS servers return incorrect 304 responses
  // while still having new content. Since RSS feeds are small and we deduplicate
  // via guid, re-fetching is cheap and reliable.
  const fetchHeaders: Record<string, string> = {
    'User-Agent': 'GetLate RSS Reader/1.0',
  }

  // Fetch the RSS feed
  console.log(`Fetching RSS feed: ${feed.url}`)
  const response = await fetch(feed.url, { headers: fetchHeaders })

  if (!response.ok) {
    return { success: false, error: `Failed to fetch feed: ${response.status}` }
  }

  // Store cache headers for next request
  const newEtag = response.headers.get('ETag') || null
  const newLastModified = response.headers.get('Last-Modified') || null

  const xml = await response.text()
  const items = parseRssXml(xml)
  console.log(`Parsed ${items.length} items from feed`)

  // Get existing guids to avoid duplicates
  const { data: existingItems } = await supabase
    .from('rss_feed_items')
    .select('guid')
    .eq('feed_id', feedId)

  const existingGuids = new Set((existingItems || []).map((i: { guid: string }) => i.guid))

  // Insert new items
  const newItems = items.filter(item => !existingGuids.has(item.guid))
  let insertedCount = 0
  let imagesUploaded = 0
  let crawledCount = 0
  let rows: Array<{
    feed_id: string; guid: string; title: string | null; link: string | null;
    description: string | null; full_content: string | null;
    image_url: string | null; published_at: string | null; status: 'pending';
  }> = []

  if (newItems.length > 0) {
    rows = []
    for (const item of newItems) {
      let storedImageUrl: string | null = null
      let fullContent: string | null = null

      if (item.imageUrl) {
        storedImageUrl = await downloadAndUploadImage(
          supabase, supabaseUrl, item.imageUrl, feedId, item.guid
        )
        if (storedImageUrl) imagesUploaded++
      }

      // Crawl the article if enable_scraping is on, or if content is thin
      if (item.link && (feed.enable_scraping || needsCrawl(item))) {
        fullContent = await crawlArticleContent(item.link, item.title || 'Untitled')
        if (fullContent) {
          crawledCount++
          if (!item.description || item.description.trim().length < 10) {
            item.description = fullContent.replace(/[#*_\[\]]/g, '').substring(0, 500)
          }
        }
      }

      rows.push({
        feed_id: feedId,
        guid: item.guid,
        title: item.title || null,
        link: item.link || null,
        description: item.description || null,
        full_content: fullContent,
        image_url: storedImageUrl || item.imageUrl || null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        status: 'pending' as const,
      })
    }

    const { error: insertError, data: inserted } = await supabase
      .from('rss_feed_items')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    insertedCount = inserted?.length || 0

    // Fire-and-forget OG image generation for new items
    if (inserted?.length) {
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      for (const item of inserted) {
        fetch(`${supabaseUrl}/functions/v1/og-image-generator`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'generate', feedItemId: item.id }),
        }).catch(err => console.error(`OG gen failed for ${item.id}:`, err))
      }
    }
  }

  // Backfill images
  let backfilledCount = 0
  if (backfillImages) {
    const itemsByGuid = new Map(items.map(i => [i.guid, i]))
    
    const { data: itemsToBackfill } = await supabase
      .from('rss_feed_items')
      .select('id, guid, image_url')
      .eq('feed_id', feedId)

    if (itemsToBackfill && itemsToBackfill.length > 0) {
      for (const dbItem of itemsToBackfill) {
        const isInStorage = dbItem.image_url?.includes('/storage/v1/object/public/post-images/')
        const isStillWebp = dbItem.image_url?.toLowerCase().endsWith('.webp')
        if (isInStorage && !isStillWebp) continue

        const sourceImageUrl = dbItem.image_url || itemsByGuid.get(dbItem.guid)?.imageUrl
        if (!sourceImageUrl) continue

        const storedUrl = await downloadAndUploadImage(
          supabase, supabaseUrl, sourceImageUrl, feedId, dbItem.guid
        )
        if (storedUrl) {
          await supabase
            .from('rss_feed_items')
            .update({ image_url: storedUrl })
            .eq('id', dbItem.id)
          backfilledCount++
        }
      }
    }
  }

  // Update last_polled_at + cache headers
  await supabase
    .from('rss_feeds')
    .update({
      last_polled_at: new Date().toISOString(),
      etag: newEtag,
      last_modified: newLastModified,
    })
    .eq('id', feedId)

  // --- Automation Processing ---
  let automationResults: unknown[] = []
  if (insertedCount > 0) {
    try {
      automationResults = await processAutomationRules(supabase, supabaseUrl, feed, rows)
    } catch (err) {
      console.error('Automation processing error:', err)
    }
  }

  return {
    success: true,
    totalParsed: items.length,
    newItems: insertedCount,
    skippedDuplicates: items.length - newItems.length,
    backfilledImages: backfilledCount,
    imagesUploaded,
    crawledArticles: crawledCount,
    automationResults,
  }
}

/**
 * Resolve account IDs to platform names, supporting both dummy and real GetLate accounts.
 */
async function resolveAccountPlatforms(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  accountIds: string[],
  companyId: string,
): Promise<string[]> {
  const DUMMY_MAP: Record<string, string> = {
    'dummy-facebook': 'facebook',
    'dummy-instagram': 'instagram',
    'dummy-twitter': 'twitter',
    'dummy-linkedin': 'linkedin',
    'dummy-tiktok': 'tiktok',
    'dummy-threads': 'threads',
    'dummy-bluesky': 'bluesky',
    'dummy-pinterest': 'pinterest',
  }

  const platforms: string[] = []
  const realIds: string[] = []

  for (const id of accountIds) {
    if (DUMMY_MAP[id]) {
      platforms.push(DUMMY_MAP[id])
    } else {
      realIds.push(id)
    }
  }

  if (realIds.length > 0) {
    // Fetch company's GetLate profile to resolve real account platforms
    const { data: company } = await supabase
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', companyId)
      .single()

    if (company?.getlate_profile_id) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/getlate-accounts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'list', profileId: company.getlate_profile_id }),
        })
        if (res.ok) {
          const { accounts } = await res.json()
          for (const acc of (accounts || [])) {
            if (realIds.includes(acc.id || acc._id)) {
              platforms.push(acc.platform || 'unknown')
            }
          }
        }
      } catch (e) {
        console.error('Failed to resolve account platforms:', e)
      }
    }
  }

  return [...new Set(platforms.filter(p => p !== 'unknown'))]
}

/**
 * Log an automation event to the automation_logs table.
 */
async function logAutomation(
  supabase: ReturnType<typeof createClient>,
  log: {
    company_id: string; rule_id?: string; rule_name: string;
    feed_id?: string; feed_item_id?: string;
    article_title?: string; article_link?: string;
    action: string; result: 'success' | 'error' | 'skipped';
    error_message?: string; details?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from('automation_logs').insert({
      company_id: log.company_id,
      rule_id: log.rule_id || null,
      rule_name: log.rule_name,
      feed_id: log.feed_id || null,
      feed_item_id: log.feed_item_id || null,
      article_title: log.article_title || null,
      article_link: log.article_link || null,
      action: log.action,
      result: log.result,
      error_message: log.error_message || null,
      details: log.details || {},
    })
  } catch (e) {
    console.error('Failed to write automation log:', e)
  }
}

/**
 * After new RSS items are inserted, find matching automation rules
 * and trigger AI post generation + the rule's action.
 */
async function processAutomationRules(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  feed: { id: string; company_id: string },
  newItems: Array<{
    feed_id: string; guid: string; title: string | null; link: string | null;
    description: string | null; full_content: string | null;
    image_url: string | null; published_at: string | null; status: string;
  }>,
) {
  // Query active rules for this company that match this feed (or all feeds)
  const { data: rules, error: rulesError } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('company_id', feed.company_id)
    .eq('is_active', true)
    .or(`feed_id.is.null,feed_id.eq.${feed.id}`)

  if (rulesError || !rules || rules.length === 0) {
    console.log('No matching automation rules found')
    return []
  }

  console.log(`Found ${rules.length} automation rule(s) to process`)
  const results = []

  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  for (const rule of rules) {
    const platforms = await resolveAccountPlatforms(supabase, supabaseUrl, serviceRoleKey, rule.account_ids || [], feed.company_id)
    if (platforms.length === 0) {
      console.log(`Rule "${rule.name}" has no platforms, skipping`)
      continue
    }

    for (const item of newItems) {
      const logBase = {
        company_id: feed.company_id,
        rule_id: rule.id,
        rule_name: rule.name,
        feed_id: feed.id,
        article_title: item.title || undefined,
        article_link: item.link || undefined,
      }

      try {
        console.log(`Processing rule "${rule.name}" for article "${item.title}"`)

        // Step 1: Generate strategy
        const strategyRes = await fetch(`${supabaseUrl}/functions/v1/generate-social-post`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'strategy',
            title: item.title,
            description: item.description,
            link: item.link,
            fullContent: item.full_content,
            objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            platforms,
          }),
        })

        if (!strategyRes.ok) {
          const errText = await strategyRes.text()
          console.error(`Strategy generation failed for "${item.title}":`, errText)
          await logAutomation(supabase, { ...logBase, action: 'strategy_generation', result: 'error', error_message: `Strategy generation failed (${strategyRes.status})` })
          results.push({ rule: rule.name, article: item.title, success: false, error: 'Strategy generation failed' })
          continue
        }

        const { strategy } = await strategyRes.json()
        if (!strategy) {
          await logAutomation(supabase, { ...logBase, action: 'strategy_generation', result: 'error', error_message: 'Empty strategy returned' })
          results.push({ rule: rule.name, article: item.title, success: false, error: 'Empty strategy' })
          continue
        }

        // Step 2: Generate posts
        const postsRes = await fetch(`${supabaseUrl}/functions/v1/generate-social-post`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'posts',
            title: item.title,
            description: item.description,
            link: item.link,
            fullContent: item.full_content,
            imageUrl: item.image_url,
            objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            platforms,
            approvedStrategy: strategy,
          }),
        })

        if (!postsRes.ok) {
          const errText = await postsRes.text()
          console.error(`Post generation failed for "${item.title}":`, errText)
          await logAutomation(supabase, { ...logBase, action: 'post_generation', result: 'error', error_message: `Post generation failed (${postsRes.status})` })
          results.push({ rule: rule.name, article: item.title, success: false, error: 'Post generation failed' })
          continue
        }

        const { posts: platformContents } = await postsRes.json()
        if (!platformContents || Object.keys(platformContents).length === 0) {
          await logAutomation(supabase, { ...logBase, action: 'post_generation', result: 'error', error_message: 'Empty posts returned' })
          results.push({ rule: rule.name, article: item.title, success: false, error: 'Empty posts' })
          continue
        }

        // Step 3: Execute action
        const actionResult = await executeRuleAction(
          supabase, supabaseUrl, serviceRoleKey, supabaseAnonKey,
          rule, item, platformContents, strategy, platforms,
        )
        results.push({ rule: rule.name, article: item.title, ...actionResult })

        // Log the final action result
        await logAutomation(supabase, {
          ...logBase,
          action: rule.action,
          result: actionResult.success ? 'success' : 'error',
          error_message: actionResult.error || undefined,
          details: {
            platforms,
            action_result: actionResult.action || rule.action,
            draft_id: actionResult.draftId || undefined,
            post_id: actionResult.postId || undefined,
          },
        })

        // Mark item as processed (for publish and send_approval)
        if (rule.action !== 'draft') {
          await supabase
            .from('rss_feed_items')
            .update({ status: 'posted', processed_at: new Date().toISOString(), post_id: actionResult.postId || null })
            .eq('guid', item.guid)
            .eq('feed_id', item.feed_id)
        }

      } catch (err) {
        console.error(`Error processing rule "${rule.name}" for "${item.title}":`, err)
        await logAutomation(supabase, { ...logBase, action: rule.action, result: 'error', error_message: String(err) })
        results.push({ rule: rule.name, article: item.title, success: false, error: String(err) })
      }
    }
  }

  return results
}

/**
 * Execute the automation rule's action: publish, send_approval, or draft.
 */
async function executeRuleAction(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  anonKey: string,
  rule: { action: string; approval_emails: string[]; account_ids: string[]; company_id: string; objective: string },
  item: { title: string | null; link: string | null; image_url: string | null; description: string | null },
  platformContents: Record<string, string>,
  strategy: string,
  platforms: string[],
) {
  const isDummy = (rule.account_ids || []).every(id => id.startsWith('dummy-'))

  // Helper: find a user in the company for draft/approval attribution
  async function findCompanyUser(): Promise<string | null> {
    // Try profiles first
    const { data: profileUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', rule.company_id)
      .limit(1)
      .single()
    if (profileUser?.id) return profileUser.id

    // Fallback: use the company creator
    const { data: company } = await supabase
      .from('companies')
      .select('created_by')
      .eq('id', rule.company_id)
      .single()
    return company?.created_by || null
  }

  if (rule.action === 'draft' || isDummy) {
    // Create a post draft
    const creatorId = await findCompanyUser()
    if (!creatorId) {
      return { success: false, error: 'No user found in company for draft creation' }
    }

    const { data: draft, error: draftError } = await supabase
      .from('post_drafts')
      .insert({
        company_id: rule.company_id,
        created_by: creatorId,
        title: item.title || 'Untitled',
        post_source: 'automation',
        objective: rule.objective === 'auto' ? 'reach' : rule.objective,
        selected_account_ids: rule.account_ids,
        strategy,
        platform_contents: platformContents,
        image_url: item.image_url || null,
        compose_phase: 'review',
        status: 'draft',
        current_step: 3,
      })
      .select('id')
      .single()

    if (draftError) {
      console.error('Draft creation failed:', draftError)
      return { success: false, error: draftError.message }
    }

    return { success: true, action: isDummy ? 'publish_as_draft_dummy' : 'draft', draftId: draft?.id }
  }

  if (rule.action === 'send_approval') {
    const creatorId = await findCompanyUser()
    // Send approval emails to each recipient
    for (const email of rule.approval_emails) {
      try {
        const { data: approval, error: approvalError } = await supabase
          .from('post_approvals')
          .insert({
            company_id: rule.company_id,
            created_by: creatorId || '00000000-0000-0000-0000-000000000000',
            recipient_email: email,
            platform_contents: platformContents,
            article_title: item.title || null,
            article_link: item.link || null,
            article_image_url: item.image_url || null,
            objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            image_url: item.image_url || null,
            selected_account_ids: rule.account_ids,
          })
          .select('id, token')
          .single()

        if (approvalError) {
          console.error('Approval record creation failed:', approvalError)
          continue
        }

        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey && approval) {
          const appUrl = Deno.env.get('SITE_URL') || 'https://social.longtale.ai'
          const approvalUrl = `${appUrl}/approve/${approval.token}`

          const postsHtml = Object.entries(platformContents).map(([platform, content]) => `
            <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa;">
              <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600; text-transform: capitalize; color: #374151;">${platform}</h3>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #1f2937; line-height: 1.5;">${String(content).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          `).join('')

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'GetLate <noreply@longtale.ai>',
              to: [email],
              subject: `Review & Approve Posts${item.title ? `: ${item.title}` : ''}`,
              html: `
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">Post Approval Request 📋</h1>
                  </div>
                  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 15px; margin-bottom: 16px;">An automation rule has generated the following social media posts for your approval.</p>
                    ${item.title ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Article: <strong>${item.title}</strong></p>` : ''}
                    ${postsHtml}
                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${approvalUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Review & Approve</a>
                    </div>
                    <p style="font-size: 13px; color: #9ca3af; text-align: center;">This link expires in 7 days.</p>
                  </div>
                </body></html>
              `,
            }),
          })
          console.log(`Approval email sent to ${email}`)
        }
      } catch (emailErr) {
        console.error(`Failed to send approval to ${email}:`, emailErr)
      }
    }
    return { success: true, action: 'send_approval', emails: rule.approval_emails }
  }

  if (rule.action === 'publish') {
    // Get the company's GetLate profile ID for real publishing
    const { data: company } = await supabase
      .from('companies')
      .select('getlate_profile_id')
      .eq('id', rule.company_id)
      .single()

    const profileId = company?.getlate_profile_id
    if (!profileId) {
      console.error('Company has no GetLate profile ID, cannot publish')
      return { success: false, error: 'Company has no connected GetLate profile. Connect accounts first.' }
    }

    // Build the unified content string from platform contents
    const contentText = Object.values(platformContents)[0] || ''

    // Build media items if article has an image
    const mediaItems = item.image_url ? [{ url: item.image_url, type: 'image' }] : []

    // Resolve account-to-platform mapping so we can send platform-specific content
    const accountPlatformMap: Record<string, string> = {}
    if (company?.getlate_profile_id) {
      try {
        const accRes = await fetch(`${supabaseUrl}/functions/v1/getlate-accounts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', profileId: company.getlate_profile_id }),
        })
        if (accRes.ok) {
          const { accounts } = await accRes.json()
          for (const acc of (accounts || [])) {
            const aid = acc.id || acc._id
            if (rule.account_ids.includes(aid)) {
              accountPlatformMap[aid] = acc.platform || 'unknown'
            }
          }
        }
      } catch (e) { console.error('Failed to resolve account platforms for publish:', e) }
    }

    // Build explicit per-account platforms array with platform-specific content
    const platformsPayload = rule.account_ids.map((accountId: string) => {
      const platform = accountPlatformMap[accountId] || 'unknown'
      const specificContent = platformContents[platform] || contentText
      return { accountId, content: specificContent, platform }
    })

    console.log(`Publishing to GetLate: profileId=${profileId}, accounts=${rule.account_ids.join(',')}`)

    const publishRes = await fetch(`${supabaseUrl}/functions/v1/getlate-posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        profileId,
        accountIds: rule.account_ids,
        content: contentText,
        mediaItems,
        publishNow: true,
        platforms: platformsPayload,
        source: 'automation',
        objective: rule.objective === 'auto' ? 'reach' : rule.objective,
      }),
    })

    const publishData = await publishRes.json()
    if (!publishRes.ok || !publishData.success) {
      console.error('GetLate publish failed:', publishData)
      return { success: false, error: publishData.error || 'Failed to publish to GetLate' }
    }

    const postId = publishData.post?._id || publishData.post?.id || null
    console.log(`Published successfully, post ID: ${postId}`)
    return { success: true, action: 'publish', postId }
  }

  return { success: false, error: `Unknown action: ${rule.action}` }
}
