import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, Play, Timer,
  Activity, Server, TrendingUp, RefreshCw, MessageSquare, BarChart3,
} from 'lucide-react';
import { useAdminSyncStatus } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, subHours, subDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────

interface CronJobSetting {
  id: string;
  job_name: string;
  schedule: string;
  edge_function: string;
  description: string;
  enabled: boolean;
  job_type: 'edge_function' | 'sql';
  updated_at: string;
  created_at: string;
}

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

function getTimeRangeSince(range: TimeRange): Date {
  switch (range) {
    case '1h': return subHours(new Date(), 1);
    case '6h': return subHours(new Date(), 6);
    case '24h': return subHours(new Date(), 24);
    case '7d': return subDays(new Date(), 7);
  }
}

// ─── Helpers ──────────────────────────────────────────────

function formatSchedule(cron: string): string {
  if (cron === 'Manual / TBD') return cron;
  if (cron === '0 * * * *') return 'Hourly';
  if (cron === '*/5 * * * *') return 'Every 5m';
  if (cron === '*/10 * * * *') return 'Every 10m';
  if (cron === '*/15 * * * *') return 'Every 15m';
  if (cron === '*/30 * * * *') return 'Every 30m';
  if (cron === '0 0 * * *') return 'Daily 00:00';
  if (cron === '0 3 * * *') return 'Daily 03:00';
  if (cron === '0 9 * * *') return 'Daily 09:00';
  return cron;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '\u2014';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function ExecutionDots({ logs, max = 20 }: { logs: CronLog[]; max?: number }) {
  const recent = logs.slice(0, max).reverse();
  if (recent.length === 0) return <span className="text-muted-foreground text-xs">No data</span>;
  return (
    <div className="flex items-center gap-[2px]" title={`Last ${recent.length} executions`}>
      {recent.map((log) => (
        <div
          key={log.id}
          className={`w-2 h-2 rounded-full ${
            log.status === 'success' ? 'bg-green-500' :
            log.status === 'running' ? 'bg-blue-400 animate-pulse' :
            log.status === 'partial' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          title={`${log.status} \u2014 ${format(new Date(log.started_at), 'MMM d HH:mm')} \u2014 ${formatDuration(log.duration_ms)}`}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function PerformanceTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const jobsGridRef = useRef<AgGridReact>(null);
  const execGridRef = useRef<AgGridReact>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<CronLog | null>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { syncStates, messageCount24h } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  const since = getTimeRangeSince(timeRange);

  // Fetch job settings
  const { data: jobSettings } = useQuery({
    queryKey: ['cron-job-settings'],
    queryFn: async () => {
      const res = await supabase.functions.invoke('admin-cron', { body: { action: 'list' } });
      if (res.error) throw res.error;
      return (res.data?.jobs ?? []) as CronJobSetting[];
    },
    staleTime: 60000,
  });

  const registeredJobs = jobSettings ?? [];

  // Fetch logs within time range
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ['cron-health-logs', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_health_logs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as CronLog[];
    },
    refetchInterval: 15000,
  });

  const logs = allLogs ?? [];

  // Trigger a job manually
  const triggerMutation = useMutation({
    mutationFn: async (jobName: string) => {
      setTriggeringJob(jobName);
      const res = await supabase.functions.invoke('admin-cron', { body: { action: 'trigger', jobName } });
      if (res.error) throw res.error;
      if (res.data && !res.data.success) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (_data, jobName) => {
      toast({ title: 'Job triggered', description: `"${jobName}" dispatched successfully.` });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['cron-health-logs'] }), 3000);
    },
    onError: (error, jobName) => {
      toast({ title: 'Trigger failed', description: `"${jobName}": ${error.message}`, variant: 'destructive' });
    },
    onSettled: () => setTriggeringJob(null),
  });

  // ─── Derived metrics ────────────────────────────────────

  const { jobSummaries, kpis } = useMemo(() => {
    // Match logs to jobs using startsWith because CronMonitor logs as
    // "inbox-sync:cc2bd6ce" but cron_job_settings has edge_function="inbox-sync"
    function findJobLogs(jobName: string, edgeFn: string): CronLog[] {
      return logs.filter(l =>
        l.job_name === jobName ||
        l.job_name === edgeFn ||
        l.job_name.startsWith(edgeFn + ':') ||
        l.job_name.startsWith(edgeFn + '-')
      );
    }

    const summaries = registeredJobs.map((job) => {
      const jobLogs = findJobLogs(job.job_name, job.edge_function);
      const lastRun = jobLogs[0] ?? null;
      const successes = jobLogs.filter((l) => l.status === 'success').length;
      const successRate = jobLogs.length > 0 ? Math.round((successes / jobLogs.length) * 100) : null;
      const avgDuration = jobLogs.length > 0
        ? Math.round(jobLogs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / jobLogs.length)
        : null;
      const p95Duration = jobLogs.length > 0
        ? jobLogs.map(l => l.duration_ms ?? 0).sort((a, b) => a - b)[Math.floor(jobLogs.length * 0.95)] ?? null
        : null;

      const intervalMinutes = job.schedule.startsWith('*/') ? parseInt(job.schedule.split(' ')[0].slice(2)) : 60;
      const lastRunAge = lastRun ? (Date.now() - new Date(lastRun.started_at).getTime()) / 60000 : Infinity;
      // SQL-type jobs don't log to cron_health_logs — never mark them stale
      const isSqlJob = job.job_type === 'sql';
      const isStale = !isSqlJob && lastRunAge > intervalMinutes * 2.5;

      return {
        ...job,
        lastRun,
        jobLogs,
        totalRuns: jobLogs.length,
        successes,
        successRate,
        avgDuration,
        p95Duration,
        isStale,
        isSqlJob,
        lastStatus: lastRun?.status || null,
      };
    });

    const totalRuns = logs.length;
    const totalSuccesses = logs.filter(l => l.status === 'success').length;
    const overallSuccessRate = totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : 100;
    const avgLatency = totalRuns > 0
      ? Math.round(logs.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / totalRuns)
      : 0;

    return {
      jobSummaries: summaries,
      kpis: { totalRuns, overallSuccessRate, avgLatency },
    };
  }, [logs, registeredJobs]);

  const companiesSyncing = useMemo(() => {
    const ids = new Set(syncStates.map(s => s.company_id));
    return ids.size;
  }, [syncStates]);

  const lastGlobalSync = logs[0]?.created_at;

  const jobNames = useMemo(() => [...new Set(logs.map((l) => l.job_name))].sort(), [logs]);

  const filteredLogs = useMemo(() => {
    if (jobFilter === 'all') return logs;
    return logs.filter((l) => l.job_name === jobFilter);
  }, [logs, jobFilter]);

  // ─── AG Grid Column Defs ────────────────────────────────

  const jobsColDefs = useMemo<ColDef[]>(() => [
    {
      field: 'edge_function', headerName: 'Job', flex: 1, minWidth: 180, filter: true,
      cellRenderer: (p: any) => (
        <div>
          <span className="font-medium text-sm">{p.value}</span>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{p.data.description}</p>
        </div>
      ),
    },
    {
      field: 'schedule', headerName: 'Schedule', width: 120,
      cellRenderer: (p: any) => (
        <Badge variant="outline" className="text-xs font-mono">{formatSchedule(p.value)}</Badge>
      ),
    },
    {
      field: 'jobLogs', headerName: 'Recent Runs', width: 200, sortable: false,
      cellRenderer: (p: any) => <ExecutionDots logs={p.value || []} />,
    },
    {
      field: 'successRate', headerName: 'Uptime', width: 90, type: 'numericColumn',
      cellRenderer: (p: any) => {
        if (p.value == null) return <span className="text-muted-foreground text-sm">\u2014</span>;
        return (
          <span className={`text-sm font-medium ${
            p.value >= 95 ? 'text-green-600' : p.value >= 80 ? 'text-yellow-600' : 'text-red-600'
          }`}>{p.value}%</span>
        );
      },
    },
    {
      headerName: 'Avg / P95', width: 140, type: 'numericColumn',
      valueGetter: (p: any) => p.data.avgDuration,
      cellRenderer: (p: any) => {
        if (p.data.avgDuration == null) return '\u2014';
        return <span className="text-sm text-muted-foreground">{formatDuration(p.data.avgDuration)} / {formatDuration(p.data.p95Duration)}</span>;
      },
    },
    {
      field: 'lastStatus', headerName: 'Status', width: 120,
      cellRenderer: (p: any) => {
        const data = p.data;
        if (data.isSqlJob) {
          return <Badge variant="outline" className="text-blue-500 bg-blue-500/10 border-blue-500/20 border gap-1"><Server className="w-3 h-3" /> SQL</Badge>;
        }
        if (data.isStale) {
          return <Badge variant="secondary" className="text-yellow-600 bg-yellow-500/10 border-yellow-500/20 border gap-1"><AlertTriangle className="w-3 h-3" /> Stale</Badge>;
        }
        if (!data.lastRun) {
          return <Badge variant="outline" className="text-muted-foreground gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
        }
        if (data.lastRun.status === 'success') {
          return <Badge className="bg-green-600/10 text-green-600 border-0 gap-1"><CheckCircle2 className="w-3 h-3" /> Healthy</Badge>;
        }
        if (data.lastRun.status === 'running') {
          return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Running</Badge>;
        }
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Failed</Badge>;
      },
    },
    {
      headerName: '', width: 60, sortable: false, filter: false,
      cellRenderer: (p: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={triggeringJob === p.data.job_name || !p.data.enabled}
          onClick={(e) => { e.stopPropagation(); triggerMutation.mutate(p.data.job_name); }}
          title={`Trigger ${p.data.job_name}`}
        >
          {triggeringJob === p.data.job_name ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </Button>
      ),
    },
  ], [triggeringJob, triggerMutation]);

  const execColDefs = useMemo<ColDef[]>(() => [
    { field: 'job_name', headerName: 'Job', width: 180, filter: true, cellClass: 'font-mono text-sm' },
    {
      field: 'status', headerName: 'Status', width: 110, filter: true,
      cellRenderer: (p: any) => (
        <Badge
          variant={
            p.value === 'success' ? 'default' :
            p.value === 'running' ? 'secondary' :
            p.value === 'partial' ? 'outline' : 'destructive'
          }
          className={`capitalize text-xs ${p.value === 'success' ? 'bg-green-600/10 text-green-600 border-0' : ''}`}
        >{p.value}</Badge>
      ),
    },
    {
      field: 'started_at', headerName: 'Started', width: 155,
      cellRenderer: (p: any) => <span className="text-muted-foreground text-sm">{format(new Date(p.value), 'MMM d, HH:mm:ss')}</span>,
    },
    {
      field: 'duration_ms', headerName: 'Duration', width: 100, type: 'numericColumn',
      cellRenderer: (p: any) => <span className="text-muted-foreground text-sm">{formatDuration(p.value)}</span>,
    },
    {
      field: 'details', headerName: 'Details', flex: 1, minWidth: 200,
      cellRenderer: (p: any) => {
        const d = p.value as Record<string, unknown> | null;
        const companiesDispatched = (d?.companies_dispatched as number) ?? null;
        const newItems = (d?.totalNew as number) ?? null;
        const errorCount = (d?.totalErrors as number) ?? 0;
        const errMsg = p.data.error_message;
        return (
          <span className="text-xs text-muted-foreground">
            {companiesDispatched != null && <span className="mr-2">{companiesDispatched} companies</span>}
            {newItems != null && <span className="mr-2 text-green-600">+{newItems} new</span>}
            {errorCount > 0 && <span className="text-red-500 mr-2">{errorCount} errors</span>}
            {errMsg && <span className="text-red-500">{String(errMsg).slice(0, 60)}</span>}
          </span>
        );
      },
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Server className="h-3.5 w-3.5" /> Companies Syncing
            </div>
            <p className="text-2xl font-bold">{companiesSyncing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <RefreshCw className="h-3.5 w-3.5" /> Last Global Sync
            </div>
            <p className="text-2xl font-bold text-sm">
              {lastGlobalSync ? formatDistanceToNow(new Date(lastGlobalSync), { addSuffix: true }) : 'Never'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Timer className="h-3.5 w-3.5" /> Avg Latency
            </div>
            <p className="text-2xl font-bold">{formatDuration(kpis.avgLatency)}</p>
            <p className="text-xs text-muted-foreground">per execution</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Uptime
            </div>
            <p className={`text-2xl font-bold ${kpis.overallSuccessRate >= 95 ? 'text-green-600' : kpis.overallSuccessRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {kpis.overallSuccessRate}%
            </p>
            <p className="text-xs text-muted-foreground">{kpis.totalRuns} runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MessageSquare className="h-3.5 w-3.5" /> Messages (24h)
            </div>
            <p className="text-2xl font-bold">{messageCount24h}</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-3">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-40 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            {TIME_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cron Jobs Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Cron Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <AgGridReact
              ref={jobsGridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={jobSummaries}
              columnDefs={jobsColDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              suppressCellFocus
              loading={isLoading}
              getRowId={(p) => p.data.job_name}
              rowClassRules={{
                'bg-yellow-500/5': (p) => p.data?.isStale,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Execution Log Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Execution Log
          </CardTitle>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-56 bg-background">
              <SelectValue placeholder="Filter by job..." />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="all">All jobs</SelectItem>
              {jobNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredLogs.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="w-10 h-10 mb-3" />
              <p className="text-sm">No executions in this time range</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg">
                <AgGridReact
                  ref={execGridRef}
                  theme={isDark ? gridThemeDark : gridTheme}
                  modules={[AllCommunityModule]}
                  rowData={filteredLogs.slice(0, 100)}
                  columnDefs={execColDefs}
                  defaultColDef={defaultColDef}
                  domLayout="autoHeight"
                  suppressCellFocus
                  onRowClicked={(e) => setSelectedLog(e.data)}
                  getRowId={(p) => p.data.id}
                  rowClassRules={{
                    'bg-red-500/5': (p) => {
                      const d = p.data?.details as Record<string, unknown> | null;
                      return p.data?.status === 'error' || ((d?.totalErrors as number) > 0);
                    },
                  }}
                />
              </div>
              {filteredLogs.length > 100 && (
                <div className="text-center text-xs text-muted-foreground py-2">
                  Showing 100 of {filteredLogs.length} executions
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Execution Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              {selectedLog?.job_name}
              <Badge variant={selectedLog?.status === 'success' ? 'default' : 'destructive'} className="capitalize ml-2">
                {selectedLog?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p>{format(new Date(selectedLog.started_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p>{formatDuration(selectedLog.duration_ms)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p>{selectedLog.completed_at ? format(new Date(selectedLog.completed_at), 'HH:mm:ss') : '\u2014'}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Error Message</p>
                  <pre className="text-xs bg-red-500/5 border border-red-500/10 p-3 rounded-lg whitespace-pre-wrap text-red-600">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Details</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
