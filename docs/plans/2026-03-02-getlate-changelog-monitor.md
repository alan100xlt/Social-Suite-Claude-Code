# GetLate Changelog Monitor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A daily scheduled job that scrapes the GetLate changelog, runs AI analysis (Claude) to assess impact on our codebase and business, and posts a Slack message with a "Create Linear Issue" button.

**Architecture:** Two new Supabase edge functions (`getlate-changelog-monitor` for the daily cron job, `getlate-changelog-action` as the Slack interactivity webhook). A new DB table `getlate_changelog_checks` tracks which changelog entries have been processed. `pg_cron` triggers the monitor at 9am UTC daily via `pg_net`.

**Tech Stack:** Deno/TypeScript (Supabase edge functions), Anthropic Claude API (`claude-sonnet-4-6`), Slack Block Kit (interactive messages + signing secret verification), Linear REST API, pg_cron + pg_net (Supabase scheduled jobs), HTML string parsing (no headless browser).

---

## Context: Key Patterns to Follow

- All edge functions follow the pattern in `supabase/functions/analytics-sync/index.ts` — use `CronMonitor` from `../_shared/cron-monitor.ts`, `authorize` from `../_shared/authorize.ts`
- API base: `https://getlate.dev/api/v1` (already used in existing functions)
- GetLate changelog URL: `https://docs.getlate.dev/changelog`
- Env vars available in edge functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (needs to be set), `SLACK_SIGNING_SECRET` (needs to be set), `LINEAR_API_KEY` (needs to be set)
- Slack interactivity: button clicks POST to a registered endpoint. We'll register `getlate-changelog-action` as the Slack interactivity URL in the Slack app settings.
- Linear REST API base: `https://api.linear.app/graphql`
- pg_cron is already enabled (see `supabase/migrations/20260124080643_cf2e1391-507e-4f2a-b7f4-73f938cfc256.sql`)

---

## Task 1: DB Migration — `getlate_changelog_checks` table

**Files:**
- Create: `supabase/migrations/20260302100000_getlate_changelog_monitor.sql`

**Step 1: Write the migration**

```sql
-- Create table to track processed GetLate changelog entries
CREATE TABLE IF NOT EXISTS public.getlate_changelog_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_entry_id TEXT,           -- e.g. "2026-02-15" or slug from changelog
  entries_found INT NOT NULL DEFAULT 0,
  new_entries JSONB,                 -- array of { id, title, date, content }
  ai_analysis JSONB,                 -- { impact_score, impact_summary, code_changes, business_value }
  slack_message_ts TEXT,             -- Slack message timestamp (for updating the message)
  linear_issue_url TEXT,             -- Set after user clicks "Create Linear Issue"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'no_new', 'analyzed', 'error')),
  error_message TEXT
);

-- Only superadmin / service role should access this
ALTER TABLE public.getlate_changelog_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.getlate_changelog_checks
  USING (false);  -- blocks all anon/user access; service role bypasses RLS

-- Index for quickly finding the latest check
CREATE INDEX IF NOT EXISTS idx_changelog_checks_checked_at
  ON public.getlate_changelog_checks (checked_at DESC);
```

**Step 2: Apply the migration**

```bash
# From repo root
npx supabase db push
```

Expected: migration applies without error. Verify with `npx supabase db diff` — should show no pending changes.

**Step 3: Commit**

```bash
git add supabase/migrations/20260302100000_getlate_changelog_monitor.sql
git commit -m "feat(db): add getlate_changelog_checks table for changelog monitor"
```

---

## Task 2: `getlate-changelog-monitor` edge function

**Files:**
- Create: `supabase/functions/getlate-changelog-monitor/index.ts`

This function:
1. Fetches and parses the GetLate changelog HTML
2. Compares against the last processed entry in the DB
3. If new entries exist, calls Claude API for analysis
4. Posts a Slack Block Kit message with a "Create Linear Issue" button
5. Logs to `getlate_changelog_checks` and `CronMonitor`

**Step 1: Create the function file**

