import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, AlertTriangle, Lightbulb, ShieldAlert, Wrench, RefreshCw, Clock, Zap } from 'lucide-react';
import { useAdminSyncStatus, type CronHealthLog } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Error Diagnosis Engine ────────────────────────────────

type ErrorCategory = 'api_auth' | 'api_rate_limit' | 'api_timeout' | 'api_server' | 'db_write' | 'db_constraint' | 'data_format' | 'sync_gap' | 'unknown';
type Severity = 'critical' | 'warning' | 'info';

interface ErrorDiagnosis {
  category: ErrorCategory;
  severity: Severity;
  reason: string;
  mitigation: string;
  autoResolvable: boolean;
}

const CATEGORY_LABELS: Record<ErrorCategory, { label: string; icon: typeof ShieldAlert }> = {
  api_auth: { label: 'Auth Failure', icon: ShieldAlert },
  api_rate_limit: { label: 'Rate Limited', icon: Clock },
  api_timeout: { label: 'Timeout', icon: Clock },
  api_server: { label: 'API Error', icon: AlertTriangle },
  db_write: { label: 'DB Write Error', icon: Wrench },
  db_constraint: { label: 'Constraint Violation', icon: Wrench },
  data_format: { label: 'Bad Data', icon: Zap },
  sync_gap: { label: 'Sync Gap', icon: RefreshCw },
  unknown: { label: 'Unknown', icon: AlertTriangle },
};

