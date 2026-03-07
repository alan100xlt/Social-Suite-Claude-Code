import type { CronHealthLog } from '@/hooks/useAdminSyncStatus';

export type ErrorCategory = 'api_auth' | 'api_rate_limit' | 'api_timeout' | 'api_server' | 'db_write' | 'db_constraint' | 'data_format' | 'sync_gap' | 'unknown';
export type Severity = 'critical' | 'warning' | 'info';

export interface ErrorDiagnosis {
  category: ErrorCategory;
  severity: Severity;
  reason: string;
  mitigation: string;
  autoResolvable: boolean;
}

export const CATEGORY_LABELS: Record<ErrorCategory, { label: string }> = {
  api_auth: { label: 'Auth Failure' },
  api_rate_limit: { label: 'Rate Limited' },
  api_timeout: { label: 'Timeout' },
  api_server: { label: 'API Error' },
  db_write: { label: 'DB Write Error' },
  db_constraint: { label: 'Constraint Violation' },
  data_format: { label: 'Bad Data' },
  sync_gap: { label: 'Sync Gap' },
  unknown: { label: 'Unknown' },
};

export function diagnoseError(errorStr: string): ErrorDiagnosis {
  const lower = errorStr.toLowerCase();

  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('403') || lower.includes('invalid api key') || lower.includes('auth')) {
    return { category: 'api_auth', severity: 'critical', reason: 'GetLate API rejected our credentials. The API key may have expired, been rotated, or the account permissions changed.', mitigation: 'Verify GETLATE_API_KEY in Supabase secrets (`supabase secrets list`). If expired, generate a new key at getlate.dev/settings and run `supabase secrets set GETLATE_API_KEY=<new_key>`. Redeploy edge functions after.', autoResolvable: false };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('throttl')) {
    return { category: 'api_rate_limit', severity: 'warning', reason: 'GetLate API is rate-limiting our requests.', mitigation: 'Will auto-resolve on next sync cycle. If persistent: increase the cron interval or add exponential backoff.', autoResolvable: true };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnreset') || lower.includes('socket hang up') || lower.includes('aborted')) {
    return { category: 'api_timeout', severity: 'warning', reason: 'Network timeout connecting to GetLate API.', mitigation: 'Transient \u2014 will auto-resolve on next cycle. If recurring: check GetLate status page, reduce batch sizes.', autoResolvable: true };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('internal server error') || lower.includes('bad gateway') || lower.includes('service unavailable')) {
    const statusMatch = errorStr.match(/(\d{3})/);
    const code = statusMatch?.[1] || '5xx';
    return { category: 'api_server', severity: 'warning', reason: `GetLate API returned ${code} server error.`, mitigation: 'Wait for GetLate to recover. Our sync will automatically catch up.', autoResolvable: true };
  }
  if (lower.match(/returned (\d+)/)) {
    const codeMatch = errorStr.match(/returned (\d+)/);
    const code = codeMatch?.[1] || 'unknown';
    if (code.startsWith('4')) {
      return { category: 'data_format', severity: 'warning', reason: `GetLate API returned HTTP ${code}. Request format may have changed.`, mitigation: 'Verify the company\'s getlate_profile_id is still valid.', autoResolvable: false };
    }
    return { category: 'api_server', severity: 'warning', reason: `GetLate API returned HTTP ${code}.`, mitigation: 'Likely transient \u2014 will retry on next sync cycle.', autoResolvable: true };
  }
  if (lower.includes('duplicate') || lower.includes('unique constraint') || lower.includes('violates unique') || lower.includes('conflict') || lower.includes('23505')) {
    return { category: 'db_constraint', severity: 'info', reason: 'Attempted to insert a duplicate record. Expected during overlapping sync windows.', mitigation: 'No action needed \u2014 upsert logic handles this.', autoResolvable: true };
  }
  if (lower.includes('insert') || lower.includes('update') || lower.includes('rls') || lower.includes('policy')) {
    return { category: 'db_write', severity: 'critical', reason: 'Failed to write data to Supabase.', mitigation: 'Check Supabase dashboard for migration errors. Verify RLS policies allow service_role writes on inbox_* tables.', autoResolvable: false };
  }
  if (lower.includes('json') || lower.includes('parse') || lower.includes('undefined') || lower.includes('null') || lower.includes('cannot read prop') || lower.includes('typeerror')) {
    return { category: 'data_format', severity: 'warning', reason: 'Data from GetLate API has an unexpected format.', mitigation: 'Inspect the raw API response in API Health tab. Add defensive null checks.', autoResolvable: false };
  }
  if (lower.includes('comment')) {
    return { category: 'data_format', severity: 'warning', reason: 'Error processing a specific comment.', mitigation: 'Non-blocking \u2014 other comments continue syncing.', autoResolvable: true };
  }
  if (lower.includes('dm ')) {
    return { category: 'data_format', severity: 'warning', reason: 'Error processing a specific DM conversation.', mitigation: 'Non-blocking \u2014 other DMs continue syncing.', autoResolvable: true };
  }
  return { category: 'unknown', severity: 'warning', reason: 'Unrecognized error pattern.', mitigation: 'Review the full error details manually. Check edge function logs in Supabase dashboard.', autoResolvable: false };
}