```typescript
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
      const { data: noNewCheck } = await supabase
        .from('getlate_changelog_checks')
        .insert({
          last_seen_entry_id: lastSeenId,
          entries_found: 0,
          status: 'no_new',
        })
        .select()
        .single();

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
```

**Step 2: Verify TypeScript compiles (no Deno runtime needed)**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new file (Deno globals are type-checked separately).

**Step 3: Commit**

```bash
git add supabase/functions/getlate-changelog-monitor/index.ts
git commit -m "feat(edge): add getlate-changelog-monitor edge function"
```

---

## Task 3: `getlate-changelog-action` edge function (Slack interactivity webhook)

**Files:**
- Create: `supabase/functions/getlate-changelog-action/index.ts`

This function receives Slack button click payloads, verifies the Slack signing secret, fetches the analysis from DB, and creates a Linear issue.

**Step 1: Create the function file**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';

// ── Slack signature verification ───────────────────────────────────────────

async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET');
  if (!signingSecret) {
    console.warn('SLACK_SIGNING_SECRET not set — skipping verification in dev');
    return true;
  }

  const timestamp = req.headers.get('x-slack-request-timestamp');
  const slackSignature = req.headers.get('x-slack-signature');

  if (!timestamp || !slackSignature) return false;

  // Replay attack prevention: reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  const hex = 'v0=' + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hex === slackSignature;
}

// ── Linear issue creation ──────────────────────────────────────────────────