function diagnoseError(errorStr: string): ErrorDiagnosis {
  const lower = errorStr.toLowerCase();

  // Auth / credential issues
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('403') || lower.includes('invalid api key') || lower.includes('auth')) {
    return {
      category: 'api_auth',
      severity: 'critical',
      reason: 'GetLate API rejected our credentials. The API key may have expired, been rotated, or the account permissions changed.',
      mitigation: 'Verify GETLATE_API_KEY in Supabase secrets (`supabase secrets list`). If expired, generate a new key at getlate.dev/settings and run `supabase secrets set GETLATE_API_KEY=<new_key>`. Redeploy edge functions after.',
      autoResolvable: false,
    };
  }

  // Rate limiting
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('throttl')) {
    return {
      category: 'api_rate_limit',
      severity: 'warning',
      reason: 'GetLate API is rate-limiting our requests. This typically happens when syncing many companies in rapid succession or during high-traffic periods.',
      mitigation: 'Will auto-resolve on next sync cycle. If persistent: increase the cron interval from 5min to 10min, or add exponential backoff in inbox-sync. Consider staggering company syncs with a 1-2s delay between each.',
      autoResolvable: true,
    };
  }

  // Timeouts
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnreset') || lower.includes('socket hang up') || lower.includes('aborted')) {
    return {
      category: 'api_timeout',
      severity: 'warning',
      reason: 'Network timeout connecting to GetLate API. Their servers may be slow or under maintenance, or our edge function hit the execution time limit.',
      mitigation: 'Transient — will auto-resolve on next cycle. If recurring (3+ consecutive): check GetLate status page, reduce batch sizes per sync, or increase edge function timeout in supabase/config.toml.',
      autoResolvable: true,
    };
  }

  // API server errors (5xx)
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('internal server error') || lower.includes('bad gateway') || lower.includes('service unavailable')) {
    const statusMatch = errorStr.match(/(\d{3})/);
    const code = statusMatch?.[1] || '5xx';
    return {
      category: 'api_server',
      severity: 'warning',
      reason: `GetLate API returned ${code} server error. Their backend is experiencing issues — this is on their side, not ours.`,
      mitigation: `Wait for GetLate to recover (typically resolves within 15-30min). If persists beyond 1hr: check getlate.dev status, contact their support. Our sync will automatically catch up on missed data when they recover.`,
      autoResolvable: true,
    };
  }

  // GetLate API returned non-200 (generic)
  if (lower.match(/getlate.*api returned (\d+)/) || lower.match(/returned (\d+)/)) {
    const codeMatch = errorStr.match(/returned (\d+)/);
    const code = codeMatch?.[1] || 'unknown';
    if (code.startsWith('4')) {
      return {
        category: 'data_format',
        severity: 'warning',
        reason: `GetLate API returned HTTP ${code}. The request format may have changed, or a required parameter is missing (profileId, pagination cursor, etc).`,
        mitigation: `Check if GetLate updated their API contract. Verify the company's getlate_profile_id is still valid in the companies table. If the profile was deleted on GetLate's side, update the company record.`,
        autoResolvable: false,
      };
    }
    return {
      category: 'api_server',
      severity: 'warning',
      reason: `GetLate API returned HTTP ${code}. Unexpected response status.`,
      mitigation: `Check GetLate API docs for status code ${code}. Likely transient — will retry on next sync cycle.`,
      autoResolvable: true,
    };
  }

  // Database constraint violations
  if (lower.includes('duplicate') || lower.includes('unique constraint') || lower.includes('violates unique') || lower.includes('conflict') || lower.includes('23505')) {
    return {
      category: 'db_constraint',
      severity: 'info',
      reason: 'Attempted to insert a record that already exists (duplicate platform_message_id or conversation key). This is expected during overlapping sync windows.',
      mitigation: 'No action needed — the sync uses upsert logic for most records. If this is frequent for the same record, the dedup check may be failing due to a changed message ID format from GetLate.',
      autoResolvable: true,
    };
  }

  // Database write errors
  if (lower.includes('insert') || lower.includes('update') || lower.includes('conv insert') || lower.includes('dm conv insert') || lower.includes('rls') || lower.includes('policy')) {
    return {
      category: 'db_write',
      severity: 'critical',
      reason: 'Failed to write data to Supabase. Could be an RLS policy blocking the service role, a schema migration issue, or the table is missing expected columns.',
      mitigation: 'Check Supabase dashboard for recent migration errors. Verify RLS policies allow service_role writes on inbox_* tables. Run `supabase db reset` locally to test schema. If column missing, create a migration.',
      autoResolvable: false,
    };
  }

  // Data format / parsing issues
  if (lower.includes('json') || lower.includes('parse') || lower.includes('undefined') || lower.includes('null') || lower.includes('cannot read prop') || lower.includes('typeerror')) {
    return {
      category: 'data_format',
      severity: 'warning',
      reason: 'Data from GetLate API has an unexpected format. A field we expected is missing, null, or has changed type. This usually means GetLate updated their response schema.',
      mitigation: 'Inspect the raw API response in api_call_logs (API Health tab). Compare against expected shape in inbox-sync code. Add defensive null checks for the failing field. If schema changed permanently, update the sync code.',
      autoResolvable: false,
    };
  }

  // Comment-specific errors
  if (lower.includes('comment')) {
    return {
      category: 'data_format',
      severity: 'warning',
      reason: 'Error processing a specific comment. The comment may have been deleted on the platform, have unsupported content (sticker, story mention), or reference a post that no longer exists.',
      mitigation: 'Non-blocking — other comments continue syncing. If the same comment fails repeatedly, add its ID to an ignore list or add a defensive check for the specific edge case.',
      autoResolvable: true,
    };
  }

  // DM-specific errors
  if (lower.includes('dm ')) {
    return {
      category: 'data_format',
      severity: 'warning',
      reason: 'Error processing a specific DM conversation. The conversation may have been deleted, or the participant data is in an unexpected format.',
      mitigation: 'Non-blocking — other DMs continue syncing. Check the specific conversation ID in GetLate dashboard. If the conversation was removed, it will stop appearing in future syncs.',
      autoResolvable: true,
    };
  }

  return {
    category: 'unknown',
    severity: 'warning',
    reason: 'Unrecognized error pattern. The error message does not match any known failure mode.',
    mitigation: 'Review the full error details manually. Check edge function logs in Supabase dashboard (Logs > Edge Functions > inbox-sync). If recurring, add a new diagnostic pattern for this error type.',
    autoResolvable: false,
  };
}