export interface DiagnosedRow {
  id: string;
  logTime: string;
  error: string;
  category: ErrorCategory;
  categoryLabel: string;
  severity: Severity;
  reason: string;
  mitigation: string;
  autoResolvable: boolean;
  companyId?: string;
  companyName: string;
}

export function diagnoseCronLog(log: CronHealthLog, companyMap: Record<string, string>): DiagnosedRow[] {
  const details = log.details as Record<string, unknown>;
  const results = (details?.results as Array<{ company_id?: string; errors: string[] }>) || [];
  const rows: DiagnosedRow[] = [];
  let idx = 0;

  for (const result of results) {
    for (const err of (result.errors || [])) {
      const d = diagnoseError(err);
      const cId = result.company_id || (details?.company as string);
      rows.push({
        id: `${log.id}-${idx++}`,
        logTime: log.created_at,
        error: err,
        category: d.category,
        categoryLabel: CATEGORY_LABELS[d.category].label,
        severity: d.severity,
        reason: d.reason,
        mitigation: d.mitigation,
        autoResolvable: d.autoResolvable,
        companyId: cId,
        companyName: cId ? (companyMap[cId] || cId.slice(0, 8)) : '\u2014',
      });
    }
  }

  if (rows.length === 0 && log.error_message) {
    const d = diagnoseError(log.error_message);
    const cId = details?.company as string;
    rows.push({
      id: `${log.id}-${idx++}`,
      logTime: log.created_at,
      error: log.error_message,
      category: d.category,
      categoryLabel: CATEGORY_LABELS[d.category].label,
      severity: d.severity,
      reason: d.reason,
      mitigation: d.mitigation,
      autoResolvable: d.autoResolvable,
      companyId: cId,
      companyName: cId ? (companyMap[cId] || cId.slice(0, 8)) : '\u2014',
    });
  }

  if (rows.length === 0 && (log.status === 'error' || log.status === 'partial')) {
    const errorCount = (details?.totalErrors as number) || 0;
    const cId = details?.company as string;
    rows.push({
      id: `${log.id}-${idx}`,
      logTime: log.created_at,
      error: `Sync completed with status "${log.status}" (${errorCount} errors)`,
      category: 'unknown',
      categoryLabel: 'Unknown',
      severity: errorCount > 3 ? 'critical' : 'warning',
      reason: 'Error details were not included in the log.',
      mitigation: 'Redeploy inbox-sync edge function to capture detailed errors.',
      autoResolvable: false,
      companyId: cId,
      companyName: cId ? (companyMap[cId] || cId.slice(0, 8)) : '\u2014',
    });
  }

  return rows;
}