async function createLinearIssue(
  analysis: {
    impact_score: string;
    impact_summary: string;
    code_changes_needed: string[];
    business_value: string;
  },
  entries: Array<{ title: string; date: string; content: string }>,
  linearApiKey: string
): Promise<string> {
  const entryTitles = entries.map(e => `${e.title} (${e.date})`).join(', ');
  const codeChangesList = analysis.code_changes_needed
    .map(c => `- [ ] ${c}`)
    .join('\n');

  const title = `GetLate API Update (${analysis.impact_score.toUpperCase()}): ${entryTitles}`;
  const description = `## GetLate Changelog Update

**Impact:** ${analysis.impact_score.toUpperCase()}

## What Changed
${analysis.impact_summary}

## Business Value
${analysis.business_value}

## Code Changes Needed
${codeChangesList || '- No code changes required'}

## Source
- [GetLate Changelog](https://docs.getlate.dev/changelog)
- Auto-generated by getlate-changelog-monitor
`;

  // Map impact score to Linear priority (1=urgent, 2=high, 3=medium, 4=low)
  const priorityMap: Record<string, number> = { high: 2, medium: 3, low: 4, none: 4 };
  const priority = priorityMap[analysis.impact_score] ?? 3;

  // Get the team ID first (we need it to create issues)
  const teamsQuery = `query { teams { nodes { id name } } }`;
  const teamsResponse = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': linearApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: teamsQuery }),
  });

  const teamsData = await teamsResponse.json();
  const teams = teamsData?.data?.teams?.nodes ?? [];
  if (teams.length === 0) throw new Error('No Linear teams found');

  // Use first team — adjust if needed
  const teamId = teams[0].id;

  const createMutation = `
    mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int) {
      issueCreate(input: { title: $title, description: $description, teamId: $teamId, priority: $priority }) {
        success
        issue { id identifier url }
      }
    }
  `;

  const createResponse = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': linearApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: createMutation,
      variables: { title, description, teamId, priority },
    }),
  });

  const createData = await createResponse.json();
  const issue = createData?.data?.issueCreate?.issue;

  if (!issue?.url) {
    throw new Error(`Linear issue creation failed: ${JSON.stringify(createData)}`);
  }

  return issue.url;
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Slack sends POST with application/x-www-form-urlencoded payload
  const rawBody = await req.text();

  // Verify Slack signature
  const isValid = await verifySlackSignature(req, rawBody);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse Slack payload
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) {
    return new Response('Missing payload', { status: 400 });
  }

  let payload: {
    type: string;
    actions?: Array<{ action_id: string; value: string }>;
    response_url?: string;
    user?: { name: string };
  };

  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return new Response('Invalid payload JSON', { status: 400 });
  }

  if (payload.type !== 'block_actions') {
    return new Response('OK', { status: 200 });
  }

  const action = payload.actions?.[0];
  if (!action || action.action_id !== 'create_linear_issue') {
    return new Response('OK', { status: 200 });
  }

  const checkId = action.value;
  const responseUrl = payload.response_url;
  const userName = payload.user?.name ?? 'someone';

  // Immediately respond to Slack (must respond within 3 seconds)
  // We'll do the actual work and then update via response_url
  const ackResponse = new Response(
    JSON.stringify({ text: 'Creating Linear issue...' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Process async (Deno edge functions support background tasks via waitUntil-style pattern)
  // We do the work after returning the ack by structuring it as a tail call
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const linearApiKey = Deno.env.get('LINEAR_API_KEY');

  if (!linearApiKey) {
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Error: LINEAR_API_KEY not configured.' }),
      });
    }
    return ackResponse;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch the check record
  const { data: checkRecord, error: fetchError } = await supabase
    .from('getlate_changelog_checks')
    .select('ai_analysis, new_entries')
    .eq('id', checkId)
    .single();

  if (fetchError || !checkRecord) {
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Error: Could not find changelog check record (${checkId}).` }),
      });
    }
    return ackResponse;
  }

  try {
    const issueUrl = await createLinearIssue(
      checkRecord.ai_analysis,
      checkRecord.new_entries ?? [],
      linearApiKey
    );

    // Update the check record with the Linear issue URL
    await supabase
      .from('getlate_changelog_checks')
      .update({ linear_issue_url: issueUrl })
      .eq('id', checkId);

    // Update the Slack message to show success
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace_original: true,
          text: `Linear issue created by ${userName}: ${issueUrl}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Linear issue created by *${userName}*: <${issueUrl}|View Issue>`,
              },
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.error('Failed to create Linear issue:', err);
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Failed to create Linear issue: ${err instanceof Error ? err.message : String(err)}`,
        }),
      });
    }
  }

  return ackResponse;
});
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add supabase/functions/getlate-changelog-action/index.ts
git commit -m "feat(edge): add getlate-changelog-action Slack interactivity webhook"
```

---

## Task 4: pg_cron migration — schedule daily job

**Files:**
- Create: `supabase/migrations/20260302100001_getlate_changelog_cron.sql`

**Step 1: Write the migration**

```sql
-- Schedule getlate-changelog-monitor to run daily at 9am UTC
-- Uses pg_net to call the edge function (pg_cron + pg_net pattern)
-- pg_cron and pg_net are already enabled (see 20260124080643 migration)