function diagnoseCronLog(log: CronHealthLog): Array<{ error: string; diagnosis: ErrorDiagnosis; companyId?: string }> {
  const details = log.details as Record<string, unknown>;
  const results = (details?.results as Array<{ company_id?: string; errors: string[]; sync_type?: string }>) || [];
  const diagnosed: Array<{ error: string; diagnosis: ErrorDiagnosis; companyId?: string }> = [];

  // Extract per-result errors from the results array
  for (const result of results) {
    for (const err of (result.errors || [])) {
      diagnosed.push({
        error: err,
        diagnosis: diagnoseError(err),
        companyId: result.company_id || (details?.company as string),
      });
    }
  }

  // Fallback: use error_message from the log itself (catches thrown exceptions)
  if (diagnosed.length === 0 && log.error_message) {
    diagnosed.push({
      error: log.error_message,
      diagnosis: diagnoseError(log.error_message),
      companyId: details?.company as string,
    });
  }

  // Last resort: status is error/partial but no error details available
  if (diagnosed.length === 0 && (log.status === 'error' || log.status === 'partial')) {
    const errorCount = (details?.totalErrors as number) || 0;
    const companyId = details?.company as string;
    diagnosed.push({
      error: `Sync completed with status "${log.status}" (${errorCount} errors) — error details not captured. Check Supabase edge function logs.`,
      diagnosis: {
        category: 'unknown',
        severity: errorCount > 3 ? 'critical' : 'warning',
        reason: 'Error details were not included in the log. This usually means the edge function was deployed before the fix that includes per-result error data.',
        mitigation: 'Redeploy inbox-sync edge function to capture detailed errors. Run: DOCKER_HOST=invalid npx supabase functions deploy inbox-sync',
        autoResolvable: false,
      },
      companyId,
    });
  }

  return diagnosed;
}

