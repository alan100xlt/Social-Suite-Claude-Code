import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

// ─── Configuration ───────────────────────────────────────────
const LINEAR_API_URL = 'https://api.linear.app/graphql';
const LINEAR_TEAM_ID = '77c0f6ee';
const LINEAR_PROJECT_ID = '735d7b90';

/** Only monitor these job name prefixes */
const MONITORED_PREFIXES = ['inbox-sync', 'analytics-sync', 'rss-poll'];

/** Minimum consecutive errors to trigger escalation */
const ESCALATION_THRESHOLD = 3;

/** Don't create duplicate Linear issues within this window */
const DEDUP_WINDOW_HOURS = 6;

/** Number of recent logs to check per job */
const LOOKBACK_COUNT = 5;

// ─── Error Diagnosis ─────────────────────────────────────────

interface Diagnosis {
  category: string;
  suggestedFix: string;
}

function diagnoseError(errorMessages: string[]): Diagnosis {
  const combined = errorMessages.join(' ').toLowerCase();

  if (combined.includes('timeout') || combined.includes('timed out') || combined.includes('deadline')) {
    return {
      category: 'Timeout',
      suggestedFix: 'The external API or Supabase query is taking too long. Check if the GetLate API is experiencing latency. Consider reducing batch size or increasing the deadline guard.',
    };
  }

  if (combined.includes('401') || combined.includes('unauthorized') || combined.includes('invalid token')) {
    return {
      category: 'Authentication',
      suggestedFix: 'API key may have expired or been rotated. Verify GETLATE_API_KEY in Supabase secrets: `supabase secrets list`. Re-set with `supabase secrets set GETLATE_API_KEY=...`',
    };
  }

  if (combined.includes('403') || combined.includes('forbidden')) {
    return {
      category: 'Authorization',
      suggestedFix: 'The API key lacks required permissions. Check the GetLate dashboard for scope/permission changes on the profile.',
    };
  }

  if (combined.includes('429') || combined.includes('rate limit') || combined.includes('too many requests')) {
    return {
      category: 'Rate Limit',
      suggestedFix: 'Rate limited by upstream API. Reduce cron frequency or add exponential backoff. Consider contacting GetLate support for higher limits.',
    };
  }

  if (combined.includes('500') || combined.includes('502') || combined.includes('503') || combined.includes('internal server error')) {
    return {
      category: 'Upstream Server Error',
      suggestedFix: 'The upstream API is returning server errors. This is likely transient. If it persists beyond 1 hour, check the GetLate status page or contact support.',
    };
  }

  if (combined.includes('econnrefused') || combined.includes('dns') || combined.includes('network') || combined.includes('fetch failed')) {
    return {
      category: 'Network',
      suggestedFix: 'Network connectivity issue between Supabase Edge Functions and the upstream API. Check Supabase status page. If persistent, try redeploying the edge function.',
    };
  }

  if (combined.includes('json') || combined.includes('parse') || combined.includes('unexpected token')) {
    return {
      category: 'Response Parsing',
      suggestedFix: 'The API response format changed or returned invalid JSON. Check if the upstream API had a breaking change. Review the raw response in cron_health_logs details.',
    };
  }

  if (combined.includes('rls') || combined.includes('row-level security') || combined.includes('policy')) {
    return {
      category: 'Database RLS',
      suggestedFix: 'Row-level security policy is blocking the operation. Verify the edge function is using the service_role key, not the anon key.',
    };
  }

  return {
    category: 'Unknown',
    suggestedFix: 'Review the error messages in the cron_health_logs table for more context. Check Supabase Edge Function logs in the dashboard.',
  };
}

// ─── Linear API Helpers ──────────────────────────────────────

async function findOrCreateLabel(apiKey: string): Promise<string | null> {
  // Search for existing "cron-failure" label on the team
  const searchRes = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query {
        issueLabels(filter: { name: { eq: "cron-failure" }, team: { id: { eq: "${LINEAR_TEAM_ID}" } } }) {
          nodes { id name }
        }
      }`,
    }),
  });

  const searchData = await searchRes.json();
  const labels = searchData?.data?.issueLabels?.nodes || [];

  if (labels.length > 0) {
    return labels[0].id;
  }

  // Create the label
  const createRes = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation {
        issueLabelCreate(input: {
          teamId: "${LINEAR_TEAM_ID}"
          name: "cron-failure"
          color: "#ef4444"
        }) {
          success
          issueLabel { id }
        }
      }`,
    }),
  });

  const createData = await createRes.json();
  return createData?.data?.issueLabelCreate?.issueLabel?.id || null;
}

