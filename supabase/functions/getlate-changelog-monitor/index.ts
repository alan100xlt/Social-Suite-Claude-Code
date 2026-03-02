import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChangelogEntry {
  id: string;          // e.g. "2026-02-15" — used as unique key
  date: string;
  title: string;
  content: string;     // raw text of the entry
}

interface AiAnalysis {
  impact_score: 'high' | 'medium' | 'low' | 'none';
  impact_summary: string;         // 2-3 sentences: what changed in the API
  code_changes_needed: string[];  // list of specific files/actions to update
  business_value: string;         // is it worth implementing? why?
}

// ── Changelog scraper ──────────────────────────────────────────────────────

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const response = await fetch('https://docs.getlate.dev/changelog', {
    headers: { 'User-Agent': 'Longtale-ChangelogMonitor/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch changelog: ${response.status}`);
  }

  const html = await response.text();
  return parseChangelogHtml(html);
}

function parseChangelogHtml(html: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // GetLate's docs.getlate.dev/changelog uses a standard docs pattern.
  // Each entry is wrapped in an <article> or a heading + content block.
  // We extract by finding date-stamped headings (h2/h3 with dates like "February 15, 2026").

  // Strategy: split on heading tags, extract date + content pairs.
  // Regex to find section headings that contain a date (Month DD, YYYY or YYYY-MM-DD)
  const sectionPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
  const datePattern = /(\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i;

  let match;
  while ((match = sectionPattern.exec(html)) !== null) {
    const headingRaw = match[1].replace(/<[^>]+>/g, '').trim();
    const bodyRaw = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const dateMatch = datePattern.exec(headingRaw);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    // Normalise to YYYY-MM-DD for use as entry ID
    const parsedDate = new Date(dateStr);
    const id = isNaN(parsedDate.getTime())
      ? dateStr.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : parsedDate.toISOString().split('T')[0];

    const title = headingRaw.replace(datePattern, '').trim() || dateStr;

    entries.push({ id, date: dateStr, title, content: bodyRaw.substring(0, 2000) });
  }

  return entries;
}

// ── Claude analysis ────────────────────────────────────────────────────────

const CODEBASE_CONTEXT = `
We use GetLate as our social media scheduling backend. Our integration consists of 4 Supabase edge functions:

1. getlate-posts: create, list, get, update, delete posts via /posts endpoints
2. getlate-analytics: get analytics, sync, youtube-daily, overview, best-time, content-decay, posting-frequency via /analytics endpoints
3. getlate-accounts: list, get, disconnect, follower-stats via /accounts endpoints
4. getlate-connect: OAuth connection flow, profile management via /profiles and /connect endpoints

We are a multi-tenant social media management SaaS (Longtale.ai) for media companies.
Our customers manage multiple social media accounts across platforms (LinkedIn, Twitter/X, Facebook, Instagram, YouTube).
Key business goals: increase engagement, save time on scheduling, provide analytics insights.
`.trim();

async function analyzeWithClaude(
  entries: ChangelogEntry[],
  anthropicApiKey: string
): Promise<AiAnalysis> {
  const entriesText = entries
    .map(e => `## ${e.title} (${e.date})\n${e.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are analyzing GetLate API changelog entries for a social media management SaaS.

CODEBASE CONTEXT:
${CODEBASE_CONTEXT}

NEW CHANGELOG ENTRIES:
${entriesText}

Analyze these changes and respond with a JSON object (no markdown fences) with exactly these fields:
{
  "impact_score": "high" | "medium" | "low" | "none",
  "impact_summary": "2-3 sentences describing what changed in the API and how it affects our integration",
  "code_changes_needed": ["list of specific action items, e.g. 'Add action youtube-shorts to getlate-posts/index.ts'"],
  "business_value": "1-2 sentences on whether implementing this new feature would benefit our customers and business, and why"
}

Impact scoring guide:
- high: breaks existing functionality OR adds a major feature our customers would directly benefit from
- medium: new endpoint/feature that's useful but not critical
- low: minor improvement, bug fix, or feature unlikely to affect our use case
- none: internal changes, unrelated platforms, or docs-only updates`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  try {
    return JSON.parse(text) as AiAnalysis;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${text.substring(0, 300)}`);
  }
}

// ── Slack notification ─────────────────────────────────────────────────────

const IMPACT_EMOJI: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
  none: '⚪',
};

async function postSlackMessage(
  entries: ChangelogEntry[],
  analysis: AiAnalysis,
  checkId: string,
  slackWebhookUrl: string
): Promise<void> {
  const emoji = IMPACT_EMOJI[analysis.impact_score] ?? '⚪';
  const entryTitles = entries.map(e => `• ${e.title} (${e.date})`).join('\n');
  const codeChanges = analysis.code_changes_needed.length > 0
    ? analysis.code_changes_needed.map(c => `• ${c}`).join('\n')
    : '• No code changes needed';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} GetLate Changelog Update Detected`, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Impact:* ${emoji} ${analysis.impact_score.toUpperCase()}\n\n*What changed:*\n${entryTitles}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary:*\n${analysis.impact_summary}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Business Value:*\n${analysis.business_value}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Code Changes Needed:*\n${codeChanges}` },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Create Linear Issue', emoji: true },
          style: 'primary',
          action_id: 'create_linear_issue',
          value: checkId,  // passed back to getlate-changelog-action
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Changelog', emoji: true },
          url: 'https://docs.getlate.dev/changelog',
          action_id: 'view_changelog',
        },
      ],
    },
  ];

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `GetLate changelog update (${analysis.impact_score} impact)`, blocks }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Slack post failed: ${response.status} — ${err}`);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const monitor = new CronMonitor('getlate-changelog-monitor', supabase);

  try {
    await authorize(req, { allowServiceRole: true });
  } catch (authError) {
    if (authError instanceof Response) return authError;
    throw authError;
  }

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!anthropicApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (!slackWebhookUrl) {
    return new Response(
      JSON.stringify({ success: false, error: 'SLACK_WEBHOOK_URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await monitor.start();

  try {
    // 1. Get last processed entry ID
    const { data: lastCheck } = await supabase
      .from('getlate_changelog_checks')
      .select('last_seen_entry_id')
      .eq('status', 'analyzed')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    const lastSeenId = lastCheck?.last_seen_entry_id ?? null;

    // 2. Fetch and parse changelog
    const allEntries = await fetchChangelog();

    if (allEntries.length === 0) {
      await monitor.success({ message: 'No entries found in changelog' });
      return new Response(
        JSON.stringify({ success: true, message: 'No entries found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Filter to only new entries (newer than lastSeenId)
    const newEntries = lastSeenId
      ? allEntries.filter(e => e.id > lastSeenId)   // lexicographic: YYYY-MM-DD sorts correctly
      : allEntries.slice(0, 1);                      // first run: only process the latest entry

    if (newEntries.length === 0) {
      await supabase
        .from('getlate_changelog_checks')
        .insert({
          last_seen_entry_id: lastSeenId,
          entries_found: 0,
          status: 'no_new',
        });

      await monitor.success({ message: 'No new entries', lastSeenId });
      return new Response(
        JSON.stringify({ success: true, message: 'No new entries', lastSeenId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. AI analysis
    const analysis = await analyzeWithClaude(newEntries, anthropicApiKey);

    // 5. Store check record
    const newLastSeenId = newEntries[0].id;  // entries are newest-first
    const { data: checkRecord } = await supabase
      .from('getlate_changelog_checks')
      .insert({
        last_seen_entry_id: newLastSeenId,
        entries_found: newEntries.length,
        new_entries: newEntries,
        ai_analysis: analysis,
        status: 'analyzed',
      })
      .select()
      .single();

    // 6. Post to Slack (only if impact is not 'none')
    if (analysis.impact_score !== 'none') {
      await postSlackMessage(newEntries, analysis, checkRecord.id, slackWebhookUrl);
    }

    const result = {
      newEntries: newEntries.length,
      impactScore: analysis.impact_score,
      lastSeenId: newLastSeenId,
    };
    await monitor.success(result);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Changelog monitor error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await monitor.error(error instanceof Error ? error : new Error(errorMessage));
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
