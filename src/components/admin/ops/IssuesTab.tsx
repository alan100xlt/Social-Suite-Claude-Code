import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle, CheckCircle2, ShieldAlert, Wrench, XCircle, Clock, Zap,
} from 'lucide-react';
import { useAdminSyncStatus, useAdminApiErrors24h, type CronHealthLog } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format, formatDistanceToNow } from 'date-fns';
import { diagnoseError, diagnoseCronLog, CATEGORY_LABELS, type Severity, type DiagnosedRow } from '@/lib/diagnose-error';

// ─── Unified Issue Row ────────────────────────────────────

interface UnifiedIssue {
  id: string;
  timestamp: string;
  source: 'cron' | 'sync' | 'api' | 'pipeline';
  severity: Severity;
  company: string;
  summary: string;
  mitigation: string;
  raw: string;
  autoResolvable: boolean;
}

// ─── Health Banner ────────────────────────────────────────

function HealthBanner({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { label: 'All Systems Operational', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900', Icon: CheckCircle2 },
    degraded: { label: 'Degraded Performance', color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900', Icon: AlertTriangle },
    down: { label: 'System Issues Detected', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900', Icon: XCircle },
  }[status];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor}`}>
      <div className={`w-3 h-3 rounded-full ${config.color} ${status === 'degraded' ? 'animate-pulse' : ''}`} />
      <config.Icon className={`h-4 w-4 ${config.textColor}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function IssuesTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const gridRef = useRef<AgGridReact>(null);
  const [selectedIssue, setSelectedIssue] = useState<UnifiedIssue | null>(null);

  const { syncStates, cronLogs } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();
  const { data: apiErrors } = useAdminApiErrors24h();

  // Fetch cron job settings for stale detection
  const { data: jobSettings } = useQuery({
    queryKey: ['cron-job-settings'],
    queryFn: async () => {
      const res = await supabase.functions.invoke('admin-cron', { body: { action: 'list' } });
      if (res.error) throw res.error;
      return (res.data?.jobs ?? []) as Array<{
        job_name: string;
        schedule: string;
        edge_function: string;
        enabled: boolean;
        job_type: 'edge_function' | 'sql';
      }>;
    },
    staleTime: 60000,
  });

  // Fetch recent cron logs for stale detection
  const { data: recentCronLogs } = useQuery({
    queryKey: ['cron-health-logs', '24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('cron_health_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as CronHealthLog[];
    },
    refetchInterval: 30000,
  });

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  // Aggregate all issues from 4 sources (deduplicated & grouped)
  const issues = useMemo<UnifiedIssue[]>(() => {
    const all: UnifiedIssue[] = [];
    const logs = recentCronLogs || [];

    // 1. Stale cron jobs — only truly stale (no run in 2.5x interval)
    // Match logs to jobs using startsWith because CronMonitor logs as
    // "inbox-sync:cc2bd6ce" but cron_job_settings has edge_function="inbox-sync"
    function findJobLogs(jobName: string, edgeFn: string): CronHealthLog[] {
      return logs.filter(l =>
        l.job_name === jobName ||
        l.job_name === edgeFn ||
        l.job_name.startsWith(edgeFn + ':') ||
        l.job_name.startsWith(edgeFn + '-')
      );
    }

    for (const job of (jobSettings || [])) {
      if (!job.enabled) continue;
      if (job.job_type === 'sql') continue; // SQL jobs don't log to cron_health_logs
      const jobLogs = findJobLogs(job.job_name, job.edge_function);
      const lastRun = jobLogs[0];
      const intervalMinutes = job.schedule.startsWith('*/') ? parseInt(job.schedule.split(' ')[0].slice(2)) : 60;
      const lastRunAge = lastRun ? (Date.now() - new Date(lastRun.created_at).getTime()) / 60000 : Infinity;
      if (lastRunAge > intervalMinutes * 2.5) {
        all.push({
          id: `stale-${job.job_name}`,
          timestamp: lastRun?.created_at || new Date().toISOString(),
          source: 'cron',
          severity: 'warning',
          company: '\u2014',
          summary: `Stale: ${job.edge_function} last ran ${lastRun ? formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true }) : 'never'}`,
          mitigation: `Expected every ${intervalMinutes}m. Trigger manually or check cron-dispatcher logs.`,
          raw: JSON.stringify({ job_name: job.job_name, schedule: job.schedule, lastRun: lastRun?.created_at }),
          autoResolvable: false,
        });
      }
    }

    // 2. Sync gaps — only if >60min behind (30min was too aggressive given 15min cron interval)
    const syncByCompany = new Map<string, { comments?: string; dms?: string }>();
    for (const s of syncStates) {
      if (!syncByCompany.has(s.company_id)) syncByCompany.set(s.company_id, {});
      const entry = syncByCompany.get(s.company_id)!;
      if (s.sync_type === 'comments') entry.comments = s.last_synced_at;
      if (s.sync_type === 'dms') entry.dms = s.last_synced_at;
    }
    for (const [companyId, entry] of syncByCompany) {
      const GAP_THRESHOLD = 60 * 60 * 1000; // 60min — generous for 15min cron
      const commentAge = entry.comments ? Date.now() - new Date(entry.comments).getTime() : Infinity;
      const dmAge = entry.dms ? Date.now() - new Date(entry.dms).getTime() : Infinity;
      if (commentAge > GAP_THRESHOLD || dmAge > GAP_THRESHOLD) {
        const staleType = commentAge > GAP_THRESHOLD && dmAge > GAP_THRESHOLD ? 'Comments & DMs' :
          commentAge > GAP_THRESHOLD ? 'Comments' : 'DMs';
        all.push({
          id: `sync-gap-${companyId}`,
          timestamp: entry.comments || entry.dms || new Date().toISOString(),
          source: 'sync',
          severity: 'warning',
          company: companyMap[companyId] || companyId.slice(0, 8),
          summary: `Sync gap: ${staleType} >1h behind`,
          mitigation: 'Check inbox-sync cron logs. May indicate GetLate API issues or company disconnection.',
          raw: JSON.stringify(entry),
          autoResolvable: true,
        });
      }
    }

    // 3. API errors — GROUP by (function + error category) instead of one row per failure
    const apiErrorGroups = new Map<string, {
      count: number;
      latest: typeof apiErrors extends (infer T)[] | undefined ? NonNullable<T> : never;
      category: ReturnType<typeof diagnoseError>;
      companies: Set<string>;
    }>();
    for (const err of (apiErrors || [])) {
      const d = diagnoseError(err.response_summary || 'unknown error');
      const groupKey = `${err.function_name}::${d.category}`;
      const existing = apiErrorGroups.get(groupKey);
      if (existing) {
        existing.count++;
        if (new Date(err.created_at) > new Date(existing.latest.created_at)) {
          existing.latest = err;
        }
        if (err.company_id) existing.companies.add(err.company_id);
      } else {
        const companies = new Set<string>();
        if (err.company_id) companies.add(err.company_id);
        apiErrorGroups.set(groupKey, { count: 1, latest: err, category: d, companies });
      }
    }
    for (const [, group] of apiErrorGroups) {
      const companyNames = [...group.companies].map(id => companyMap[id] || id.slice(0, 8));
      const companyLabel = companyNames.length <= 2 ? companyNames.join(', ') : `${companyNames.length} companies`;
      all.push({
        id: `api-group-${group.latest.id}`,
        timestamp: group.latest.created_at,
        source: 'api',
        severity: group.category.severity,
        company: companyLabel || '\u2014',
        summary: `${group.latest.function_name}: ${group.category.reason}${group.count > 1 ? ` (${group.count}x in 24h)` : ''}`,
        mitigation: group.category.mitigation,
        raw: group.latest.response_summary || '',
        autoResolvable: group.category.autoResolvable,
      });
    }

    // 4. Pipeline errors — only from last 6h to avoid overlap with API errors
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const errorCronLogs = cronLogs.filter((log: CronHealthLog) => {
      if (new Date(log.created_at).getTime() < sixHoursAgo) return false;
      const details = log.details as Record<string, unknown>;
      if (log.status === 'error' || log.status === 'partial') return true;
      if (details?.totalErrors && (details.totalErrors as number) > 0) return true;
      return false;
    });
    // Deduplicate: skip pipeline errors if same category already covered by API errors
    const apiCategoriesSeen = new Set([...apiErrorGroups.keys()].map(k => k.split('::')[1]));
    for (const log of errorCronLogs.slice(0, 10)) {
      const diagnosed = diagnoseCronLog(log, companyMap);
      for (const d of diagnosed) {
        // Skip if this error category is already represented by grouped API errors
        if (apiCategoriesSeen.has(d.category)) continue;
        all.push({
          id: `pipeline-${d.id}`,
          timestamp: d.logTime,
          source: 'pipeline',
          severity: d.severity,
          company: d.companyName,
          summary: d.reason,
          mitigation: d.mitigation,
          raw: d.error,
          autoResolvable: d.autoResolvable,
        });
      }
    }

    // Sort by severity then timestamp
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    all.sort((a, b) => {
      const s = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (s !== 0) return s;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return all;
  }, [jobSettings, recentCronLogs, syncStates, cronLogs, apiErrors, companyMap]);

  // Derived KPIs
  const totalIssues = issues.length;
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const autoResolvable = issues.filter(i => i.autoResolvable).length;
  const systemHealth: 'healthy' | 'degraded' | 'down' =
    criticalCount > 1 ? 'down' : totalIssues > 0 ? 'degraded' : 'healthy';

  // AG Grid columns
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'severity', headerName: 'Severity', width: 110, filter: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = {
          critical: 'text-red-500 bg-red-500/10 border-red-500/20',
          warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
          info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        };
        return <Badge className={`text-[10px] border ${colors[p.value] || ''}`} variant="outline">{p.value}</Badge>;
      },
    },
    {
      field: 'source', headerName: 'Source', width: 100, filter: true,
      cellRenderer: (p: any) => {
        const icons: Record<string, typeof ShieldAlert> = { cron: Clock, sync: Zap, api: ShieldAlert, pipeline: Wrench };
        const Icon = icons[p.value] || AlertTriangle;
        return (
          <Badge variant="outline" className="gap-1 text-xs capitalize">
            <Icon className="h-3 w-3" /> {p.value}
          </Badge>
        );
      },
    },
    { field: 'company', headerName: 'Company', width: 140, filter: true },
    { field: 'summary', headerName: 'Summary', flex: 1, minWidth: 250 },
    {
      field: 'autoResolvable', headerName: 'Auto?', width: 90,
      cellRenderer: (p: any) => p.value
        ? <Badge variant="default" className="text-[10px] bg-green-600/10 text-green-600 border-green-600/20 border">Yes</Badge>
        : <Badge variant="destructive" className="text-[10px]">No</Badge>,
    },
    {
      field: 'timestamp', headerName: 'Time', width: 140,
      cellRenderer: (p: any) => (
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(p.value), { addSuffix: true })}
        </span>
      ),
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  return (
    <div className="space-y-6">
      {/* Health Banner */}
      <HealthBanner status={systemHealth} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Total Issues
            </div>
            <p className={`text-2xl font-bold ${totalIssues > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {totalIssues}
            </p>
            <p className="text-xs text-muted-foreground">across all subsystems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <XCircle className="h-3.5 w-3.5" /> Critical
            </div>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalCount}
            </p>
            <p className="text-xs text-muted-foreground">need immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Resolvable
            </div>
            <p className="text-2xl font-bold text-blue-600">{autoResolvable}</p>
            <p className="text-xs text-muted-foreground">will self-heal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wrench className="h-3.5 w-3.5" /> Manual Action
            </div>
            <p className={`text-2xl font-bold ${totalIssues - autoResolvable > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {totalIssues - autoResolvable}
            </p>
            <p className="text-xs text-muted-foreground">require intervention</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues AG Grid */}
      <Card>
        <CardContent className="pt-4">
          {totalIssues === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 text-green-500" />
              <p className="text-sm font-medium">No issues detected</p>
              <p className="text-xs mt-1">All subsystems are operating normally</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <AgGridReact
                ref={gridRef}
                theme={isDark ? gridThemeDark : gridTheme}
                modules={[AllCommunityModule]}
                rowData={issues}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                domLayout="autoHeight"
                suppressCellFocus
                onRowClicked={(e) => setSelectedIssue(e.data)}
                getRowId={(p) => p.data.id}
                rowClassRules={{
                  'bg-red-500/5': (p) => p.data?.severity === 'critical',
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Issue Detail</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Badge className={`border ${
                  selectedIssue.severity === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                  selectedIssue.severity === 'warning' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                }`} variant="outline">{selectedIssue.severity}</Badge>
                <Badge variant="outline" className="capitalize">{selectedIssue.source}</Badge>
                {selectedIssue.autoResolvable
                  ? <Badge variant="default" className="bg-green-600/10 text-green-600 border-green-600/20 border">Auto-resolvable</Badge>
                  : <Badge variant="destructive">Requires manual action</Badge>
                }
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedIssue.summary}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Mitigation
                </p>
                <p className="text-sm bg-primary/5 border border-primary/10 p-3 rounded-lg">{selectedIssue.mitigation}</p>
              </div>
              {selectedIssue.raw && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Raw Details</p>
                  <pre className="text-xs bg-red-500/5 border border-red-500/10 p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedIssue.raw}
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <span>Time: {format(new Date(selectedIssue.timestamp), 'PPpp')}</span>
                <span>Company: {selectedIssue.company}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