async function createLinearIssue(
  apiKey: string,
  title: string,
  description: string,
  priority: number,
  labelId: string | null,
): Promise<{ id: string; identifier: string; url: string } | null> {
  const labelInput = labelId ? `, labelIds: ["${labelId}"]` : '';

  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation {
        issueCreate(input: {
          teamId: "${LINEAR_TEAM_ID}"
          projectId: "${LINEAR_PROJECT_ID}"
          title: ${JSON.stringify(title)}
          description: ${JSON.stringify(description)}
          priority: ${priority}
          ${labelInput}
        }) {
          success
          issue { id identifier url }
        }
      }`,
    }),
  });

  const data = await res.json();
  if (data?.data?.issueCreate?.success) {
    return data.data.issueCreate.issue;
  }
  console.error('Failed to create Linear issue:', JSON.stringify(data));
  return null;
}

async function addLinearComment(apiKey: string, issueId: string, body: string): Promise<boolean> {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation {
        commentCreate(input: {
          issueId: "${issueId}"
          body: ${JSON.stringify(body)}
        }) {
          success
        }
      }`,
    }),
  });

  const data = await res.json();
  return data?.data?.commentCreate?.success === true;
}

// ─── Main Handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await authorize(req, { allowServiceRole: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const linearApiKey = Deno.env.get('LINEAR_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const monitor = new CronMonitor('cron-escalation-every-30-min', supabase);
  await monitor.start();

  try {
    if (!linearApiKey) {
      throw new Error('LINEAR_API_KEY secret is not set. Cannot create escalation issues.');
    }

    // ── 1. Get distinct job names matching our prefixes ──
    const { data: allLogs, error: logsError } = await supabase
      .from('cron_health_logs')
      .select('job_name')
      .neq('job_name', 'cron-escalation-every-30-min')
      .order('created_at', { ascending: false })
      .limit(500);

    if (logsError) throw logsError;

    // Filter to monitored prefixes and deduplicate job names
    const jobNames = new Set<string>();
    for (const log of allLogs || []) {
      if (MONITORED_PREFIXES.some((prefix) => log.job_name.startsWith(prefix))) {
        jobNames.add(log.job_name);
      }
    }

    console.log(`[cron-escalation] Checking ${jobNames.size} monitored jobs`);

    const escalations: Array<{ jobName: string; action: string; issueId?: string }> = [];
    const autoResolutions: Array<{ jobName: string; issueId: string }> = [];

    // ── 2. Find or create the "cron-failure" label once ──
    let labelId: string | null = null;
    let labelFetched = false;

    for (const jobName of jobNames) {
      // ── 3. Get the last N logs for this job ──
      const { data: recentLogs, error: recentError } = await supabase
        .from('cron_health_logs')
        .select('id, status, error_message, created_at, details')
        .eq('job_name', jobName)
        .neq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(LOOKBACK_COUNT);

      if (recentError || !recentLogs || recentLogs.length === 0) continue;

      // Count consecutive errors from the most recent log
      let consecutiveErrors = 0;
      const errorMessages: string[] = [];
      const errorTimestamps: string[] = [];

      for (const log of recentLogs) {
        if (log.status === 'error') {
          consecutiveErrors++;
          if (log.error_message) errorMessages.push(log.error_message);
          errorTimestamps.push(log.created_at);
        } else {
          break; // Stop at first non-error
        }
      }

      // ── 4. Check for auto-resolution (previously escalated, now healthy) ──
      if (consecutiveErrors === 0) {
        // Last 3+ runs are success — check if we previously escalated this job
        const successCount = recentLogs.filter((l) => l.status === 'success').length;
        if (successCount >= 3) {
          const { data: prevEscalation } = await supabase
            .from('cron_health_logs')
            .select('details')
            .eq('job_name', 'cron-escalation-every-30-min')
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(20);

          // Find the most recent escalation log for this job
          for (const esc of prevEscalation || []) {
            const details = esc.details as Record<string, unknown> | null;
            if (
              details?.escalated_job === jobName &&
              details?.linear_issue_id &&
              !details?.auto_resolved
            ) {
              const issueId = details.linear_issue_id as string;
              const resolveComment = [
                '## Auto-Resolved',
                '',
                `The cron job \`${jobName}\` has recovered and completed ${successCount} consecutive successful runs.`,
                '',
                `Resolved at: ${new Date().toISOString()}`,
              ].join('\n');

              const commented = await addLinearComment(linearApiKey, issueId, resolveComment);
              if (commented) {
                autoResolutions.push({ jobName, issueId });

                // Mark this escalation as auto-resolved
                await supabase.from('cron_health_logs').insert({
                  job_name: 'cron-escalation-every-30-min',
                  status: 'success',
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  duration_ms: 0,
                  details: {
                    escalated_job: jobName,
                    linear_issue_id: issueId,
                    auto_resolved: true,
                    resolved_at: new Date().toISOString(),
                  },
                });
              }
              break; // Only resolve the most recent escalation
            }
          }
        }
        continue;
      }

      // ── 5. Check if escalation threshold is met ──
      if (consecutiveErrors < ESCALATION_THRESHOLD) continue;

      // ── 6. Dedup check: was this job escalated within the last N hours? ──
      const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      const { data: recentEscalations } = await supabase
        .from('cron_health_logs')
        .select('id, details')
        .eq('job_name', 'cron-escalation-every-30-min')
        .eq('status', 'success')
        .gte('created_at', dedupCutoff)
        .order('created_at', { ascending: false })
        .limit(50);

      const alreadyEscalated = (recentEscalations || []).some((esc) => {
        const details = esc.details as Record<string, unknown> | null;
        return details?.escalated_job === jobName && !details?.auto_resolved;
      });

      if (alreadyEscalated) {
        console.log(`[cron-escalation] Skipping ${jobName} — already escalated within ${DEDUP_WINDOW_HOURS}h`);
        escalations.push({ jobName, action: 'skipped_dedup' });
        continue;
      }

      // ── 7. Create Linear issue ──
      if (!labelFetched) {
        labelId = await findOrCreateLabel(linearApiKey);
        labelFetched = true;
      }

      const diagnosis = diagnoseError(errorMessages);
      const priority = consecutiveErrors >= 5 ? 1 : 2; // 1=urgent, 2=high

      const title = `[Auto] Cron failure: ${jobName} — ${consecutiveErrors} consecutive errors`;

      const supabaseDashboardUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/default/editor`;

      const description = [
        `## Automated Cron Failure Escalation`,
        '',
        `**Job:** \`${jobName}\``,
        `**Consecutive Errors:** ${consecutiveErrors}`,
        `**Priority:** ${priority === 1 ? 'Urgent (5+ failures)' : 'High (3-4 failures)'}`,
        `**Detected at:** ${new Date().toISOString()}`,
        '',
        '---',
        '',
        '### Error Messages',
        '',
        ...errorMessages.slice(0, 5).map((msg, i) => `${i + 1}. \`${msg.slice(0, 300)}\``),
        '',
        '### Error Timestamps',
        '',
        ...errorTimestamps.slice(0, 5).map((ts) => `- ${ts}`),
        '',
        '---',
        '',
        '### Diagnosis',
        '',
        `**Category:** ${diagnosis.category}`,
        '',
        `**Suggested Fix:** ${diagnosis.suggestedFix}`,
        '',
        '---',
        '',
        '### Quick Links',
        '',
        `- [Supabase Dashboard](${supabaseDashboardUrl})`,
        `- [Edge Function Logs](${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/default/functions)`,
        `- [Cron Health Admin](/app/admin/cron-health)`,
        '',
        '---',
        '',
        '*This issue was created automatically by the `cron-escalation` edge function. It will auto-resolve when 3+ consecutive successful runs are detected.*',
      ].join('\n');

      const issue = await createLinearIssue(linearApiKey, title, description, priority, labelId);

      if (issue) {
        console.log(`[cron-escalation] Created Linear issue ${issue.identifier} for ${jobName}`);

        // Log the escalation to prevent duplicates
        await supabase.from('cron_health_logs').insert({
          job_name: 'cron-escalation-every-30-min',
          status: 'success',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: 0,
          details: {
            escalated_job: jobName,
            consecutive_errors: consecutiveErrors,
            error_category: diagnosis.category,
            linear_issue_id: issue.id,
            linear_issue_identifier: issue.identifier,
            linear_issue_url: issue.url,
            auto_resolved: false,
          },
        });

        escalations.push({ jobName, action: 'created', issueId: issue.identifier });
      } else {
        escalations.push({ jobName, action: 'failed_to_create' });
      }
    }

    // ── 8. Report results ──
    const summary = {
      jobs_checked: jobNames.size,
      escalations,
      auto_resolutions: autoResolutions,
    };

    console.log(`[cron-escalation] Done:`, JSON.stringify(summary));
    await monitor.success(summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[cron-escalation] Error:', error);
    await monitor.error(error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
