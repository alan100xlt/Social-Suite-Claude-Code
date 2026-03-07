/**
 * GetLate Changelog Monitor
 *
 * Runs daily via cron-dispatcher. Fetches the GetLate full docs (llms-full.txt),
 * extracts changelog entries, diffs against last-seen entries, and uses Claude
 * to analyze impact on our codebase. Posts to Slack if significant.
 *
 * Results stored in `getlate_changelog_checks` table.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChangelogEntry {
  id: string;          // YYYY-MM-DD (or YYYY-MM-DD-N for multiple same-day entries)
  date: string;        // e.g. "March 6, 2026"
  type: string;        // "New Feature", "Improvement", "Breaking Change", "Minor"
  title: string;       // first meaningful line
  content: string;     // full text of the entry
}

interface AiAnalysis {
  impact_score: 'high' | 'medium' | 'low' | 'none';
  impact_summary: string;
  code_changes_needed: string[];
  business_value: string;
}

// ── Changelog parser (from llms-full.txt) ─────────────────────────────────

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const response = await fetch('https://docs.getlate.dev/llms-full.txt', {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch llms-full.txt: ${response.status}`);
  }

  const fullText = await response.text();
  return parseChangelog(fullText);
}

function parseChangelog(fullText: string): ChangelogEntry[] {
  // Extract changelog section
  const changelogStart = fullText.indexOf('# Changelog');
  if (changelogStart === -1) return [];

  // Find the end of changelog (next top-level heading after changelog content)
  const afterChangelog = fullText.slice(changelogStart + 12);
  const nextSectionMatch = afterChangelog.match(/\n---\n\n# (?!Changelog)/);
  const changelogText = nextSectionMatch
    ? afterChangelog.slice(0, nextSectionMatch.index)
    : afterChangelog.slice(0, 5000); // safety cap

  // Parse individual entries by date pattern
  const datePattern = /^((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/gm;
  const datePositions: { date: string; index: number }[] = [];
  let match;
  while ((match = datePattern.exec(changelogText)) !== null) {
    datePositions.push({ date: match[1], index: match.index });
  }

  const entries: ChangelogEntry[] = [];
  const dateCounters: Record<string, number> = {};

  for (let i = 0; i < datePositions.length; i++) {
    const start = datePositions[i].index;
    const end = i + 1 < datePositions.length ? datePositions[i + 1].index : changelogText.length;
    const content = changelogText.slice(start, end).trim();
    const dateStr = datePositions[i].date;

    // Extract type tag
    const typeMatch = content.match(/(?:New Feature|Improvement|Breaking Change|Minor)/);
    const type = typeMatch ? typeMatch[0] : 'Unknown';

    // Extract first meaningful line as title (after date + type)
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const titleLine = lines.length > 1 ? lines[1] : dateStr;

    // Generate unique ID (YYYY-MM-DD or YYYY-MM-DD-2 for duplicates)
    const parsedDate = new Date(dateStr);
    const baseId = isNaN(parsedDate.getTime())
      ? dateStr.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : parsedDate.toISOString().split('T')[0];

    dateCounters[baseId] = (dateCounters[baseId] || 0) + 1;
    const id = dateCounters[baseId] === 1 ? baseId : `${baseId}-${dateCounters[baseId]}`;

    entries.push({ id, date: dateStr, type, title: titleLine, content: content.slice(0, 2000) });
  }

  return entries;
}

// ── Claude analysis ────────────────────────────────────────────────────────

const CODEBASE_CONTEXT = `
We use GetLate (formerly Ayrshare) as our social media backend. Our integration:

Edge functions:
- inbox-sync: syncs DMs, comments, and reviews from /inbox/* endpoints (runs every 15 min)
- getlate-inbox: CRUD proxy for reply, archive, label operations
- getlate-webhook: handles real-time comment.received and message.received webhooks
- analytics-sync: syncs post analytics from /analytics endpoints
- getlate-posts: create/list/update/delete posts
- getlate-accounts: manage connected social accounts

Key tables: inbox_conversations, inbox_messages, inbox_contacts, inbox_labels, post_analytics_snapshots

We are a multi-tenant social media SaaS (Longtale.ai) for media companies.
Platforms in active use: Facebook, YouTube, Instagram, Twitter/X, LinkedIn.
Key priorities: unified inbox (DMs, comments, reviews), analytics, content scheduling.
`.trim();

async function analyzeWithClaude(
  entries: ChangelogEntry[],
  anthropicApiKey: string
): Promise<AiAnalysis> {
  const entriesText = entries
    .map(e => `## ${e.type}: ${e.title} (${e.date})\n${e.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are analyzing GetLate API changelog entries for a social media management SaaS.

CODEBASE CONTEXT:
${CODEBASE_CONTEXT}

NEW CHANGELOG ENTRIES:
${entriesText}

Analyze these changes and respond with a JSON object (no markdown fences) with exactly these fields:
{
  "impact_score": "high" | "medium" | "low" | "none",
  "impact_summary": "2-3 sentences describing what changed and how it affects our integration",
  "code_changes_needed": ["list of specific action items"],
  "business_value": "1-2 sentences on whether implementing benefits our customers"
}

Impact scoring:
- high: breaks existing functionality OR adds a major feature our customers would directly benefit from
- medium: new endpoint/feature that's useful but not critical
- low: minor improvement or feature unlikely to affect our use case
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
    signal: AbortSignal.timeout(30_000),
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
    throw new Error(`Failed to parse Claude response: ${text.substring(0, 300)}`);
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
  slackWebhookUrl: string
): Promise<void> {
  const emoji = IMPACT_EMOJI[analysis.impact_score] ?? '⚪';
  const entryTitles = entries.map(e => `• *${e.type}*: ${e.title} (${e.date})`).join('\n');
  const codeChanges = analysis.code_changes_needed.length > 0
    ? analysis.code_changes_needed.map(c => `• ${c}`).join('\n')
    : '• No code changes needed';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} GetLate API Update`, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Impact:* ${emoji} ${analysis.impact_score.toUpperCase()}\n\n${entryTitles}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary:* ${analysis.impact_summary}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Business Value:* ${analysis.business_value}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Code Changes:*\n${codeChanges}` },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '<https://docs.getlate.dev/changelog|View Full Changelog>' }],
    },
  ];

  await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `GetLate changelog update (${analysis.impact_score} impact)`, blocks }),
    signal: AbortSignal.timeout(10_000),
  });
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const monitor = new CronMonitor('getlate-changelog-monitor', supabase);
  await monitor.start();

  try {
    await authorize(req, { allowServiceRole: true });
  } catch (authError) {
    if (authError instanceof Response) return authError;
    throw authError;
  }

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  try {
    // 1. Get last seen entry ID
    const { data: lastCheck } = await supabase
      .from('getlate_changelog_checks')
      .select('last_seen_entry_id')
      .eq('status', 'analyzed')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSeenId = lastCheck?.last_seen_entry_id ?? null;

    // 2. Fetch and parse changelog from llms-full.txt
    const allEntries = await fetchChangelog();

    if (allEntries.length === 0) {
      await monitor.success({ message: 'No entries found in changelog' });
      return new Response(
        JSON.stringify({ success: true, message: 'No entries found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Filter to new entries
    const newEntries = lastSeenId
      ? allEntries.filter(e => e.id > lastSeenId)
      : allEntries.slice(0, 3); // first run: last 3 entries

    if (newEntries.length === 0) {
      // Log the no-new check
      await supabase.from('getlate_changelog_checks').insert({
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

    // 4. AI analysis (if API key available)
    let analysis: AiAnalysis | null = null;
    if (anthropicApiKey) {
      try {
        analysis = await analyzeWithClaude(newEntries, anthropicApiKey);
      } catch (aiErr) {
        console.error('AI analysis failed (non-fatal):', aiErr);
      }
    }

    // 5. Store check record
    const newLastSeenId = newEntries[0].id;
    await supabase.from('getlate_changelog_checks').insert({
      last_seen_entry_id: newLastSeenId,
      entries_found: newEntries.length,
      new_entries: newEntries,
      ai_analysis: analysis,
      status: 'analyzed',
    });

    // 6. Post to Slack (only if impact is medium+ and webhook configured)
    if (analysis && slackWebhookUrl && analysis.impact_score !== 'none' && analysis.impact_score !== 'low') {
      try {
        await postSlackMessage(newEntries, analysis, slackWebhookUrl);
      } catch (slackErr) {
        console.error('Slack notification failed (non-fatal):', slackErr);
      }
    }

    const result = {
      newEntries: newEntries.length,
      impactScore: analysis?.impact_score ?? 'unknown',
      lastSeenId: newLastSeenId,
      entries: newEntries.map(e => ({ id: e.id, date: e.date, type: e.type, title: e.title })),
    };
    await monitor.success(result);

    return new Response(
      JSON.stringify({ success: true, ...result, analysis }),
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
