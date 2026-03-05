import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Database, Globe, Loader2, Play, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// Fallback jobs in case the admin-cron function is unavailable
const FALLBACK_JOBS: CronJobSetting[] = [
  { id: "1", job_name: "analytics-sync-hourly", schedule: "0 * * * *", edge_function: "analytics-sync", description: "Syncs GetLate analytics into Supabase snapshots", enabled: true, job_type: "edge_function", updated_at: "", created_at: "" },
  { id: "2", job_name: "rss-poll-every-5-min", schedule: "*/5 * * * *", edge_function: "rss-poll", description: "Polls RSS feeds for new articles", enabled: true, job_type: "edge_function", updated_at: "", created_at: "" },
  { id: "3", job_name: "getlate-changelog-monitor", schedule: "0 9 * * *", edge_function: "getlate-changelog-monitor", description: "Monitors GetLate API changelog for breaking changes", enabled: true, job_type: "edge_function", updated_at: "", created_at: "" },
];

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

function formatSchedule(cron: string): string {
  if (cron === "Manual / TBD") return cron;
  // Simple human-readable for common patterns
  if (cron === "0 * * * *") return "Every hour";
  if (cron === "*/5 * * * *") return "Every 5 min";
  if (cron === "*/10 * * * *") return "Every 10 min";
  if (cron === "*/15 * * * *") return "Every 15 min";
  if (cron === "0 0 * * *") return "Daily at midnight";
  if (cron === "0 3 * * *") return "Daily at 3 AM";
  return cron;
}

export default function CronHealth() {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch job settings from admin-cron edge function
  const { data: jobSettings } = useQuery({
    queryKey: ["cron-job-settings"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("admin-cron", {
        body: { action: "list" },
      });
      if (res.error) throw res.error;
      return (res.data?.jobs ?? FALLBACK_JOBS) as CronJobSetting[];
    },
    staleTime: 60000,
  });

  const registeredJobs = jobSettings ?? FALLBACK_JOBS;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["cron-health-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_health_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CronLog[];
    },
    refetchInterval: 30000,
  });

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
      toast({ title: "Job triggered", description: `"${jobName}" has been triggered successfully.` });
      // Refetch logs after a short delay to pick up the new run
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["cron-health-logs"] }), 2000);
    },
    onError: (error, jobName) => {
      toast({ title: "Trigger failed", description: `Failed to trigger "${jobName}": ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setTriggeringJob(null),
  });

  // Derive per-job summary from the logs
  const jobSummaries = useMemo(() => {
    if (!logs) return [];

    const byJob = new Map<string, CronLog[]>();
    for (const log of logs) {
      const arr = byJob.get(log.job_name) || [];
      arr.push(log);
      byJob.set(log.job_name, arr);
    }

    return registeredJobs.map((job) => {
      // Match logs by job_name or edge_function name (some logs use the function name)
      const jobLogs = byJob.get(job.job_name) || byJob.get(job.edge_function) || [];
      const lastRun = jobLogs[0] ?? null;
      const recent = jobLogs.slice(0, 20);
      const successes = recent.filter((l) => l.status === "success").length;
      const successRate = recent.length > 0 ? Math.round((successes / recent.length) * 100) : null;
      const avgDuration =
        recent.length > 0
          ? Math.round(
              recent.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / recent.length
            )
          : null;

      return {
        ...job,
        lastRun,
        totalRuns: jobLogs.length,
        successRate,
        avgDuration,
      };
    });
  }, [logs, registeredJobs]);

  // Unique job names from logs (for filter dropdown)
  const jobNames = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l) => l.job_name))].sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (jobFilter === "all") return logs;
    return logs.filter((l) => l.job_name === jobFilter);
  }, [logs, jobFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cron Health</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor cron job executions and failures
          </p>
        </div>

        {/* ─── Registered Cron Jobs Summary ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registered Cron Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Avg Duration</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobSummaries.map((job) => (
                      <TableRow key={job.job_name}>
                        <TableCell className="font-medium font-mono text-sm">
                          {job.job_name}
                        </TableCell>
                        <TableCell>
                          {job.job_type === "sql" ? (
                            <Badge variant="outline" className="text-xs gap-1 whitespace-nowrap">
                              <Database className="w-3 h-3" />
                              SQL
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                              <Globe className="w-3 h-3" />
                              Edge Fn
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatSchedule(job.schedule)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs">
                          {job.description}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.lastRun ? (
                            <span title={format(new Date(job.lastRun.started_at), "MMM d, yyyy HH:mm:ss")}>
                              {formatDistanceToNow(new Date(job.lastRun.started_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {job.avgDuration != null ? (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {job.avgDuration < 1000
                                ? `${job.avgDuration}ms`
                                : `${(job.avgDuration / 1000).toFixed(1)}s`}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.successRate != null ? (
                            <span className={job.successRate >= 90 ? "text-green-600" : job.successRate >= 50 ? "text-yellow-600" : "text-red-600"}>
                              {job.successRate}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {!job.lastRun ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          ) : job.lastRun.status === "success" ? (
                            <Badge variant="default" className="bg-green-600/10 text-green-600 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Healthy
                            </Badge>
                          ) : job.lastRun.status === "running" ? (
                            <Badge variant="secondary">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Running
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            disabled={triggeringJob === job.job_name || !job.enabled}
                            onClick={() => triggerMutation.mutate(job.job_name)}
                            title={!job.enabled ? "Job is disabled" : `Trigger ${job.job_name}`}
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

        {/* ─── Recent Executions ─── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Executions</CardTitle>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Filter by job..." />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All jobs</SelectItem>
                {jobNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
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
                <p className="text-sm">
                  {jobFilter === "all"
                    ? "No cron executions logged yet"
                    : `No executions found for "${jobFilter}"`}
                </p>
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
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {log.job_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "success"
                                ? "default"
                                : log.status === "running"
                                ? "secondary"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {log.status === "error" && (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(log.started_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {log.duration_ms != null
                            ? log.duration_ms < 1000
                              ? `${log.duration_ms}ms`
                              : `${(log.duration_ms / 1000).toFixed(1)}s`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-destructive max-w-xs truncate">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
