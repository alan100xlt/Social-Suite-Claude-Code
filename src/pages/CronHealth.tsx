import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, CheckCircle2, Clock, Loader2, Timer } from "lucide-react";

// Registered cron jobs — add new entries here as they are scheduled
const REGISTERED_JOBS: { name: string; schedule: string; description: string }[] = [
  { name: "analytics-sync", schedule: "0 * * * *", description: "Syncs GetLate analytics into Supabase snapshots" },
  { name: "rss-poll", schedule: "*/5 * * * *", description: "Polls RSS feeds for new articles every 5 minutes" },
  { name: "getlate-changelog-monitor", schedule: "0 9 * * *", description: "Monitors GetLate API changelog for breaking changes" },
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
  if (cron === "*/15 * * * *") return "Every 15 min";
  if (cron === "0 0 * * *") return "Daily at midnight";
  return cron;
}

export default function CronHealth() {
  const [jobFilter, setJobFilter] = useState<string>("all");

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

  // Derive per-job summary from the logs
  const jobSummaries = useMemo(() => {
    if (!logs) return [];

    const byJob = new Map<string, CronLog[]>();
    for (const log of logs) {
      const arr = byJob.get(log.job_name) || [];
      arr.push(log);
      byJob.set(log.job_name, arr);
    }

    return REGISTERED_JOBS.map((job) => {
      const jobLogs = byJob.get(job.name) || [];
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
  }, [logs]);

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
                      <TableHead>Schedule</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Avg Duration</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobSummaries.map((job) => (
                      <TableRow key={job.name}>
                        <TableCell className="font-medium font-mono text-sm">
                          {job.name}
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