export function WebhookHealthTab() {
  const { syncStates, cronLogs, messageCount24h } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<{ error: string; diagnosis: ErrorDiagnosis; companyId?: string; logTime: string } | null>(null);

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  // Build per-company pipeline status
  const pipelineStatus = useMemo(() => {
    const map: Record<string, {
      lastCommentSync: string | null;
      lastDmSync: string | null;
      gapDetected: boolean;
    }> = {};

    for (const s of syncStates) {
      if (!map[s.company_id]) {
        map[s.company_id] = { lastCommentSync: null, lastDmSync: null, gapDetected: false };
      }
      if (s.sync_type === 'comments') map[s.company_id].lastCommentSync = s.last_synced_at;
      if (s.sync_type === 'dms') map[s.company_id].lastDmSync = s.last_synced_at;
    }

    // Check for gaps (>30min with no data)
    for (const id of Object.keys(map)) {
      const entry = map[id];
      const commentAge = entry.lastCommentSync ? Date.now() - new Date(entry.lastCommentSync).getTime() : Infinity;
      const dmAge = entry.lastDmSync ? Date.now() - new Date(entry.lastDmSync).getTime() : Infinity;
      entry.gapDetected = commentAge > 30 * 60 * 1000 || dmAge > 30 * 60 * 1000;
    }

    return map;
  }, [syncStates]);

  // Extract error logs from cron_health_logs
  const errorLogs = useMemo(() => {
    return cronLogs.filter((log: CronHealthLog) => {
      const details = log.details as Record<string, unknown>;
      if (log.status === 'error' || log.status === 'partial') return true;
      if (details?.totalErrors && (details.totalErrors as number) > 0) return true;
      return false;
    });
  }, [cronLogs]);

  const companiesWithGaps = Object.entries(pipelineStatus).filter(([, v]) => v.gapDetected);

  return (
    <div className="space-y-6">
      {/* Pipeline overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium">GetLate API</p>
              <p className="text-xs text-muted-foreground mt-1">External source</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium">inbox-sync</p>
              <p className="text-xs text-muted-foreground mt-1">Every 5 min</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Supabase</p>
              <p className="text-xs text-muted-foreground mt-1">{messageCount24h} msgs (24h)</p>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div>Companies: <span className="font-medium">{Object.keys(pipelineStatus).length}</span></div>
            <div>Gaps detected: <span className={`font-medium ${companiesWithGaps.length > 0 ? 'text-yellow-500' : 'text-green-500'}`}>{companiesWithGaps.length}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Per-company status table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Company Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Last Comment Sync</TableHead>
                  <TableHead>Last DM Sync</TableHead>
                  <TableHead>Gap Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(pipelineStatus).map(([companyId, status]) => (
                  <TableRow key={companyId}>
                    <TableCell className="font-medium">{companyMap[companyId] || companyId.slice(0, 8)}</TableCell>
                    <TableCell>{status.lastCommentSync ? formatDistanceToNow(new Date(status.lastCommentSync), { addSuffix: true }) : 'Never'}</TableCell>
                    <TableCell>{status.lastDmSync ? formatDistanceToNow(new Date(status.lastDmSync), { addSuffix: true }) : 'Never'}</TableCell>
                    <TableCell>
                      {status.gapDetected ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Gap
                        </Badge>
                      ) : (
                        <Badge variant="default">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(pipelineStatus).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No pipeline data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosed Error Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Diagnosed Error Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[100px]">Auto-Resolve?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorLogs.slice(0, 20).flatMap((log: CronHealthLog) => {
                  const diagnosed = diagnoseCronLog(log);
                  return diagnosed.map((entry, i) => {
                    const catInfo = CATEGORY_LABELS[entry.diagnosis.category];
                    const CatIcon = catInfo.icon;
                    const severityColors: Record<Severity, string> = {
                      critical: 'text-red-500 bg-red-500/10 border-red-500/20',
                      warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
                      info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                    };
                    return (
                      <TableRow
                        key={`${log.id}-${i}`}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedDiagnosis({ ...entry, logTime: log.created_at })}
                      >
                        <TableCell className="text-xs">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <CatIcon className="h-3 w-3" />
                            {catInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${severityColors[entry.diagnosis.severity]}`} variant="outline">
                            {entry.diagnosis.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{entry.companyId ? (companyMap[entry.companyId] || entry.companyId.slice(0, 8)) : '—'}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{entry.diagnosis.reason}</TableCell>
                        <TableCell>
                          {entry.diagnosis.autoResolvable ? (
                            <Badge variant="default" className="text-[10px] bg-green-600/10 text-green-600 border-green-600/20 border">Yes</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Manual</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
                {errorLogs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No errors recorded</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis Detail Dialog */}
      <Dialog open={!!selectedDiagnosis} onOpenChange={() => setSelectedDiagnosis(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDiagnosis && (() => {
                const CatIcon = CATEGORY_LABELS[selectedDiagnosis.diagnosis.category].icon;
                return <CatIcon className="h-5 w-5" />;
              })()}
              Error Diagnosis
            </DialogTitle>
          </DialogHeader>
          {selectedDiagnosis && (
            <div className="space-y-4">
              {/* Meta row */}
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline">{CATEGORY_LABELS[selectedDiagnosis.diagnosis.category].label}</Badge>
                <Badge className={`border ${
                  selectedDiagnosis.diagnosis.severity === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                  selectedDiagnosis.diagnosis.severity === 'warning' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                }`} variant="outline">{selectedDiagnosis.diagnosis.severity}</Badge>
                {selectedDiagnosis.diagnosis.autoResolvable
                  ? <Badge variant="default" className="bg-green-600/10 text-green-600 border-green-600/20 border">Auto-resolvable</Badge>
                  : <Badge variant="destructive">Requires manual action</Badge>
                }
              </div>

              {/* Raw error */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Raw Error</p>
                <pre className="text-xs bg-red-500/5 border border-red-500/10 p-3 rounded-lg whitespace-pre-wrap">{selectedDiagnosis.error}</pre>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Why This Happened
                </p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedDiagnosis.diagnosis.reason}</p>
              </div>

              {/* Mitigation */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Mitigation Strategy
                </p>
                <p className="text-sm bg-primary/5 border border-primary/10 p-3 rounded-lg">{selectedDiagnosis.diagnosis.mitigation}</p>
              </div>

              {/* Context */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <span>Time: {format(new Date(selectedDiagnosis.logTime), 'PPpp')}</span>
                {selectedDiagnosis.companyId && (
                  <span>Company: {companyMap[selectedDiagnosis.companyId] || selectedDiagnosis.companyId}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
