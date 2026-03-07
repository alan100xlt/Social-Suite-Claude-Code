import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, subHours, subDays } from "date-fns";
import {
  AlertTriangle, CheckCircle2, Clock, ChevronDown, Database, Globe, Loader2,
  Play, Timer, Activity, Zap, ArrowRight, Server, TrendingUp, Shield,
  BarChart3, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────

interface CronJobSetting {
  id: string;
  job_name: string;
  schedule: string;
  edge_function: string;
  description: string;
  enabled: boolean;
  job_type: "edge_function" | "sql";
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

type TimeRange = "1h" | "6h" | "24h" | "7d";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "Last hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
];

function getTimeRangeSince(range: TimeRange): Date {
  switch (range) {
    case "1h": return subHours(new Date(), 1);
    case "6h": return subHours(new Date(), 6);
    case "24h": return subHours(new Date(), 24);
    case "7d": return subDays(new Date(), 7);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function formatSchedule(cron: string): string {
  if (cron === "Manual / TBD") return cron;
  if (cron === "0 * * * *") return "Hourly";
  if (cron === "*/5 * * * *") return "Every 5m";
  if (cron === "*/10 * * * *") return "Every 10m";
  if (cron === "*/15 * * * *") return "Every 15m";
  if (cron === "*/30 * * * *") return "Every 30m";
  if (cron === "0 0 * * *") return "Daily 00:00";
  if (cron === "0 3 * * *") return "Daily 03:00";
  if (cron === "0 9 * * *") return "Daily 09:00";
  return cron;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/** Mini sparkline: last N executions rendered as colored dots */
function ExecutionDots({ logs, max = 20 }: { logs: CronLog[]; max?: number }) {
  const recent = logs.slice(0, max).reverse();
  if (recent.length === 0) return <span className="text-muted-foreground text-xs">No data</span>;
  return (
    <div className="flex items-center gap-[2px]" title={`Last ${recent.length} executions`}>
      {recent.map((log) => (
        <div
          key={log.id}
          className={`w-2 h-2 rounded-full ${
            log.status === "success" ? "bg-green-500" :
            log.status === "running" ? "bg-blue-400 animate-pulse" :
            log.status === "partial" ? "bg-yellow-500" :
            "bg-red-500"
          }`}
          title={`${log.status} — ${format(new Date(log.started_at), "MMM d HH:mm")} — ${formatDuration(log.duration_ms)}`}
        />
      ))}
    </div>
  );
}

/** Overall system health indicator */
function SystemHealthBadge({ status }: { status: "healthy" | "degraded" | "down" }) {
  const config = {
    healthy: { label: "All Systems Operational", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900" },
    degraded: { label: "Degraded Performance", color: "bg-yellow-500", textColor: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900" },
    down: { label: "System Outage", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" },
  }[status];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor}`}>
      <div className={`w-3 h-3 rounded-full ${config.color} ${status === "degraded" ? "animate-pulse" : ""}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function CronHealth() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<CronLog | null>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const since = getTimeRangeSince(timeRange);

  // Fetch job settings
  const { data: jobSettings } = useQuery({
    queryKey: ["cron-job-settings"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("admin-cron", {
        body: { action: "list" },
      });
      if (res.error) throw res.error;
      return (res.data?.jobs ?? []) as CronJobSetting[];
    },
    staleTime: 60000,
  });

  const registeredJobs = jobSettings ?? [];

  // Fetch logs within time range
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ["cron-health-logs", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_health_logs")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
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
      const res = await supabase.functions.invoke("admin-cron", {
        body: { action: "trigger", jobName },
      });
      if (res.error) throw res.error;
      if (res.data && !res.data.success) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (_data, jobName) => {
      toast({ title: "Job triggered", description: `"${jobName}" dispatched successfully.` });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["cron-health-logs"] }), 3000);
    },
    onError: (error, jobName) => {
      toast({ title: "Trigger failed", description: `"${jobName}": ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setTriggeringJob(null),
  });

  // ─── Derived metrics ────────────────────────────────────────

  const { jobSummaries, systemHealth, kpis } = useMemo(() => {
    const byJob = new Map<string, CronLog[]>();
    for (const log of logs) {
      const arr = byJob.get(log.job_name) || [];
      arr.push(log);
      byJob.set(log.job_name, arr);
    }

    const summaries = registeredJobs.map((job) => {
      const jobLogs = byJob.get(job.job_name) || byJob.get(job.edge_function) || [];
      const lastRun = jobLogs[0] ?? null;
      const successes = jobLogs.filter((l) => l.status === "success").length;
      const successRate = jobLogs.length > 0 ? Math.round((successes / jobLogs.length) * 100) : null;
      const avgDuration = jobLogs.length > 0
        ? Math.round(jobLogs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / jobLogs.length)
        : null;
      const p95Duration = jobLogs.length > 0
        ? jobLogs.map(l => l.duration_ms ?? 0).sort((a, b) => a - b)[Math.floor(jobLogs.length * 0.95)] ?? null
        : null;

      // Detect stale: no run in 2x the expected interval
      const intervalMinutes = job.schedule.startsWith("*/") ? parseInt(job.schedule.split(" ")[0].slice(2)) : 60;
      const lastRunAge = lastRun ? (Date.now() - new Date(lastRun.started_at).getTime()) / 60000 : Infinity;
      const isStale = lastRunAge > intervalMinutes * 2.5;

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
      };
    });

    // System health
    const hasFailingJobs = summaries.some(j => j.lastRun?.status === "error" || j.isStale);
    const hasMultipleFailures = summaries.filter(j => j.lastRun?.status === "error").length > 1;
    const health: "healthy" | "degraded" | "down" = hasMultipleFailures ? "down" : hasFailingJobs ? "degraded" : "healthy";

    // KPIs
    const totalRuns = logs.length;
    const totalSuccesses = logs.filter(l => l.status === "success").length;
    const totalErrors = logs.filter(l => l.status === "error").length;
    const overallSuccessRate = totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : 100;
    const avgLatency = totalRuns > 0
      ? Math.round(logs.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / totalRuns)
      : 0;

    return {
      jobSummaries: summaries,
      systemHealth: health,
      kpis: { totalRuns, totalSuccesses, totalErrors, overallSuccessRate, avgLatency },
    };
  }, [logs, registeredJobs]);

  // Unique job names for filter
  const jobNames = useMemo(() => [...new Set(logs.map((l) => l.job_name))].sort(), [logs]);

  const filteredLogs = useMemo(() => {
    if (jobFilter === "all") return logs;
    return logs.filter((l) => l.job_name === jobFilter);
  }, [logs, jobFilter]);

  // Dispatcher-related metrics
  const dispatcherLogs = useMemo(() => logs.filter(l => l.job_name === "cron-dispatcher"), [logs]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Health</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pipeline monitoring, cron job execution, and error diagnosis
            </p>
          </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cron-health-logs"] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ─── System Health Banner ─── */}
        <SystemHealthBadge status={systemHealth} />

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Uptime
              </div>
              <p className={`text-2xl font-bold ${kpis.overallSuccessRate >= 95 ? "text-green-600" : kpis.overallSuccessRate >= 80 ? "text-yellow-600" : "text-red-600"}`}>
                {kpis.overallSuccessRate}%
              </p>
              <p className="text-xs text-muted-foreground">{kpis.totalSuccesses}/{kpis.totalRuns} runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Activity className="h-3.5 w-3.5" /> Executions
              </div>
              <p className="text-2xl font-bold">{kpis.totalRuns}</p>
              <p className="text-xs text-muted-foreground">in {TIME_RANGES.find(r => r.value === timeRange)?.label.toLowerCase()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Errors
              </div>
              <p className={`text-2xl font-bold ${kpis.totalErrors > 0 ? "text-red-600" : "text-green-600"}`}>{kpis.totalErrors}</p>
              <p className="text-xs text-muted-foreground">{kpis.totalErrors > 0 ? "needs attention" : "clean"}</p>
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
                <Server className="h-3.5 w-3.5" /> Active Jobs
              </div>
              <p className="text-2xl font-bold">{registeredJobs.filter(j => j.enabled).length}</p>
              <p className="text-xs text-muted-foreground">{registeredJobs.length} registered</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Pipeline Architecture ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Pipeline Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">pg_cron</p>
                <p className="text-[10px] text-muted-foreground">Scheduler</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="text-center p-3 border rounded-lg bg-primary/5 border-primary/20 min-w-[120px]">
                <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs font-medium">cron-dispatcher</p>
                <p className="text-[10px] text-muted-foreground">Edge function</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
                <Globe className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Target Fn</p>
                <p className="text-[10px] text-muted-foreground">Per company</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
                <Database className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Supabase</p>
                <p className="text-[10px] text-muted-foreground">Data store</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              pg_cron triggers the dispatcher edge function, which fans out per-company requests using a single auto-injected service key.
            </p>
          </CardContent>
        </Card>

        {/* ─── Tabs: Jobs / Executions ─── */}
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-2">
              <Activity className="h-4 w-4" /> Execution Log
            </TabsTrigger>
          </TabsList>

          {/* ─── Jobs Tab ─── */}
          <TabsContent value="jobs" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Schedule</TableHead>
                          <TableHead>Recent Runs</TableHead>
                          <TableHead>Uptime</TableHead>
                          <TableHead className="text-right">Avg / P95</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobSummaries.map((job) => (
                          <TableRow key={job.job_name} className={job.isStale ? "bg-yellow-500/5" : ""}>
                            <TableCell>
                              <div>
                                <span className="font-medium text-sm">{job.edge_function}</span>
                                <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{job.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-mono">
                                {formatSchedule(job.schedule)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ExecutionDots logs={job.jobLogs} />
                            </TableCell>
                            <TableCell>
                              {job.successRate != null ? (
                                <span className={`text-sm font-medium ${
                                  job.successRate >= 95 ? "text-green-600" :
                                  job.successRate >= 80 ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {job.successRate}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {job.avgDuration != null ? (
                                <span>{formatDuration(job.avgDuration)} / {formatDuration(job.p95Duration)}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {job.isStale ? (
                                <Badge variant="secondary" className="text-yellow-600 bg-yellow-500/10 border-yellow-500/20 border gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Stale
                                </Badge>
                              ) : !job.lastRun ? (
                                <Badge variant="outline" className="text-muted-foreground gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </Badge>
                              ) : job.lastRun.status === "success" ? (
                                <Badge className="bg-green-600/10 text-green-600 border-0 gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Healthy
                                </Badge>
                              ) : job.lastRun.status === "running" ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Running
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={triggeringJob === job.job_name || !job.enabled}
                                onClick={() => triggerMutation.mutate(job.job_name)}
                                title={`Trigger ${job.job_name}`}
                              >
                                {triggeringJob === job.job_name ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Execution Log Tab ─── */}
          <TabsContent value="executions" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Execution Log</CardTitle>
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
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.slice(0, 100).map((log) => {
                          const details = log.details as Record<string, unknown> | null;
                          const hasErrors = log.status === "error" || (details?.totalErrors as number) > 0;
                          const newItems = (details?.totalNew as number) ?? null;
                          const errorCount = (details?.totalErrors as number) ?? 0;
                          const companiesDispatched = (details?.companies_dispatched as number) ?? null;

                          return (
                            <TableRow
                              key={log.id}
                              className={`cursor-pointer hover:bg-accent/50 ${hasErrors ? "bg-red-500/5" : ""}`}
                              onClick={() => setSelectedLog(log)}
                            >
                              <TableCell className="font-mono text-sm">{log.job_name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.status === "success" ? "default" :
                                    log.status === "running" ? "secondary" :
                                    log.status === "partial" ? "outline" :
                                    "destructive"
                                  }
                                  className={`capitalize text-xs ${
                                    log.status === "success" ? "bg-green-600/10 text-green-600 border-0" : ""
                                  }`}
                                >
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(log.started_at), "MMM d, HH:mm:ss")}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDuration(log.duration_ms)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {companiesDispatched != null && (
                                  <span className="mr-2">{companiesDispatched} companies</span>
                                )}
                                {newItems != null && (
                                  <span className="mr-2 text-green-600">+{newItems} new</span>
                                )}
                                {errorCount > 0 && (
                                  <span className="text-red-500">{errorCount} errors</span>
                                )}
                                {log.error_message && (
                                  <span className="text-red-500 truncate max-w-[200px] inline-block align-bottom">
                                    {log.error_message}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredLogs.length > 100 && (
                      <div className="text-center text-xs text-muted-foreground py-2 border-t">
                        Showing 100 of {filteredLogs.length} executions
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Execution Detail Dialog ─── */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-mono text-sm">
                {selectedLog?.job_name}
                <Badge variant={selectedLog?.status === "success" ? "default" : "destructive"} className="capitalize ml-2">
                  {selectedLog?.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p>{format(new Date(selectedLog.started_at), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p>{formatDuration(selectedLog.duration_ms)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p>{selectedLog.completed_at ? format(new Date(selectedLog.completed_at), "HH:mm:ss") : "—"}</p>
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
    </DashboardLayout>
  );
}