SELECT cron.schedule(
  'getlate-changelog-monitor',   -- job name (unique)
  '0 9 * * *',                   -- 9am UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/getlate-changelog-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

> **Note:** `app.settings.edge_function_url` and `app.settings.service_role_key` must be set as Postgres settings in the Supabase dashboard under Database → Settings → Database configuration. The edge function URL format is `https://<project-ref>.supabase.co/functions/v1`. Alternatively, these can be hardcoded as string literals in the SQL (less portable).

**Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: no errors. Verify the job is registered:

```sql
SELECT jobname, schedule, command FROM cron.job;
```

Expected: row with `getlate-changelog-monitor` and `0 9 * * *`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260302100001_getlate_changelog_cron.sql
git commit -m "feat(cron): schedule getlate-changelog-monitor daily at 9am UTC"
```

---

## Task 5: Deploy edge functions + configure env vars

**Step 1: Deploy both edge functions**

```bash
npx supabase functions deploy getlate-changelog-monitor
npx supabase functions deploy getlate-changelog-action
```

Expected: both deploy successfully. Note the function URLs printed — you'll need `getlate-changelog-action`'s URL for Slack.

**Step 2: Set required secrets in Supabase**

```bash
npx supabase secrets set ANTHROPIC_API_KEY=<your-key>
npx supabase secrets set SLACK_WEBHOOK_URL=<incoming-webhook-url>
npx supabase secrets set SLACK_SIGNING_SECRET=<from-slack-app-settings>
npx supabase secrets set LINEAR_API_KEY=<your-linear-personal-api-key>
```

To get these values:
- `ANTHROPIC_API_KEY`: https://console.anthropic.com — API Keys
- `SLACK_WEBHOOK_URL`: Slack app → Incoming Webhooks → create one for your target channel (e.g. #engineering)
- `SLACK_SIGNING_SECRET`: Slack app → Basic Information → App Credentials → Signing Secret
- `LINEAR_API_KEY`: Linear → Settings → API → Personal API keys → create one

**Step 3: Register the Slack interactivity endpoint**

In your Slack app settings → Interactivity & Shortcuts:
- Enable interactivity
- Set Request URL to: `https://<project-ref>.supabase.co/functions/v1/getlate-changelog-action`

**Step 4: Test `getlate-changelog-monitor` manually**

```bash
curl -X POST \
  https://<project-ref>.supabase.co/functions/v1/getlate-changelog-monitor \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{ "success": true, "newEntries": 1, "impactScore": "medium", "lastSeenId": "2026-02-15" }
```

Also verify:
- A row appears in `getlate_changelog_checks` with `status = 'analyzed'`
- A Slack message appears in your configured channel with the analysis and the "Create Linear Issue" button

**Step 5: Test the button**

Click "Create Linear Issue" in Slack.
Expected:
- The Slack message updates to show the Linear issue URL
- The `getlate_changelog_checks` row is updated with `linear_issue_url`
- A Linear issue appears in your team's backlog

**Step 6: Commit any config/docs changes**

```bash
git add .
git commit -m "feat: deploy getlate-changelog-monitor + configure env vars"
```

---

## Task 6: Verify the cron schedule fires correctly

**Step 1: Check cron job is registered**

Via Supabase dashboard → Database → Extensions → pg_cron, or:

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'getlate-changelog-monitor';
```

Expected: one row, `active = true`.

**Step 2: Trigger a test run manually via SQL**

```sql
-- Run the cron job body immediately (bypasses schedule)
SELECT net.http_post(
  url := '<your-edge-function-url>/getlate-changelog-monitor',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <service-role-key>'
  ),
  body := '{}'::jsonb
);
```

**Step 3: Check `cron_health_logs`**

```sql
SELECT job_name, status, started_at, duration_ms, details
FROM cron_health_logs
WHERE job_name = 'getlate-changelog-monitor'
ORDER BY started_at DESC
LIMIT 5;
```

Expected: a row with `status = 'success'`.

**Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: verify getlate-changelog-monitor cron schedule"
```

---

## Env Vars Summary

| Variable | Where to get it | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | getlate-changelog-monitor |
| `SLACK_WEBHOOK_URL` | Slack app → Incoming Webhooks | getlate-changelog-monitor |
| `SLACK_SIGNING_SECRET` | Slack app → Basic Information | getlate-changelog-action |
| `LINEAR_API_KEY` | Linear → Settings → API | getlate-changelog-action |

## Architecture Diagram

```
pg_cron (9am UTC daily)
  └─► pg_net.http_post → getlate-changelog-monitor
        ├─ fetch https://docs.getlate.dev/changelog
        ├─ parse changelog entries
        ├─ compare vs. getlate_changelog_checks.last_seen_entry_id
        ├─ [if new] POST https://api.anthropic.com/v1/messages (claude-sonnet-4-6)
        ├─ INSERT into getlate_changelog_checks
        └─ POST to SLACK_WEBHOOK_URL (Block Kit message + button)
              └─ user clicks button
                    └─► getlate-changelog-action (Slack interactivity endpoint)
                          ├─ verify SLACK_SIGNING_SECRET
                          ├─ fetch check record from getlate_changelog_checks
                          ├─ POST https://api.linear.app/graphql (create issue)
                          ├─ UPDATE getlate_changelog_checks.linear_issue_url
                          └─ UPDATE Slack message with issue URL
```
